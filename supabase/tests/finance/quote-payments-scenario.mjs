// Escenario SQL del calendario de pagos de cotizaciones sobre PostgreSQL real (PGlite) con todas las migraciones.
// Uso: node quote-payments-scenario.mjs
import { createDb } from "./harness.mjs";
const db = await createDb();
const q = async (sql, p) => (await db.query(sql, p)).rows;
const one = async (sql, p) => (await q(sql, p))[0];
const ok = (c, m, x = "") => { console.log((c ? "✓ " : "✗ ") + m + (x ? "  → " + x : "")); if (!c) process.exitCode = 1; };
const fails = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
const ids = { client: "11111111-1111-4111-8111-111111111111", other: "11111111-1111-4111-8111-222222222222", exec: "33333333-3333-4333-8333-333333333333", execB: "33333333-3333-4333-8333-444444444444", dev: "44444444-4444-4444-8444-444444444444", portal: "55555555-5555-4555-8555-555555555555", contact: "66666666-6666-4666-8666-666666666666", actor: "77777777-7777-4777-8777-777777777777" };
const today = (await one("select public.quote_payment_today()::text d")).d;
const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

await db.exec(`insert into clients(id,legal_name,rut) values('${ids.client}','Cliente Uno SpA','76.111.111-1'),('${ids.other}','Cliente Dos SpA','76.222.222-2');
  insert into auth.users(id,email) values('${ids.portal}','portal@uno.cl');
  insert into client_contacts(id,client_id,name,email) values('${ids.contact}','${ids.client}','Contacto Uno','portal@uno.cl');
  insert into client_portal_settings(client_id,enabled,invoices_visible) values('${ids.client}',true,true);
  insert into client_portal_users(client_id,contact_id,auth_user_id,status) values('${ids.client}','${ids.contact}','${ids.portal}','ACTIVE');`);
const quote = async (client, owner) => (await one("insert into quotes(company_name,client_id,owner_id,status,total_amount) values('Empresa',$1,$2,'ACCEPTED',119000) returning id", [client, owner])).id;
const qMonthly = await quote(ids.client, ids.exec), qOther = await quote(ids.other, ids.execB), qOpen = await quote(ids.client, ids.exec);

// Plan mensual de 3 cuotas con día 31: vencimientos ajustados al último día de cada mes
const plan = (await one("insert into quote_payment_plans(quote_id,client_id,frequency,amount,start_date,payment_day,total_installments) values($1,$2,'MONTHLY',119000,'2026-01-01',31,3) returning id", [qMonthly, ids.client])).id;
const created = (await one("select public.quote_payment_materialize($1,'2026-01-01') n", [plan])).n;
const dues = (await q("select due_date::text d from quote_payment_installments where plan_id=$1 order by sequence", [plan])).map((r) => r.d).join(",");
ok(created === 3 && dues === "2026-01-31,2026-02-28,2026-03-31", "plan mensual genera el calendario completo (día 31 ajustado a fin de mes)", dues);
ok((await one("select public.quote_payment_materialize($1,'2026-12-31') n", [plan])).n === 0, "materialización idempotente");

// Plan indefinido: genera hasta el horizonte
const planOpen = (await one("insert into quote_payment_plans(quote_id,client_id,frequency,amount,start_date,payment_day,activation_days_before) values($1,$2,'MONTHLY',50000,$3,$4,5) returning id", [qOpen, ids.client, today.slice(0, 8) + "01", Number(today.slice(8, 10))])).id;
await one("select public.quote_payment_materialize($1,$2::date)", [planOpen, addDays(today, 62)]);
const openCount = (await one("select count(*)::int n from quote_payment_installments where plan_id=$1", [planOpen])).n;
ok(openCount >= 2 && openCount <= 4, "plan indefinido genera cuotas hasta el horizonte (≈2 meses)", `${openCount} cuotas`);
const current = await one("select id,effective_status from quote_payment_installments_effective where plan_id=$1 and period_key=$2", [planOpen, today.slice(0, 7)]);
ok(current.effective_status === "PAYMENT_OPEN", "cuota del mes con vencimiento hoy: opción de pago habilitada", current.effective_status);
const future = await one("select id,effective_status from quote_payment_installments_effective where plan_id=$1 and due_date>$2::date+5 order by due_date limit 1", [planOpen, today]);
ok(future.effective_status === "UPCOMING", "cuota futura fuera de la ventana: aún no habilitada");
const past = await one("select id,effective_status from quote_payment_installments_effective where plan_id=$1 and sequence=1", [plan]);
ok(past.effective_status === "OVERDUE", "cuota vencida sin pago sigue habilitada como vencida");

// Pago: exige factura SII y ventana abierta
const pay = (id, folio, extra = "") => q(`update quote_payment_installments set status='PAID',paid_at=$2::date,paid_amount=amount,payment_method='TRANSFER',sii_document_type=33,sii_folio=$3::bigint,invoice_storage_path='clients/${ids.client}/quotes/x/'||$3::text||'.pdf',invoice_sha256=repeat('a',64),invoice_mime='application/pdf',marked_paid_by='${ids.actor}',marked_paid_at=now(),client_visible=true ${extra} where id=$1`, [id, today, folio]);
ok(/violates check constraint/.test(await fails(() => q("update quote_payment_installments set status='PAID',paid_at=$2::date,paid_amount=amount,marked_paid_by=$3 where id=$1", [current.id, today, ids.actor]))), "no se marca pagada sin factura SII adjunta");
ok(/QUOTE_PAYMENT_NOT_OPEN/.test(await fails(() => pay(future.id, 9001))), "no se paga antes de que se habilite la opción de pago");
await pay(current.id, 1001);
ok((await one("select effective_status from quote_payment_installments_effective where id=$1", [current.id])).effective_status === "PAID", "cuota habilitada pagada con factura");
await pay(past.id, 1002);
const second = (await one("select id from quote_payment_installments where plan_id=$1 and sequence=2", [plan])).id;
ok(/duplicate key/.test(await fails(() => pay(second, 1001))), "un mismo folio SII no respalda dos cuotas");
ok(/QUOTE_PAYMENT_IMMUTABLE/.test(await fails(() => q("update quote_payment_installments set paid_amount=1 where id=$1", [current.id]))), "cuota pagada inmutable");
ok(/QUOTE_PAYMENT_IMMUTABLE/.test(await fails(() => q("delete from quote_payment_installments where id=$1", [current.id]))), "las cuotas no se eliminan");
ok(/QUOTE_PAYMENT_IMMUTABLE/.test(await fails(() => q("update quote_payment_plans set payment_day=10 where id=$1", [plan]))), "con cuotas pagadas no cambia el día de pago del plan");
ok(/QUOTE_PAYMENT_IMMUTABLE/.test(await fails(() => q("delete from quote_payment_plans where id=$1", [plan]))), "los planes no se eliminan");

// Reprogramación atómica de cuotas pendientes (plan sin pagos)
const qResched = await quote(ids.client, ids.exec);
const pr = (await one("insert into quote_payment_plans(quote_id,client_id,frequency,amount,start_date,payment_day,total_installments) values($1,$2,'MONTHLY',1000,'2027-01-01',10,4) returning id", [qResched, ids.client])).id;
await one("select public.quote_payment_materialize($1,'2027-01-01')", [pr]);
await q("update quote_payment_plans set start_date='2027-02-01',payment_day=15,amount=2000,total_installments=3 where id=$1", [pr]);
await one("select public.quote_payment_reschedule($1)", [pr]);
const rs = await q("select sequence,status,due_date::text d,amount::int a,period_key from quote_payment_installments where plan_id=$1 order by sequence", [pr]);
ok(rs.slice(0, 3).map((r) => `${r.d}/${r.a}`).join(",") === "2027-02-15/2000,2027-03-15/2000,2027-04-15/2000" && rs[3].status === "CANCELLED", "editar el plan reprograma cuotas pendientes y anula las que quedan fuera", rs.map((r) => `${r.sequence}:${r.status}:${r.d}`).join(" "));
await q("update quote_payment_plans set status='CANCELLED',cancel_reason='Cliente desistió' where id=$1", [pr]);
await one("select public.quote_payment_reschedule($1)", [pr]);
ok((await one("select count(*)::int n from quote_payment_installments where plan_id=$1 and status='SCHEDULED'", [pr])).n === 0, "anular el plan anula sus cuotas pendientes con motivo");
ok(/QUOTE_PAYMENT_IMMUTABLE/.test(await fails(() => q("update quote_payment_plans set status='ACTIVE' where id=$1", [pr]))), "un plan anulado no se reactiva");

// RLS y portal
async function as(role, sub, sql, p) { await db.exec("set role authenticated"); await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub, app_metadata: { role } })]); try { return (await db.query(sql, p)).rows; } finally { await db.exec("reset role"); } }
const otherPlan = (await one("insert into quote_payment_plans(quote_id,client_id,frequency,amount,start_date,payment_day,total_installments) values($1,$2,'ONE_TIME',10000,$3,1,1) returning id", [qOther, ids.other, today])).id;
await one("select public.quote_payment_materialize($1,$2::date)", [otherPlan, today]);
const finRows = await as("FINANZAS", ids.actor, "select id from quote_payment_installments"), allRows = (await one("select count(*)::int n from quote_payment_installments")).n;
ok(finRows.length === allRows, "Finanzas ve todos los calendarios", `${finRows.length}/${allRows}`);
const execRows = await as("EJECUTIVA_VENTAS", ids.exec, "select distinct quote_id from quote_payment_plans");
ok(execRows.length === 3 && execRows.every((r) => [qMonthly, qOpen, qResched].includes(r.quote_id)), "Ejecutiva sólo ve planes de sus cotizaciones");
ok((await as("PROGRAMADOR", ids.dev, "select id from quote_payment_installments")).length === 0, "Desarrollo sin acceso");
ok(/permission denied/.test(await fails(() => as("FINANZAS", ids.actor, "select public.quote_payment_materialize($1,current_date)", [plan]))), "la generación de cuotas sólo la ejecuta el servidor");
ok(/permission denied/.test(await fails(() => as("FINANZAS", ids.actor, "select public.quote_payment_reschedule($1)", [plan]))), "la reprogramación sólo la ejecuta el servidor");
let writeDenied; try { await as("FINANZAS", ids.actor, "update quote_payment_installments set notes='x'"); writeDenied = (await one("select count(*)::int n from quote_payment_installments where notes='x'")).n === 0; } catch { writeDenied = true; } ok(writeDenied, "escrituras directas denegadas (sólo API)");
const portalRows = await as("PORTAL_CLIENT", ids.portal, "select id,status,invoice_storage_path from portal_quote_payments");
ok(portalRows.length > 0 && portalRows.every((r) => r.status !== "CANCELLED") && !portalRows.some((r) => r.id === (null)), "portal: el cliente ve su calendario", `${portalRows.length} cuotas`);
const portalOther = await as("PORTAL_CLIENT", ids.portal, "select id from portal_quote_payments where quote_id=$1", [qOther]);
ok(portalOther.length === 0, "portal: no ve cuotas de otro cliente");
const paidPath = (await one("select invoice_storage_path p from quote_payment_installments where id=$1", [current.id])).p;
ok(portalRows.find((r) => r.id === current.id)?.invoice_storage_path === paidPath && portalRows.filter((r) => r.status !== "PAID").every((r) => r.invoice_storage_path === null), "portal: ruta de factura sólo en cuotas pagadas");
await db.exec("grant select on storage.objects to authenticated"); // como en Supabase: el acceso lo decide la RLS
await db.exec(`insert into storage.objects(bucket_id,name) values('quote-invoices','${paidPath}'),('quote-invoices','clients/${ids.other}/quotes/x/9.pdf')`);
const objs = await as("PORTAL_CLIENT", ids.portal, "select name from storage.objects where bucket_id='quote-invoices'");
ok(objs.length === 1 && objs[0].name === paidPath, "Storage: el portal sólo puede leer sus facturas pagadas", JSON.stringify(objs.map((o) => o.name)));
ok((await as("FINANZAS", ids.actor, "select name from storage.objects where bucket_id='quote-invoices'")).length === 0, "Storage: usuarios internos descargan vía API (sin acceso directo)");
ok((await one("select public from storage.buckets where id='quote-invoices'")).public === false, "bucket quote-invoices privado");
await db.close();

import { createDb } from "./harness.mjs";
const db = await createDb();
const q = async (sql, p) => (await db.query(sql, p)).rows;
const one = async (sql, p) => (await q(sql, p))[0];
const ok = (c, m, x = "") => { console.log((c ? "✓ " : "✗ ") + m + (x ? "  → " + x : "")); if (!c) process.exitCode = 1; };
const fails = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
const acc = async (code) => (await one("select id from chart_of_accounts where code=$1", [code])).id;
const ids = { client: "11111111-1111-4111-8111-111111111111", clientB: "11111111-1111-4111-8111-222222222222", exec: "33333333-3333-4333-8333-333333333333", dev: "44444444-4444-4444-8444-444444444444" };
await db.exec(`insert into clients(id,legal_name,rut,account_executive_id) values('${ids.client}','Cliente Uno SpA','76.111.111-1','${ids.exec}'),('${ids.clientB}','Cliente Dos SpA','76.222.222-2',null)`);
const bank = await acc("1.1.02.01"), ar = await acc("1.1.03"), rev = await acc("4.1.01"), vat = await acc("2.1.02"), header = await acc("1.1.02");
const entry = async (lines, date = "2026-10-01") => (await one("select public.finance_create_journal_entry($1::jsonb,$2::jsonb) id", [JSON.stringify({ entryDate: date, description: "Prueba" }), JSON.stringify(lines)])).id;
const post = (id) => one("select public.finance_post_journal_entry($1,null) r", [id]);
// Partida doble
const unbalanced = await entry([{ accountId: ar, debit: 1190 }, { accountId: rev, credit: 1000 }]);
ok(/FINANCE_UNBALANCED/.test(await fails(() => post(unbalanced))), "asiento descuadrado NO se contabiliza");
const single = await entry([{ accountId: ar, debit: 100 }]);
ok(/al menos dos líneas/.test(await fails(() => post(single))), "asiento de una línea rechazado");
const headerEntry = await entry([{ accountId: header, debit: 100 }, { accountId: rev, credit: 100 }]);
ok(/no imputables/.test(await fails(() => post(headerEntry))), "cuenta agrupadora no imputable rechazada");
const good = await entry([{ accountId: ar, debit: 1190, clientId: ids.client }, { accountId: rev, credit: 1000 }, { accountId: vat, credit: 190 }]);
const posted = (await post(good)).r;
ok(posted.status === "POSTED" && /^AST-2026-\d{6}$/.test(posted.entry_number) && Number(posted.total_debit) === 1190, "asiento cuadrado contabilizado con número", posted.entry_number);
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("update journal_entries set description='x' where id=$1", [good]))), "asiento contabilizado no se edita");
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("update journal_entry_lines set debit=1 where journal_entry_id=$1", [good]))), "líneas contabilizadas no se editan");
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("delete from journal_entries where id=$1", [good]))), "asiento contabilizado no se borra");
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("insert into journal_entry_lines(journal_entry_id,line_number,account_id,debit) values($1,9,$2,5)", [good, ar]))), "no se agregan líneas a un asiento contabilizado");
ok(/FINANCE_UNBALANCED/.test(await fails(() => q("insert into journal_entries(entry_date,description,status,period_id,entry_number,total_debit,total_credit) values('2026-10-02','Directo','POSTED',public.finance_ensure_period('2026-10-02'),'X',1,1)"))), "inserción directa POSTED sin líneas rechazada por la base");
const rv = (await one("select public.finance_reverse_journal_entry($1,null,'Error de cliente','2026-10-05') id", [good])).id;
const orig = await one("select status,reversed_by_id from journal_entries where id=$1", [good]);
const rev2 = await one("select status,total_debit from journal_entries where id=$1", [rv]);
ok(orig.status === "REVERSED" && orig.reversed_by_id === rv && rev2.status === "POSTED" && Number(rev2.total_debit) === 1190, "reversa crea asiento inverso contabilizado y marca el original");
ok(/sólo se revierten/.test(await fails(() => one("select public.finance_reverse_journal_entry($1,null,'otra','2026-10-05')", [good]))), "no se revierte dos veces");
const tb = await q("select a.code, b.opening, b.debit, b.credit from public.finance_account_balances('2026-10-01','2026-10-31') b join chart_of_accounts a on a.id=b.account_id order by a.code");
ok(tb.reduce((s, r) => s + Number(r.debit), 0) === tb.reduce((s, r) => s + Number(r.credit), 0), "balance de comprobación cuadra (Debe = Haber)", JSON.stringify(tb.map((r) => [r.code, Number(r.debit), Number(r.credit)])));
// Período cerrado
await q("update accounting_periods set status='CLOSED' where period_key='2026-10'");
const late = await entry([{ accountId: ar, debit: 10 }, { accountId: rev, credit: 10 }], "2026-10-20");
ok(/FINANCE_PERIOD_CLOSED/.test(await fails(() => post(late))), "no se contabiliza en período cerrado");
await q("update accounting_periods set status='OPEN' where period_key='2026-10'");
await q("delete from journal_entries where id=any($1)", [[late, unbalanced, single, headerEntry]]);
ok(true, "borradores descartables");
// Facturas, pagos y aplicaciones
const inv = await one("insert into invoices(client_id,net_amount,tax_amount,total_amount,status,issue_date,due_date) values($1,840336.13,159663.87,1000000,'ISSUED','2026-10-01','2026-10-31') returning id,invoice_number,balance_due", [ids.client]);
ok(/^INV-2026-\d{6}$/.test(inv.invoice_number) && Number(inv.balance_due) === 1000000, "factura con número interno y saldo", inv.invoice_number);
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("update invoices set total_amount=1, net_amount=1, tax_amount=0 where id=$1", [inv.id]))), "factura emitida no cambia montos");
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("delete from invoices where id=$1", [inv.id]))), "factura no se borra");
const pay = await one("insert into payments(client_id,provider,method,gross_amount,received_at,status) values($1,'BANK_TRANSFER','TRANSFER',1100000,now(),'PENDING_VERIFICATION') returning id", [ids.client]);
ok(/sólo se aplican pagos confirmados/.test(await fails(() => one("select public.finance_allocate_payment($1,$2,400000,null)", [pay.id, inv.id]))), "pago sin verificar no se aplica");
await q("update payments set status='CONFIRMED' where id=$1", [pay.id]);
const a1 = (await one("select public.finance_allocate_payment($1,$2,400000,null) id", [pay.id, inv.id])).id;
let i = await one("select status,amount_paid,balance_due from invoices where id=$1", [inv.id]);
ok(i.status === "PARTIALLY_PAID" && Number(i.balance_due) === 600000, "pago parcial → PARTIALLY_PAID, saldo 600.000");
ok(/excede el saldo de la factura/.test(await fails(() => one("select public.finance_allocate_payment($1,$2,700000,null)", [pay.id, inv.id]))), "no se aplica más que el saldo");
await one("select public.finance_allocate_payment($1,$2,600000,null)", [pay.id, inv.id]);
i = await one("select status,balance_due from invoices where id=$1", [inv.id]);
const p = await one("select allocated_amount,unapplied_amount from payments where id=$1", [pay.id]);
ok(i.status === "PAID" && Number(p.unapplied_amount) === 100000, "factura pagada; sobrepago queda como saldo a favor (100.000)");
await one("select public.finance_reverse_allocation($1,null,'Aplicación equivocada')", [a1]);
i = await one("select status,balance_due from invoices where id=$1", [inv.id]);
ok(i.status === "PARTIALLY_PAID" && Number(i.balance_due) === 400000, "reversa de aplicación restituye saldo");
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("delete from payment_allocations where id=$1", [a1]))), "aplicaciones no se borran");
ok(/FINANCE_IMMUTABLE/.test(await fails(() => q("update payments set gross_amount=1 where id=$1", [pay.id]))), "pago confirmado no cambia monto");
const invB = await one("insert into invoices(client_id,net_amount,tax_amount,total_amount,status,issue_date,due_date) values($1,100,19,119,'ISSUED','2026-10-01','2026-10-31') returning id", [ids.clientB]);
ok(/clientes distintos/.test(await fails(() => one("select public.finance_allocate_payment($1,$2,10,null)", [pay.id, invB.id]))), "no se aplica pago de otro cliente");
// Folios
const caf = await one("insert into tax_folio_authorizations(document_type_code,environment,range_from,range_to,authorized_at,caf_sha256,caf_storage_path) values(33,'CERTIFICATION',1,3,'2026-09-30','abc','x') returning id");
await q("insert into tax_folios(authorization_id,document_type_code,environment,folio) select $1,33,'CERTIFICATION',g from generate_series(1,3) g", [caf.id]);
const td = [];
for (let n = 0; n < 4; n++) { const invN = await one("insert into invoices(client_id,net_amount,tax_amount,total_amount,status) values($1,100,19,119,'ISSUING') returning id", [ids.client]); td.push((await one("insert into tax_documents(invoice_id,document_type_code,provider,environment) values($1,33,'SII_DIRECT','CERTIFICATION') returning id", [invN.id])).id); }
const folios = [];
for (const t of td.slice(0, 3)) folios.push(Number((await one("select public.finance_reserve_folio(33,'CERTIFICATION',$1) f", [t])).f));
ok(folios.join() === "1,2,3", "folios asignados correlativos sin repetición", folios.join());
ok(/FINANCE_NO_FOLIOS/.test(await fails(() => one("select public.finance_reserve_folio(33,'CERTIFICATION',$1)", [td[3]]))), "sin folios disponibles → error explícito");
ok(Number((await one("select public.finance_reserve_folio(33,'CERTIFICATION',$1) f", [td[0]])).f) === 1, "reserva idempotente por documento");
await q("update tax_folios set status='USED' where folio=1");
ok(/nunca se reutiliza/.test(await fails(() => q("update tax_folios set status='AVAILABLE' where folio=1"))), "folio usado nunca vuelve a disponible");
// Reglas versionadas e IVA
const rules = await one("select count(*)::int n, count(*) filter(where active)::int active from accounting_rules");
ok(rules.n >= 13 && rules.active === 0, "reglas propuestas nacen inactivas (sin asientos automáticos sin revisión)", `${rules.n} reglas`);
ok(/FINANCE_TAX_OVERLAP/.test(await fails(() => q("insert into tax_rule_versions(tax_rule_id,rate,effective_from,source_reference) select id,0.2,'2020-01-01','x' from tax_rules where code='IVA'"))), "vigencias de IVA superpuestas rechazadas");
// Auditoría append-only
await q("insert into finance_audit_events(action,entity_type,summary) values('TEST','X','prueba')");
ok(/sólo de inserción/.test(await fails(() => q("update finance_audit_events set summary='x'"))), "auditoría financiera append-only");
// RLS
async function as(role, sub, sql, p) { await db.exec("set role authenticated"); await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub, app_metadata: { role } })]); try { return (await db.query(sql, p)).rows; } finally { await db.exec("reset role"); } }
ok((await as("GERENTE_GENERAL", ids.dev, "select id from journal_entries")).length > 0, "Gerencia ve el libro diario");
ok((await as("CONTADOR", ids.dev, "select id from journal_entries")).length > 0, "Contador ve el libro diario");
ok((await as("PROGRAMADOR", ids.dev, "select id from invoices")).length === 0 && (await as("PROGRAMADOR", ids.dev, "select id from journal_entries")).length === 0, "Desarrollo sin acceso financiero");
ok((await as("JEFE_VENTAS", ids.dev, "select id from journal_entries")).length === 0 && (await as("JEFE_VENTAS", ids.dev, "select id from invoices")).length > 0, "Jefe de ventas ve facturación pero no el libro");
const execInv = await as("EJECUTIVA_VENTAS", ids.exec, "select distinct client_id from invoices");
ok(execInv.length === 1 && execInv[0].client_id === ids.client, "Ejecutiva sólo ve facturas de sus clientes");
ok((await as("", ids.dev, "select id from payments")).length === 0, "usuario sin rol no ve pagos");
let denied; try { await as("FINANZAS", ids.dev, "update invoices set notes='x'"); denied = (await one("select count(*)::int n from invoices where notes='x'")).n === 0; } catch { denied = true; } ok(denied, "escrituras directas denegadas (sólo API)");
// Outbox transaccional, reintento de DTE rechazado y cierre con snapshot inmutable
await q("insert into finance_events(aggregate_type,aggregate_id,event_type,title) values('INVOICE',gen_random_uuid(),'TEST_EVENT','Prueba')");
ok((await one("select count(*)::int n from business_event_outbox where event_type='TEST_EVENT' and aggregate_type='FINANCE_INVOICE'")).n === 1, "evento financiero proyectado al outbox en la misma transacción");
const t0 = await one("select invoice_id from tax_documents where id=$1", [td[0]]);
ok(/duplicate|unique/i.test(await fails(() => q("insert into tax_documents(invoice_id,document_type_code,provider,environment) values($1,33,'SII_DIRECT','CERTIFICATION')", [t0.invoice_id]))), "un solo DTE vigente por factura");
await q("update tax_documents set status='REJECTED' where id=$1", [td[0]]);
ok(!(await fails(() => q("insert into tax_documents(invoice_id,document_type_code,provider,environment) values($1,33,'SII_DIRECT','CERTIFICATION')", [t0.invoice_id]))), "DTE rechazado permite nuevo intento (con otro folio)");
const per = (await one("select public.finance_ensure_period('2026-11-15') id")).id;
await entry([{ accountId: bank, debit: 10 }, { accountId: rev, credit: 10 }], "2026-11-15");
ok(/FINANCE_CLOSE_BLOCKED/.test(await fails(() => one("select public.finance_close_period($1,null,'{}'::jsonb)", [per]))), "cierre bloqueado con asientos sin contabilizar");
await q("delete from journal_entries where period_id=$1 and status='DRAFT'", [per]);
const snap = (await one("select public.finance_close_period($1,null,$2::jsonb) r", [per, JSON.stringify({ trialBalance: {}, incomeStatement: {}, balanceSheet: {}, sha256: "abc" })])).r;
ok(snap.version === 1 && (await one("select status from accounting_periods where id=$1", [per])).status === "CLOSED", "cierre atómico con snapshot v1");
ok(/inmutables/.test(await fails(() => q("update period_snapshots set sha256='x'"))), "snapshot de cierre inmutable");
await db.close();

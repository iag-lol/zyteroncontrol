/* global process, console */
// Escenario SQL: lease SKIP LOCKED, deduplicación, numeración, mantenimiento, rollups, stats y RLS por rol.
import { createDb } from "./harness.mjs";
const db = await createDb();
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const ok = (cond, msg) => { if (!cond) { console.log("✗", msg); process.exitCode = 1; } else console.log("✓", msg); };
const ids = { client: "11111111-1111-4111-8111-111111111111", clientB: "11111111-1111-4111-8111-222222222222", dev: "44444444-4444-4444-8444-444444444444", other: "55555555-5555-4555-8555-555555555555", lead: "66666666-6666-4666-8666-666666666666" };
await db.exec(`insert into clients(id,legal_name,rut) values('${ids.client}','Zyteron SpA','76.000.000-0'),('${ids.clientB}','Otro SpA','77.000.000-0')`);
async function project(name, client) {
  const wo = await one(`insert into work_orders(title,scope,client_id,status) values($1,'scope',$2,'DRAFT') returning id`, [name, client]);
  return (await one(`insert into projects(name,scope,work_order_id,client_id,priority,project_lead_id) values($1,'scope',$2,$3,'HIGH',$4) returning id`, [name, wo.id, client, ids.lead])).id;
}
const pA = await project("Zyteron Web", ids.client), pB = await project("Proyecto B", ids.clientB);
await db.exec(`insert into project_members(project_id,user_id) values('${pA}','${ids.dev}')`);
const eA = (await one(`insert into project_endpoints(project_id,name,url,environment,monitoring_enabled,responsible_user_id) values($1,'Web principal','https://www.zyteron.cl','PRODUCTION',true,$2) returning id,client_id`, [pA, ids.dev]));
ok(eA.client_id === ids.client, "endpoint deriva client_id del proyecto");
const eB = (await one(`insert into project_endpoints(project_id,name,url,environment,monitoring_enabled) values($1,'API B','https://example.org','STAGING',true) returning id`, [pB]));
const mA = (await one(`insert into monitors(endpoint_id,monitor_type,interval_seconds,failure_threshold,recovery_threshold) values($1,'HTTPS',60,3,2) returning id,project_id,client_id`, [eA.id]));
ok(mA.project_id === pA && mA.client_id === ids.client, "monitor deriva proyecto y cliente");
const mB = (await one(`insert into monitors(endpoint_id,monitor_type) values($1,'HTTPS') returning id`, [eB.id]));
let bad; try { await q(`insert into monitors(endpoint_id,monitor_type,enabled) values($1,'TCP',true)`, [eB.id]); } catch (e) { bad = e.message; } ok(bad, "tipo TCP no puede activarse sin ejecutor real");
try { bad = null; await q(`insert into monitors(endpoint_id,monitor_type,interval_seconds) values($1,'HTTP',10)`, [eA.id]); } catch (e) { bad = e.message; } ok(bad, "intervalo de 10 s rechazado por backend");

const claimed = (await one(`select public.monitoring_claim_due_monitors('w1',10,120) c`)).c;
ok(claimed.length === 2 && claimed.every((c) => c.leaseOwner === "w1"), "worker reclama monitores vencidos con lease");
const again = (await one(`select public.monitoring_claim_due_monitors('w2',10,120) c`)).c;
ok(again.length === 0, "segundo worker no reclama monitores con lease vigente");
const cA = claimed.find((c) => c.id === mA.id);
ok(cA.endpoint.url === "https://www.zyteron.cl" && cA.project.clientName === "Zyteron SpA", "payload incluye endpoint y proyecto");

let version = cA.stateVersion;
async function apply(payload) { return (await one(`select public.monitoring_apply_check($1::jsonb) r`, [JSON.stringify(payload)])).r; }
const now = new Date().toISOString();
const base = (over) => ({ monitorId: mA.id, workerId: "w1", expectedVersion: version, check: { checkedAt: now, success: false, statusCode: 500, latencyMs: 120, errorType: "HTTP_STATUS", triggerType: "SCHEDULED", source: "w1" }, state: { status: "OFFLINE", statusReason: "x", consecutiveFailures: 3, consecutiveSuccesses: 0, failureStreakStartedAt: now, nextCheckAt: now }, incidentEvents: [], monitoringEvents: [], outbox: [], ...over });
let lost; try { await apply(base({ workerId: "intruso" })); } catch (e) { lost = e.message; } ok(/LEASE_LOST/.test(lost), "aplicar check sin lease es rechazado");
const created = await apply(base({ incident: { action: "CREATE", draft: { title: "Web principal fuera de servicio", severity: "HIGH", failureType: "HTTP_STATUS", detectedAt: now, confirmedAt: now, assignedTo: ids.dev, postmortemRequired: true } },
  incidentEvents: [{ eventType: "DETECTED", actorType: "SYSTEM" }, { eventType: "CONFIRMED", actorType: "SYSTEM" }],
  monitoringEvents: [{ eventType: "INCIDENT_CONFIRMED", tone: "CRITICAL", title: "Incidente {incidentNumber} confirmado.", requiresIncident: true }],
  outbox: [{ aggregateType: "INCIDENT", eventType: "INCIDENT_CONFIRMED", requiresIncident: true }] }));
ok(created.incidentApplied && /^INC-\d{4}-\d{6}$/.test(created.incidentNumber), "incidente creado con número INC-AAAA-000001: " + created.incidentNumber);
version = created.stateVersion;
const ev = await q(`select title from monitoring_events where incident_id=$1`, [created.incidentId]);
ok(ev[0]?.title === `Incidente ${created.incidentNumber} confirmado.`, "evento de monitoreo con número real");
ok((await q(`select 1 from client_events where event_type='MONITORING_INCIDENT_CONFIRMED'`)).length === 1, "Client Activity recibe proyección");
ok((await q(`select 1 from operations_events where aggregate_type='MONITORING'`)).length === 1, "Project Activity recibe proyección");
ok((await q(`select 1 from business_event_outbox where event_type='INCIDENT_CONFIRMED'`)).length === 1, "outbox INCIDENT_CONFIRMED");
await q(`update monitors set lease_owner='w1' where id=$1`, [mA.id]);
const dup = await apply(base({ incident: { action: "CREATE", draft: { title: "dup", severity: "HIGH", detectedAt: now, confirmedAt: now } }, incidentEvents: [{ eventType: "CONFIRMED" }], monitoringEvents: [{ eventType: "INCIDENT_CONFIRMED", title: "dup", requiresIncident: true }] }));
ok(!dup.incidentApplied && dup.incidentId === created.incidentId, "no se duplica incidente activo del mismo monitor");
ok((await q(`select count(*)::int n from incidents`))[0].n === 1, "existe un único incidente");
ok((await q(`select count(*)::int n from monitoring_events where title='dup'`))[0].n === 0, "eventos dependientes del incidente no se duplican");
version = dup.stateVersion;

const mut = (await one(`select public.monitoring_mutate_incident($1,'CONFIRMED',$2::jsonb,$3::jsonb,'[]','[]') r`, [created.incidentId, JSON.stringify({ status: "ACKNOWLEDGED", acknowledged_at: now, acknowledged_by: ids.dev }), JSON.stringify([{ eventType: "ACKNOWLEDGED", actorId: ids.dev, actorType: "USER" }])])).r;
ok(mut?.status === "ACKNOWLEDGED", "acknowledge transaccional");
const stale = (await one(`select public.monitoring_mutate_incident($1,'CONFIRMED',$2::jsonb,'[]','[]','[]') r`, [created.incidentId, JSON.stringify({ status: "RESOLVED" })])).r;
ok(stale === null, "mutación con estado esperado obsoleto se rechaza");

await q(`update monitors set lease_owner='w1' where id=$1`, [mA.id]);
const recovered = await apply(base({ check: { checkedAt: now, success: true, statusCode: 200, latencyMs: 90 }, state: { status: "ONLINE", statusReason: "ok", consecutiveFailures: 0, consecutiveSuccesses: 2, failureStreakStartedAt: null, nextCheckAt: now },
  incident: { action: "RECOVER", id: created.incidentId, expectedStatuses: ["ACKNOWLEDGED"], patch: { status: "MONITORING", recovered_at: now, downtime_seconds: 420, current_outage_started_at: null } }, incidentEvents: [{ eventType: "RECOVERY_DETECTED" }] }));
ok(recovered.incidentApplied, "recuperación aplicada");
const inc = await one(`select status,downtime_seconds,assigned_to from incidents where id=$1`, [created.incidentId]);
ok(inc.status === "MONITORING" && inc.downtime_seconds === 420 && inc.assigned_to === ids.dev, "incidente en MONITORING con downtime y autoasignación");
ok((await q(`select count(*)::int n from monitor_checks`))[0].n === 3, "tres checks persistidos");

// Mantenimiento
await q(`insert into maintenance_windows(project_id,title,starts_at,ends_at) values($1,'Migración',now()-interval '1 minute',now()+interval '1 hour')`, [pA]);
const tr = (await one(`select public.monitoring_run_maintenance_transitions() r`)).r;
ok(tr.started.length === 1, "ventana pasa a ACTIVE automáticamente");
ok((await one(`select public.monitoring_active_maintenance($1,$2) r`, [pA, eA.id])).r?.suppressAlerts === true, "mantenimiento activo detectado para el endpoint");
let crossErr; try { await q(`insert into maintenance_windows(project_id,endpoint_id,title,starts_at,ends_at) values($1,$2,'x',now(),now()+interval '1 hour')`, [pA, eB.id]); } catch (e) { crossErr = e.message; } ok(crossErr, "ventana no acepta endpoint de otro proyecto");

// Rollups y stats
const n = (await one(`select public.monitoring_refresh_rollups(now()-interval '2 hours') n`)).n;
ok(n >= 2, "rollups horarios y diarios generados");
const r = await one(`select checks,successes,failures,uptime_percentage from monitor_hourly_rollups where monitor_id=$1`, [mA.id]);
ok(r.checks === 3 && r.successes === 1 && Number(r.uptime_percentage).toFixed(2) === "33.33", "rollup horario: 3 checks, 33,33 %");
const stats = (await one(`select public.monitoring_monitor_stats($1) s`, [mA.id])).s;
ok(stats.uptime.h24.checks === 3 && stats.latency.h24.p95 === null, "stats sin p95 cuando no hay muestras suficientes");
const fleet = (await one(`select public.monitoring_fleet_stats(array[$1::uuid,$2::uuid]) s`, [mA.id, mB.id])).s;
ok(fleet[mA.id].h24 !== null && fleet[mB.id].h24 === null, "stats de flota desde rollups; sin datos = null");
const purge = (await one(`select public.monitoring_purge(100) p`)).p;
ok(purge.rawDeleted === 0, "purga respeta retención");

// RLS
async function as(role, sub, sql, params) {
  await db.exec(`set role authenticated`);
  await db.query(`select set_config('request.jwt.claims',$1,false)`, [JSON.stringify({ sub, app_metadata: { role } })]);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec(`reset role`); await db.query(`select set_config('request.jwt.claims','',false)`); }
}
ok((await as("GERENTE_GENERAL", ids.other, `select id from monitors`)).length === 2, "Gerente ve todos los monitores");
ok((await as("PROGRAMADOR", ids.dev, `select id from monitors`)).map((x) => x.id).join() === mA.id, "Programador asignado ve sólo su proyecto");
ok((await as("PROGRAMADOR", ids.other, `select id from monitors`)).length === 0, "Programador no asignado no ve monitores");
ok((await as("PROGRAMADOR", ids.dev, `select id from monitors where id=$1`, [mB.id])).length === 0, "IDOR: monitor de otro proyecto denegado");
ok((await as("", ids.dev, `select id from incidents`)).length === 0, "usuario sin rol no ve incidentes");
ok((await as("EJECUTIVA_VENTAS", ids.dev, `select id from incidents`)).length === 0, "Ventas no lee incidentes crudos");
ok((await as("PROGRAMADOR", ids.dev, `select id from incident_events`)).length > 0, "Programador ve timeline de su incidente");
let denied; try { await as("GERENTE_GENERAL", ids.other, `update monitors set enabled=false`); denied = (await one(`select count(*)::int n from monitors where enabled=false`)).n === 0; } catch { denied = true; } ok(denied, "escrituras directas denegadas (sólo API service_role)");
let rpcDenied; try { await as("GERENTE_GENERAL", ids.other, `select public.monitoring_claim_due_monitors('x',1,60)`); } catch (e) { rpcDenied = e.message; } ok(/permission denied/.test(rpcDenied ?? ""), "RPC del motor no ejecutable por authenticated");
await q(`insert into alert_delivery_events(dedup_key,incident_id,project_id,recipient_user_id,channel,stage,event_type,status,title) values('k1',$1,$2,$3,'IN_APP','CONFIRMED','INCIDENT_CONFIRMED','DELIVERED','t')`, [created.incidentId, pA, ids.dev]);
ok((await as("PROGRAMADOR", ids.dev, `select id from alert_delivery_events`)).length === 1 && (await as("PROGRAMADOR", ids.other, `select id from alert_delivery_events`)).length === 0, "alertas Realtime sólo para su destinatario");
let dupAlert; try { await q(`insert into alert_delivery_events(dedup_key,project_id,recipient_user_id,channel,stage,event_type,status,title) values('k1',$1,$2,'IN_APP','CONFIRMED','INCIDENT_CONFIRMED','DELIVERED','t')`, [pA, ids.dev]); } catch (e) { dupAlert = e.message; } ok(dupAlert, "dedup_key impide alertas duplicadas");
// Portal
await q(`update incidents set client_visibility='CLIENT_VISIBLE',client_summary='Interrupción breve del sitio' where id=$1`, [created.incidentId]);
const portalUser = "77777777-7777-4777-8777-777777777777";
await db.exec(`insert into auth.users(id) values('${portalUser}'); insert into client_contacts(id,client_id,name,email) values('88888888-8888-4888-8888-888888888888','${ids.client}','Contacto','c@z.cl'); insert into client_portal_users(client_id,contact_id,auth_user_id,status) values('${ids.client}','88888888-8888-4888-8888-888888888888','${portalUser}','ACTIVE'); insert into client_portal_settings(client_id,enabled,monitoring_visible) values('${ids.client}',true,true)`);
const portal = await as("PORTAL_CLIENT", portalUser, `select * from monitoring_portal_incidents`);
ok(portal.length === 1 && !("description" in portal[0]) && !("root_cause" in portal[0]), "portal ve sólo resumen autorizado sin notas internas");
ok((await as("PORTAL_CLIENT", portalUser, `select id from incidents`)).length === 0, "portal no accede a tabla de incidentes");
await db.close();

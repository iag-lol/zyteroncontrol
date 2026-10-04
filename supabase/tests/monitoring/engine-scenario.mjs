/* global process, console */
// Motor TS → RPC SQL con payloads reales. Requiere `pnpm --filter @zyteron/api build` antes de ejecutarlo.
import { createDb } from "./harness.mjs";
import { evaluateCheck, resolveSeverity } from "../../../apps/api/dist/monitoring/monitoring.engine.js";
import { defaultSettings } from "../../../apps/api/dist/monitoring/monitoring.store.js";
const db = await createDb();
const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const ok = (c, m) => { console.log(c ? "✓" : "✗", m); if (!c) process.exitCode = 1; };
const dev = "44444444-4444-4444-8444-444444444444";
await db.exec("insert into clients(id,legal_name,rut) values('11111111-1111-4111-8111-111111111111','Zyteron SpA','76.000.000-0')");
const wo = await one("insert into work_orders(title,scope,client_id,status) values('Web','s','11111111-1111-4111-8111-111111111111','DRAFT') returning id");
const project = (await one("insert into projects(name,scope,work_order_id,client_id,priority) values('Zyteron Web','s',$1,'11111111-1111-4111-8111-111111111111','HIGH') returning id", [wo.id])).id;
const endpoint = (await one("insert into project_endpoints(project_id,name,url,environment,responsible_user_id) values($1,'Web principal','https://www.zyteron.cl','PRODUCTION',$2) returning id", [project, dev])).id;
const monitor = (await one("insert into monitors(endpoint_id,interval_seconds,failure_threshold,recovery_threshold) values($1,60,3,2) returning id", [endpoint])).id;
const rules = (await db.query("select * from monitor_severity_rules")).rows.map((r) => ({ id: r.id, name: r.name, environment: r.environment, endpointType: r.endpoint_type, projectPriority: r.project_priority, clientId: r.client_id, severity: r.severity, enabled: r.enabled }));
const incidentRow = (r) => r && ({ id: r.id, incidentNumber: r.incident_number, status: r.status, severity: r.severity, acknowledgedAt: r.acknowledged_at?.toISOString?.() ?? r.acknowledged_at, confirmedAt: r.confirmed_at?.toISOString?.() ?? null, currentOutageStartedAt: r.current_outage_started_at?.toISOString?.() ?? null, recoveredAt: r.recovered_at?.toISOString?.() ?? null, resolvedAt: r.resolved_at?.toISOString?.() ?? null, downtimeSeconds: r.downtime_seconds, reopenedCount: r.reopened_count, postmortemRequired: r.postmortem_required, assignedTo: r.assigned_to });
let clock = Date.now();
async function cycle(success, extra = {}) {
  await db.query("update monitors set next_check_at=now()-interval '1 second' where id=$1", [monitor]);
  const [execution] = (await one("select public.monitoring_claim_due_monitors('w1',5,120) c")).c;
  clock += 60_000;
  const result = { checkedAt: new Date(clock).toISOString(), success, statusCode: success ? 200 : 503, latencyMs: success ? 140 : 90, errorType: success ? null : "HTTP_STATUS", errorCode: success ? null : "503", errorMessage: success ? null : "HTTP 503", redirectCount: 0, contentMatched: null, sslValid: true, sslExpiresAt: null, ...extra };
  const active = await one("select * from incidents where monitor_id=$1 and status in('DETECTED','CONFIRMED','ACKNOWLEDGED','INVESTIGATING','MITIGATING','MONITORING')", [monitor]);
  const maintenance = (await one("select public.monitoring_active_maintenance($1,$2,$3) m", [project, endpoint, result.checkedAt])).m;
  const context = { activeIncident: incidentRow(active) ?? null, reopenCandidate: null, maintenance };
  const decision = evaluateCheck({ monitor: execution, result, context, settings: defaultSettings, severity: resolveSeverity(rules, execution) });
  const payload = { monitorId: monitor, workerId: "w1", expectedVersion: execution.stateVersion, check: { ...result, inMaintenance: Boolean(maintenance), triggerType: "SCHEDULED", source: "w1" }, state: decision.state, incident: decision.incident, incidentEvents: decision.incidentEvents, monitoringEvents: decision.monitoringEvents, outbox: decision.outbox };
  const applied = (await one("select public.monitoring_apply_check($1::jsonb) r", [JSON.stringify(payload)])).r;
  return { decision, applied, execution };
}
let r = await cycle(false); ok(r.decision.state.status === "DEGRADED" && !r.applied.incidentId, "1/3: DEGRADED sin incidente");
ok(r.execution.endpoint.environment === "PRODUCTION" && r.execution.project.priority === "HIGH", "payload SQL alimenta al motor TS");
await cycle(false); r = await cycle(false);
ok(r.applied.incidentApplied && r.applied.incidentNumber.startsWith("INC-"), "3/3: incidente creado vía RPC con payload del motor TS");
const inc = await one("select * from incidents where id=$1", [r.applied.incidentId]);
ok(inc.severity === "HIGH" && inc.status === "CONFIRMED" && inc.assigned_to === dev && inc.postmortem_required, "severidad por regla PRODUCTION, autoasignación y postmortem requerido");
const ev = (await db.query("select event_type from incident_events where incident_id=$1 order by occurred_at", [inc.id])).rows.map((x) => x.event_type).join(",");
ok(ev === "DETECTED,CONFIRMED,ASSIGNED", "timeline DETECTED,CONFIRMED,ASSIGNED: " + ev);
const mon = await one("select status,consecutive_failures,state_version,lease_owner from monitors where id=$1", [monitor]);
ok(mon.status === "OFFLINE" && mon.consecutive_failures === 3 && mon.lease_owner === null, "monitor OFFLINE, lease liberado");
const offlineEvent = await one("select incident_id,title from monitoring_events where event_type='ENDPOINT_OFFLINE'");
ok(offlineEvent?.incident_id === inc.id && offlineEvent.title.includes("fuera de servicio"), "evento ENDPOINT_OFFLINE vinculado al incidente");
const failedOutbox = (await db.query("select count(*)::int n from business_event_outbox where event_type='MONITOR_FAILED'")).rows[0].n;
ok(failedOutbox === 1, "MONITOR_FAILED sólo en la primera falla de la racha");
r = await cycle(false); ok(r.decision.incident === null && (await db.query("select count(*)::int n from incidents")).rows[0].n === 1, "4.ª falla no duplica");
// Acknowledge con parche TS snake_case
const ack = (await one("select public.monitoring_mutate_incident($1,'CONFIRMED',$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb) r", [inc.id, JSON.stringify({ status: "ACKNOWLEDGED", acknowledged_at: new Date(clock).toISOString(), acknowledged_by: dev }), JSON.stringify([{ eventType: "ACKNOWLEDGED", actorId: dev, actorType: "USER" }]), JSON.stringify([{ eventType: "INCIDENT_ACKNOWLEDGED", tone: "INFO", title: "Incidente {incidentNumber} reconocido." }]), JSON.stringify([{ eventType: "INCIDENT_ACKNOWLEDGED" }])])).r;
ok(ack.status === "ACKNOWLEDGED", "acknowledge vía RPC");
ok((await one("select title from monitoring_events where event_type='INCIDENT_ACKNOWLEDGED'")).title === "Incidente " + inc.incident_number + " reconocido.", "título con número de incidente");
const esc = (await one("select public.monitoring_mutate_incident($1,'ACKNOWLEDGED',$2::jsonb,'[]','[]','[]',$3::jsonb) r", [inc.id, JSON.stringify({ escalation_level: 1 }), JSON.stringify({ escalationBelow: 1, unacknowledged: true })])).r;
ok(esc === null, "guarda de escalamiento: incidente reconocido no escala");
await cycle(true); r = await cycle(true);
const rec = await one("select status,recovered_at,downtime_seconds,current_outage_started_at from incidents where id=$1", [inc.id]);
ok(rec.status === "MONITORING" && rec.recovered_at && rec.downtime_seconds === 180 && rec.current_outage_started_at === null, "recuperación: MONITORING, downtime 180 s (confirmación t3 → recuperación t6)");
ok((await one("select status from monitors where id=$1", [monitor])).status === "ONLINE", "monitor ONLINE");
ok((await db.query("select 1 from business_event_outbox where event_type='ENDPOINT_RECOVERED'")).rows.length === 1, "outbox ENDPOINT_RECOVERED");
// Relapse
await cycle(false); await cycle(false); r = await cycle(false);
const rel = await one("select status,recovered_at,current_outage_started_at from incidents where id=$1", [inc.id]);
ok(r.decision.incident?.action === "RELAPSE" && rel.status === "INVESTIGATING" && rel.recovered_at === null && rel.current_outage_started_at, "recaída: INVESTIGATING (ya reconocido)");
await cycle(true); await cycle(true);
ok((await one("select downtime_seconds from incidents where id=$1", [inc.id])).downtime_seconds === 300, "downtime acumulado por caída: 180 s + 120 s (recaída confirmada t9 → recuperación t11)");
// Mantenimiento: falla suprimida y check marcado
await db.query("update incidents set status='CLOSED',closed_at=now() where id=$1", [inc.id]);
await db.query("insert into maintenance_windows(project_id,title,starts_at,ends_at) values($1,'Ventana',$2,$3)", [project, new Date(clock - 3600_000).toISOString(), new Date(clock + 3600_000 * 5).toISOString()]);
for (let i = 0; i < 3; i++) r = await cycle(false);
ok(r.decision.state.status === "MAINTENANCE" && (await db.query("select count(*)::int n from incidents where status<>'CLOSED'")).rows[0].n === 0, "mantenimiento: sin incidente, estado MAINTENANCE");
ok((await one("select count(*)::int n from monitor_checks where in_maintenance")).n === 3, "evidencia preservada con in_maintenance=true");
ok((await one("select count(*)::int n from monitoring_events where event_type='INCIDENT_SUPPRESSED'")).n === 1, "INCIDENT_SUPPRESSED una vez");
// Lease perdido: versión obsoleta
await db.query("update monitors set next_check_at=now()-interval '1 second' where id=$1", [monitor]);
const [stale] = (await one("select public.monitoring_claim_due_monitors('w9',5,120) c")).c;
await db.query("select public.monitoring_set_enabled($1,false)", [monitor]);
let lost; try { await one("select public.monitoring_apply_check($1::jsonb)", [JSON.stringify({ monitorId: monitor, workerId: "w9", expectedVersion: stale.stateVersion, check: { checkedAt: new Date().toISOString(), success: true }, state: { status: "ONLINE", consecutiveFailures: 0, consecutiveSuccesses: 1, nextCheckAt: new Date().toISOString() }, incident: null })]); } catch (e) { lost = e.message; }
ok(/LEASE_LOST/.test(lost ?? ""), "deshabilitar invalida checks en vuelo (state_version)");
await db.close();

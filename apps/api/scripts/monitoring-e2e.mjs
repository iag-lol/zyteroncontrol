/* global process, console, fetch */
// E2E HTTP controlado: API Nest real (modo desarrollo, store en memoria) contra https://www.zyteron.cl.
// La falla se simula con una ruta QA inexistente del mismo dominio. Uso: pnpm --filter @zyteron/api build && node apps/api/scripts/monitoring-e2e.mjs
import "reflect-metadata";
import { randomUUID } from "node:crypto";
process.env.AUTH_MODE = "development"; process.env.MONITORING_WORKER_ENABLED = "false"; delete process.env.SUPABASE_URL;
const { NestFactory } = await import("@nestjs/core");
const { AppModule } = await import("../dist/app.module.js");
const { MONITORING_STORE } = await import("../dist/monitoring/monitoring.store.js");
const { MonitoringScheduler } = await import("../dist/monitoring/monitoring.scheduler.js");
const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] }); app.setGlobalPrefix("api"); await app.listen(4199);
const store = app.get(MONITORING_STORE, { strict: false }), scheduler = app.get(MonitoringScheduler, { strict: false });
const ids = { gerente: randomUUID(), jefe: randomUUID(), dev: randomUUID(), lead: randomUUID(), outsider: randomUUID(), client: randomUUID() };
const as = (role, userId) => ({ "content-type": "application/json", "x-zyteron-role": role, "x-zyteron-user-id": userId });
const G = as("GERENTE_GENERAL", ids.gerente), J = as("JEFE_DESARROLLO", ids.jefe), D = as("PROGRAMADOR", ids.dev), X = as("PROGRAMADOR", ids.outsider);
async function call(method, path, headers, body, extra = {}) { const r = await fetch("http://localhost:4199/api" + path, { method, headers: { ...headers, ...extra }, body: body ? JSON.stringify(body) : undefined }); const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return { status: r.status, data }; }
const ok = (c, m, extra = "") => { console.log((c ? "✓" : "✗") + " " + m + (extra ? "  → " + extra : "")); if (!c) process.exitCode = 1; };
const tick = async (monitorId) => { store.forceDue(monitorId); await scheduler.tick(Date.now()); await scheduler.drain(); };
const fmt = (iso) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)).replace(",", "").replaceAll("/", "-");
try {
  // 1. Proyecto real del flujo Operaciones
  let r = await call("POST", "/work-orders", J, { title: "Zyteron Web", scope: "Sitio corporativo www.zyteron.cl", priority: "HIGH", clientId: ids.client });
  const wo = r.data.id;
  await call("POST", `/work-orders/${wo}/status`, J, { status: "READY_FOR_HANDOFF" }); await call("POST", `/work-orders/${wo}/accept-handoff`, J);
  await call("POST", `/work-orders/${wo}/plan`, J, { plannedStartDate: "2026-10-01", targetDate: "2026-12-15", estimatedHours: 40 }); await call("POST", `/work-orders/${wo}/assign`, J, { userId: ids.lead });
  r = await call("POST", `/work-orders/${wo}/convert-to-project`, J, { projectLeadId: ids.lead, developmentManagerId: ids.jefe }, { "idempotency-key": randomUUID() });
  const project = r.data; ok(r.status === 201 && project.projectNumber, "1. Proyecto creado desde OT", project.projectNumber);
  await call("POST", `/projects/${project.id}/members`, J, { userId: ids.dev, projectRole: "DEVELOPER" });
  // 2-3. Endpoint autorizado + monitor
  r = await call("POST", "/monitoring/monitors", J, { projectId: project.id, name: "Web principal", url: "https://www.zyteron.cl", environment: "PRODUCTION", endpointType: "WEB", responsibleUserId: ids.dev, intervalSeconds: 60, failureThreshold: 3, recoveryThreshold: 2, warningLatencyMs: 4000, criticalLatencyMs: 9000, expectedStatus: "200-299" });
  const monitor = r.data; ok(r.status === 201 && monitor.monitorType === "HTTPS" && monitor.clientId === ids.client, "2-3. Endpoint + monitor HTTPS registrados (cliente derivado)", monitor.id);
  r = await call("POST", "/monitoring/monitors", J, { projectId: project.id, name: "Interno", url: "http://169.254.169.254/latest/meta-data/" });
  ok(r.status === 400, "   SSRF: alta hacia metadata rechazada", r.data.message);
  // 4-6. Check real
  r = await call("POST", `/monitoring/monitors/${monitor.id}/check-now`, D);
  ok(r.status === 201 && r.data.result.success, "4-5. CHECK NOW real contra www.zyteron.cl", `HTTP ${r.data.result?.statusCode} · ${r.data.result?.latencyMs} ms · ${r.data.status}`);
  r = await call("POST", `/monitoring/monitors/${monitor.id}/check-now`, D); ok(r.status === 429, "   Cooldown de CHECK NOW aplicado", r.data.message);
  r = await call("GET", "/monitoring/status", G); ok(r.data.monitors[0].status === "ONLINE", "6. Estado ONLINE en tablero", r.data.monitors[0].statusReason);
  await scheduler.housekeeping(new Date());
  r = await call("GET", "/monitoring/ssl", G); const ssl = r.data.monitors[0].ssl;
  ok(["HEALTHY", "EXPIRING_SOON"].includes(ssl.status) && ssl.expiresAt, "   SSL real observado", `${ssl.status} · emisor ${ssl.issuer} · vence ${fmt(ssl.expiresAt).slice(0, 10)} · ${ssl.daysRemaining} días`);
  // 7-8. Mantenimiento con supresión
  r = await call("POST", "/monitoring/maintenance", J, { projectId: project.id, title: "QA E2E monitoreo", startsAt: new Date(Date.now() - 60000).toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), suppressAlerts: true });
  const windowId = r.data.id; ok(r.data.status === "ACTIVE", "7. Ventana de mantenimiento ACTIVE", `${fmt(r.data.startsAt)} → ${fmt(r.data.endsAt)}`);
  // 9. Fixture de falla controlada: ruta QA inexistente del propio dominio (404)
  await call("PATCH", `/monitoring/monitors/${monitor.id}`, J, { url: "https://www.zyteron.cl/__zyteron-monitor-qa-inexistente" });
  for (let i = 0; i < 3; i++) await tick(monitor.id);
  r = await call("GET", `/monitoring/monitors/${monitor.id}`, G);
  ok(r.data.status === "MAINTENANCE" && r.data.consecutiveFailures === 3, "8-9. Falla real suprimida en mantenimiento", r.data.statusReason);
  r = await call("GET", "/monitoring/incidents", G); ok(r.data.total === 0, "   Sin incidente ni alertas durante la ventana");
  r = await call("GET", `/monitoring/monitors/${monitor.id}/checks?result=failure`, G); ok(r.data.total === 3 && r.data.items.every((c) => c.inMaintenance && c.statusCode === 404), "   Evidencia preservada (3 checks 404 en mantenimiento)");
  await call("POST", `/monitoring/maintenance/${windowId}/cancel`, J); await scheduler.housekeeping(new Date());
  // 10-11. Umbral → incidente
  await tick(monitor.id);
  r = await call("GET", "/monitoring/incidents?state=open", G); const incident = r.data.items[0];
  ok(incident && incident.status === "CONFIRMED" && incident.severity === "HIGH", "10-11. Incidente confirmado por umbral", `${incident?.incidentNumber} · ${incident?.severity} · asignado ${incident?.assignedTo === ids.dev ? "al responsable" : incident?.assignedTo}`);
  r = await call("GET", `/monitoring/incidents/${incident.id}`, X); ok(r.status === 403, "   IDOR: programador no asignado → 403");
  r = await call("GET", "/monitoring/alerts", D); ok(r.data.some((a) => a.eventType === "INCIDENT_CONFIRMED"), "19. Notificación in-app al responsable", r.data.map((a) => a.title).join(" | "));
  // 12-13. Acknowledge + assign + tarea
  r = await call("POST", `/monitoring/incidents/${incident.id}/acknowledge`, D); ok(r.data.status === "ACKNOWLEDGED", "12. Acknowledge por el programador", fmt(r.data.acknowledgedAt));
  r = await call("POST", `/monitoring/incidents/${incident.id}/assign`, D, { userId: ids.lead }); ok(r.status === 403, "   Programador no puede reasignar");
  r = await call("POST", `/monitoring/incidents/${incident.id}/assign`, J, { userId: ids.lead, note: "Lead toma la investigación" }); ok(r.data.assignedTo === ids.lead, "13. Jefe reasigna al Project Lead");
  r = await call("POST", `/monitoring/incidents/${incident.id}/change-status`, D, { status: "INVESTIGATING", note: "404 por ruta QA de prueba" }); ok(r.data.status === "INVESTIGATING", "   Investigación iniciada");
  r = await call("POST", `/monitoring/incidents/${incident.id}/create-task`, D, {}, { "idempotency-key": "e2e-1" }); ok(r.data.task?.projectId === project.id, "   Tarea correctiva creada en Operaciones", r.data.task?.title);
  r = await call("GET", `/tasks?projectId=${project.id}`, J); ok(r.data.items.some((t) => t.title.includes(incident.incidentNumber)), "   Tarea visible en Operaciones /tasks");
  // 14. Recuperación QA
  await call("PATCH", `/monitoring/monitors/${monitor.id}`, J, { url: "https://www.zyteron.cl" });
  await tick(monitor.id); await tick(monitor.id);
  r = await call("GET", `/monitoring/incidents/${incident.id}`, G);
  ok(r.data.incident.status === "MONITORING" && r.data.incident.recoveredAt, "14. Recuperación confirmada (2 éxitos)", `downtime ${r.data.incident.downtimeSeconds} s`);
  // 15. Resolver + postmortem + cerrar
  r = await call("POST", `/monitoring/incidents/${incident.id}/resolve`, J, { resolution: "Se restableció la URL monitoreada después de la prueba QA controlada." });
  ok(r.data.status === "POSTMORTEM_REQUIRED", "15. Resuelto; postmortem requerido (HIGH)");
  await call("PATCH", `/monitoring/incidents/${incident.id}/postmortem`, J, { rootCause: "La URL del monitor apuntaba a una ruta QA inexistente.", impact: "Ninguno para usuarios: prueba controlada interna.", preventiveActions: "Validar rutas QA antes de usarlas como fixture." });
  r = await call("POST", `/monitoring/incidents/${incident.id}/close`, J); ok(r.data.status === "CLOSED", "   Incidente cerrado con postmortem completo");
  // 16-17. Project 360 y Client 360
  r = await call("GET", `/monitoring/status/projects/${project.id}`, D); ok(r.status === 200 && r.data.monitors.length === 1 && r.data.recentIncidents.length === 1, "16. Project 360 consume monitoreo", `uptime24h ${r.data.fleet[monitor.id].uptime24h} %`);
  r = await call("GET", `/monitoring/status/clients/${ids.client}`, as("EJECUTIVA_VENTAS", randomUUID())); ok(r.status === 200 && r.data.monitors[0].statusReason === null && r.data.recentIncidents[0].description === null, "17. Client 360 (ventas): resumen sanitizado");
  // 20. Auditoría / historial
  r = await call("GET", `/monitoring/incidents/${incident.id}`, G); ok(r.data.events.length >= 8, "20. Timeline auditable", r.data.events.map((e) => e.eventType).join(" → "));
  r = await call("GET", "/monitoring/history?pageSize=100", G); ok(r.data.total > 5, "   Historial de eventos", [...new Set(r.data.items.map((e) => e.eventType))].join(", "));
  r = await call("GET", "/monitoring/uptime?period=24h", G); ok(r.data.buckets[monitor.id]?.length >= 1, "   Uptime 24 h con datos reales", `${r.data.fleet[monitor.id].uptime24h} % (mantenimiento ${r.data.maintenancePolicy})`);
  r = await fetch("http://localhost:4199/api/monitoring/exports/incidents.csv", { headers: G }); const csv = await r.text(); ok(csv.includes(incident.incidentNumber) && /\d{2}-\d{2}-\d{4} \d{2}:\d{2}/.test(csv), "   Export CSV con fechas DD-MM-AAAA HH:mm");
  r = await call("GET", "/monitoring/reports/monthly?month=2026-10", G); ok(r.data.metrics.incidents === 1, "   Agregados de informe mensual", `MTTA ${r.data.metrics.mttaSeconds} s · MTTR ${r.data.metrics.mttrSeconds} s`);
  r = await call("GET", "/monitoring/dashboard", { "content-type": "application/json" }); ok(r.status === 401, "   Usuario sin rol → 401");
} finally { await app.close(); }

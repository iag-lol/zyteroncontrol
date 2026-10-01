import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { defaultSettings } from "./monitoring.store.js";
import { evaluateCheck, formatDuration, resolveSeverity } from "./monitoring.engine.js";
import { incidentMetrics, percentile, uptimeOf } from "./monitoring.stats.js";
import { actors, createKit, fail, ids, ok } from "./monitoring.test-kit.js";
import type { MonitorExecution } from "./monitoring.types.js";

const URL_A = "https://www.zyteron.cl/";

async function monitored(overrides: Record<string, unknown> = {}) {
  const kit = await createKit();
  const monitor = await kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "Web principal", url: "https://www.zyteron.cl", environment: "PRODUCTION", responsibleUserId: ids.dev, intervalSeconds: 60, failureThreshold: 3, recoveryThreshold: 2, ...overrides });
  return { ...kit, monitor };
}

describe("Motor de incidentes · umbrales y deduplicación", () => {
  it("1 falla no crea incidente con umbral 3; 3 fallas lo confirman; la 4.ª no duplica", async () => {
    const { tick, checker, monitor, service, store } = await monitored();
    checker.script(URL_A, fail(), fail(), fail(), fail());
    await tick(monitor.id);
    let current = await store.getMonitor(monitor.id);
    expect(current?.status).toBe("DEGRADED");
    expect(current?.statusReason).toContain("1/3");
    expect((await service.listIncidents(actors.jefe, {})).total).toBe(0);
    await tick(monitor.id); await tick(monitor.id);
    current = await store.getMonitor(monitor.id);
    expect(current?.status).toBe("OFFLINE");
    const incidents = await service.listIncidents(actors.jefe, {});
    expect(incidents.total).toBe(1);
    const incident = incidents.items[0]!;
    expect(incident.incidentNumber).toMatch(/^INC-\d{4}-\d{6}$/);
    expect(incident).toMatchObject({ status: "CONFIRMED", severity: "HIGH", assignedTo: ids.dev, failureType: "HTTP_STATUS", postmortemRequired: true });
    expect(new Date(incident.detectedAt).getTime()).toBeLessThanOrEqual(new Date(incident.confirmedAt!).getTime());
    await tick(monitor.id);
    expect((await service.listIncidents(actors.jefe, {})).total).toBe(1);
    const detail = await service.getIncident(actors.jefe, incident.id);
    expect(detail.events.map((event) => event.eventType)).toEqual(["DETECTED", "CONFIRMED", "ASSIGNED"]);
    expect(detail.recentChecks.filter((check) => !check.success)).toHaveLength(4);
  });

  it("recuperación respeta recovery threshold, calcula downtime y pasa a MONITORING", async () => {
    const { tick, checker, monitor, service, store } = await monitored();
    checker.script(URL_A, fail(), fail(), fail(), ok(), ok());
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    const [incident] = (await service.listIncidents(actors.jefe, {})).items;
    await tick(monitor.id);
    expect((await store.getIncident(incident!.id))?.status).toBe("CONFIRMED");
    expect((await store.getMonitor(monitor.id))?.statusReason).toContain("1/2");
    await tick(monitor.id);
    const recovered = await store.getIncident(incident!.id);
    expect(recovered).toMatchObject({ status: "MONITORING" });
    expect(recovered!.recoveredAt).not.toBeNull();
    expect(recovered!.downtimeSeconds).toBeGreaterThanOrEqual(0);
    expect((await store.getMonitor(monitor.id))?.status).toBe("ONLINE");
  });

  it("resolver exige recuperación previa y texto de resolución; con severidad HIGH requiere postmortem para cerrar", async () => {
    const { tick, checker, monitor, service } = await monitored();
    checker.script(URL_A, fail(), fail(), fail(), ok(), ok());
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    const [incident] = (await service.listIncidents(actors.jefe, {})).items;
    await expect(service.resolve(actors.jefe, incident!.id, { resolution: "Reinicio del contenedor" })).rejects.toBeInstanceOf(ConflictException);
    await tick(monitor.id); await tick(monitor.id);
    await expect(service.resolve(actors.jefe, incident!.id, { resolution: "corto" })).rejects.toBeInstanceOf(BadRequestException);
    const resolved = await service.resolve(actors.jefe, incident!.id, { resolution: "Se revirtió la configuración de caché del CDN." });
    expect(resolved.status).toBe("POSTMORTEM_REQUIRED");
    await expect(service.close(actors.jefe, incident!.id)).rejects.toBeInstanceOf(ConflictException);
    await service.updatePostmortem(actors.jefe, incident!.id, { rootCause: "Regla de caché inválida publicada en el CDN.", impact: "Sitio principal no disponible para visitantes.", preventiveActions: "Validar reglas de caché en staging antes de publicar." });
    expect((await service.close(actors.jefe, incident!.id)).status).toBe("CLOSED");
  });

  it("reabre el mismo incidente si vuelve a caer dentro de la ventana; crea uno nuevo fuera de ella", async () => {
    const { tick, checker, monitor, service, store } = await monitored({ incidentSeverity: "MEDIUM" });
    checker.script(URL_A, fail(), fail(), fail(), ok(), ok(), fail(), fail(), fail());
    for (let i = 0; i < 5; i++) await tick(monitor.id);
    const [incident] = (await service.listIncidents(actors.jefe, {})).items;
    expect((await service.resolve(actors.jefe, incident!.id, { resolution: "Servicio estabilizado tras reinicio." })).status).toBe("RESOLVED");
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    const reopened = await store.getIncident(incident!.id);
    expect(reopened).toMatchObject({ status: "CONFIRMED", reopenedCount: 1 });
    expect((await service.listIncidents(actors.jefe, {})).total).toBe(1);
    // Fuera de ventana: resolver, envejecer la resolución y volver a fallar.
    checker.script(URL_A, ok(), ok(), fail(), fail(), fail());
    await tick(monitor.id); await tick(monitor.id);
    await service.resolve(actors.jefe, incident!.id, { resolution: "Segunda estabilización documentada." });
    store.shiftIncidentTimes(incident!.id, { resolvedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() });
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    expect((await service.listIncidents(actors.jefe, {})).total).toBe(2);
  });

  it("recaída durante MONITORING vuelve a CONFIRMED/INVESTIGATING sin crear duplicado", async () => {
    const { tick, checker, monitor, service, store } = await monitored();
    checker.script(URL_A, fail(), fail(), fail(), ok(), ok(), fail(), fail(), fail());
    for (let i = 0; i < 5; i++) await tick(monitor.id);
    const [incident] = (await service.listIncidents(actors.jefe, {})).items;
    expect((await store.getIncident(incident!.id))?.status).toBe("MONITORING");
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    expect((await store.getIncident(incident!.id))?.status).toBe("CONFIRMED");
    expect((await service.listIncidents(actors.jefe, {})).total).toBe(1);
    expect((await store.incidentEvents(incident!.id)).some((event) => event.eventType === "RELAPSED")).toBe(true);
  });

  it("deshabilitar el monitor detiene checks y lo marca DISABLED", async () => {
    const { tick, checker, monitor, service, store } = await monitored();
    await service.setEnabled(actors.jefe, monitor.id, false);
    await tick(monitor.id);
    expect(checker.calls).toHaveLength(0);
    expect((await store.getMonitor(monitor.id))?.status).toBe("DISABLED");
    await expect(service.checkNow(actors.jefe, monitor.id)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("Mantenimiento", () => {
  it("durante la ventana sigue registrando checks, marca MAINTENANCE y suprime incidentes/alertas", async () => {
    const { tick, checker, monitor, service, store, scheduler } = await monitored();
    const window = await service.createMaintenance(actors.jefe, { projectId: monitor.projectId, title: "Migración de base de datos", startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(window.status).toBe("ACTIVE");
    checker.script(URL_A, fail(), fail(), fail(), fail());
    for (let i = 0; i < 4; i++) await tick(monitor.id);
    expect((await store.getMonitor(monitor.id))?.status).toBe("MAINTENANCE");
    expect((await service.listIncidents(actors.jefe, {})).total).toBe(0);
    const checks = await service.listChecks(actors.jefe, monitor.id, {});
    expect(checks.total).toBe(4);
    expect(checks.items.every((check) => check.inMaintenance)).toBe(true);
    expect((await service.history(actors.jefe, { eventType: "INCIDENT_SUPPRESSED" })).total).toBe(1);
    expect(await store.listAlertsFor(ids.dev, "PROGRAMADOR", 20, null)).toHaveLength(0);
    // Al cancelar, el monitor vuelve a evaluarse y la falla persistente sí genera incidente.
    await service.cancelMaintenance(actors.jefe, window.id);
    await scheduler.housekeeping();
    expect((await store.getMonitor(monitor.id))?.status).toBe("UNKNOWN");
    checker.script(URL_A, fail());
    await tick(monitor.id);
    expect((await service.listIncidents(actors.jefe, {})).total).toBe(1);
  });

  it("activa y completa ventanas automáticamente por fecha UTC", async () => {
    const { service, store, monitor } = await monitored();
    const window = await service.createMaintenance(actors.jefe, { projectId: monitor.projectId, endpointId: monitor.endpointId, title: "Actualización", startsAt: new Date(Date.now() + 60_000).toISOString(), endsAt: new Date(Date.now() + 120_000).toISOString() });
    expect(window.status).toBe("PLANNED");
    expect((await store.runMaintenanceTransitions(new Date(Date.now() + 90_000))).started.map((item) => item.id)).toEqual([window.id]);
    expect((await store.runMaintenanceTransitions(new Date(Date.now() + 180_000))).completed.map((item) => item.id)).toEqual([window.id]);
    await expect(service.createMaintenance(actors.jefe, { projectId: monitor.projectId, title: "Inválida", startsAt: new Date(Date.now() + 7200_000).toISOString(), endsAt: new Date(Date.now() + 3600_000).toISOString() })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("Alertas, escalamiento y acciones", () => {
  it("notifica al responsable, escala por tiempo sin acknowledge y deduplica", async () => {
    const { tick, checker, monitor, service, store, alerts } = await monitored();
    checker.script(URL_A, fail(), fail(), fail());
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    const [incident] = (await service.listIncidents(actors.jefe, {})).items;
    const devAlerts = await store.listAlertsFor(ids.dev, "PROGRAMADOR", 20, null);
    expect(devAlerts.map((alert) => alert.eventType)).toEqual(["INCIDENT_CONFIRMED"]);
    expect(devAlerts[0]!.soundProfile).toBe("DEFAULT");
    const later = new Date(Date.now() + 16 * 60_000);
    expect(await alerts.processEscalations(later)).toBe(1);
    expect(await alerts.processEscalations(later)).toBe(0);
    expect((await store.listAlertsFor(ids.lead, "PROGRAMADOR", 20, null)).map((alert) => alert.stage)).toEqual(["ESCALATION_1_0"]);
    expect((await store.listAlertsFor(ids.jefe, "JEFE_DESARROLLO", 20, null)).some((alert) => alert.stage === "ESCALATION_2_0")).toBe(true);
    expect((await store.getIncident(incident!.id))?.escalationLevel).toBe(2);
    // Reconocido: no escala más.
    await service.acknowledge(actors.dev, incident!.id);
    expect(await alerts.processEscalations(new Date(Date.now() + 60 * 60_000))).toBe(0);
  });

  it("CRITICAL notifica de inmediato a Gerencia con sonido urgente; canales externos sin proveedor quedan registrados", async () => {
    const kit = await monitored({ incidentSeverity: "CRITICAL" });
    const rule = (await kit.store.listAlertRules())[0]!;
    await kit.store.updateAlertRule(rule.id, { channels: ["IN_APP", "REALTIME", "EMAIL", "WEB_PUSH"] });
    kit.checker.script(URL_A, fail(), fail(), fail());
    for (let i = 0; i < 3; i++) await kit.tick(kit.monitor.id);
    const gerencia = await kit.store.listAlertsFor(null, "GERENTE_GENERAL", 20, null);
    expect(gerencia).toHaveLength(1);
    expect(gerencia[0]!.soundProfile).toBe("URGENT");
    const external = kit.store.allDeliveries().filter((delivery) => delivery.channel !== "IN_APP");
    expect(external.length).toBeGreaterThan(0);
    expect(external.every((delivery) => delivery.status === "PROVIDER_NOT_CONFIGURED")).toBe(true);
  });

  it("acknowledge, reasignación, tarea correctiva en Operaciones y bug desacoplado", async () => {
    const { tick, checker, monitor, service, operations } = await monitored();
    checker.script(URL_A, fail(), fail(), fail());
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    const [incident] = (await service.listIncidents(actors.jefe, {})).items;
    const acked = await service.acknowledge(actors.dev, incident!.id);
    expect(acked).toMatchObject({ status: "ACKNOWLEDGED", acknowledgedBy: ids.dev });
    await expect(service.acknowledge(actors.dev, incident!.id)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.assign(actors.dev, incident!.id, { userId: ids.lead })).rejects.toThrow();
    expect((await service.assign(actors.jefe, incident!.id, { userId: ids.lead })).assignedTo).toBe(ids.lead);
    expect((await service.changeStatus(actors.dev, incident!.id, { status: "INVESTIGATING", note: "Revisando logs de Render" })).status).toBe("INVESTIGATING");
    await expect(service.changeStatus(actors.dev, incident!.id, { status: "CONFIRMED" })).rejects.toBeInstanceOf(BadRequestException);
    const { task, links } = await service.createTask(actors.dev, incident!.id, {}, "key-1");
    expect((await service.createTask(actors.dev, incident!.id, {}, "key-1")).task?.id).toBe(task.id);
    expect(task).toMatchObject({ projectId: monitor.projectId, status: "TODO", priority: "URGENT" });
    expect((await operations.getTask(task.id))?.title).toContain(incident!.incidentNumber);
    expect(links.map((link) => link.linkType)).toEqual(["TASK"]);
    await service.linkBug(actors.dev, incident!.id, { reference: "BUG-142" });
    const detail = await service.getIncident(actors.dev, incident!.id);
    expect(detail.events.map((event) => event.eventType)).toEqual(expect.arrayContaining(["ACKNOWLEDGED", "ASSIGNED", "STATUS_CHANGED", "TASK_CREATED", "BUG_LINKED"]));
    await expect(service.setVisibility(actors.jefe, incident!.id, { clientVisibility: "CLIENT_VISIBLE" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setVisibility(actors.jefe, incident!.id, { clientVisibility: "CLIENT_VISIBLE", clientSummary: "Caída en 10.0.0.4" })).rejects.toBeInstanceOf(BadRequestException);
    expect((await service.setVisibility(actors.jefe, incident!.id, { clientVisibility: "CLIENT_VISIBLE", clientSummary: "Interrupción breve del sitio web." })).clientVisibility).toBe("CLIENT_VISIBLE");
  });

  it("muestra deployments recientes como contexto sin afirmar causalidad", async () => {
    const { tick, checker, monitor, service, operations } = await monitored();
    await operations.createDeployment({ projectId: monitor.projectId, environment: "PRODUCTION", version: "v2.4.0", status: "SUCCESS" });
    checker.script(URL_A, fail(), fail(), fail());
    for (let i = 0; i < 3; i++) await tick(monitor.id);
    const [incident] = (await service.listIncidents(actors.jefe, {})).items;
    const detail = await service.getIncident(actors.jefe, incident!.id);
    expect(detail.deployments).toHaveLength(1);
    expect(detail.deployments[0]).toMatchObject({ version: "v2.4.0", environment: "PRODUCTION" });
    expect(detail.deployments[0]!.minutesBeforeDetection).toBeGreaterThanOrEqual(0);
  });

  it("CHECK NOW ejecuta un check real registrado y respeta cooldown", async () => {
    const { checker, monitor, service } = await monitored();
    const result = await service.checkNow(actors.dev, monitor.id);
    expect(result.status).toBe("ONLINE");
    expect(checker.calls).toHaveLength(1);
    expect((await service.listChecks(actors.dev, monitor.id, {})).items[0]?.triggerType).toBe("MANUAL");
    await expect(service.checkNow(actors.dev, monitor.id)).rejects.toMatchObject({ status: 429 });
  });
});

describe("Configuración y validaciones del monitor", () => {
  it("rechaza intervalos que puedan sobrecargar la infraestructura y tipos sin ejecutor", async () => {
    const kit = await createKit();
    await expect(kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "x", url: "https://www.zyteron.cl", intervalSeconds: 10 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "x", url: "https://www.zyteron.cl", monitorType: "TCP" })).rejects.toThrow(/ejecutor real/);
    await expect(kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "x", url: "https://www.zyteron.cl", timeoutMs: 70_000 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "x", url: "http://192.168.1.5" })).rejects.toThrow(/política de seguridad/);
    await expect(kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "x", url: "https://www.zyteron.cl", expectedStatus: "200-299", httpMethod: "HEAD", expectedContent: "Zyteron" })).rejects.toThrow(/GET/);
  });
  it("reutiliza el endpoint existente del proyecto y no duplica monitores", async () => {
    const kit = await createKit();
    const first = await kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "Web", url: "https://www.zyteron.cl", expectedStatus: "200" });
    expect(first).toMatchObject({ expectedStatusMin: 200, expectedStatusMax: 200, monitorType: "HTTPS", clientId: ids.client });
    await expect(kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "Web 2", url: "https://www.zyteron.cl/" })).rejects.toBeInstanceOf(ConflictException);
    expect(await kit.store.listEndpoints(null, kit.projectA.id)).toHaveLength(1);
  });
});

describe("Fórmulas y motor puro", () => {
  const base = { id: "m", endpointId: "e", projectId: "p", clientId: null, monitorType: "HTTPS", enabled: true, intervalSeconds: 60, timeoutMs: 5000, httpMethod: "GET", expectedStatusMin: 200, expectedStatusMax: 299, expectedContent: null, followRedirects: true, maxRedirects: 3, failureThreshold: 3, recoveryThreshold: 2, sslMonitoringEnabled: true, warningLatencyMs: 800, criticalLatencyMs: 2000, incidentSeverity: null, maintenanceMode: "CHECK_AND_SUPPRESS", alertRuleId: null, status: "ONLINE", statusReason: null, consecutiveFailures: 0, consecutiveSuccesses: 5, failureStreakStartedAt: null, lastLatencyMs: 100, stateVersion: 1, sslFingerprint: null, sslStatus: "HEALTHY", leaseOwner: "w", endpoint: { id: "e", name: "Web", url: URL_A, environment: "PRODUCTION", endpointType: "WEB", responsibleUserId: null, active: true }, project: { id: "p", name: "P", projectNumber: null, priority: "NORMAL", projectLeadId: null, developmentManagerId: null, clientId: null, clientName: null } } as MonitorExecution;
  const result = (latencyMs: number) => ({ checkedAt: new Date().toISOString(), success: true, statusCode: 200, latencyMs, errorType: null, errorCode: null, errorMessage: null, redirectCount: 0, contentMatched: null, sslValid: true, sslExpiresAt: null });
  it("DEGRADED por latencia sólo con umbrales configurados", () => {
    expect(evaluateCheck({ monitor: base, result: result(900), context: { activeIncident: null, reopenCandidate: null, maintenance: null }, settings: defaultSettings, severity: "HIGH" }).state.status).toBe("DEGRADED");
    const critical = evaluateCheck({ monitor: base, result: result(2500), context: { activeIncident: null, reopenCandidate: null, maintenance: null }, settings: defaultSettings, severity: "HIGH" });
    expect(critical.alerts).toEqual(["LATENCY_DEGRADED"]);
    expect(evaluateCheck({ monitor: { ...base, warningLatencyMs: null, criticalLatencyMs: null }, result: result(9000), context: { activeIncident: null, reopenCandidate: null, maintenance: null }, settings: defaultSettings, severity: "HIGH" }).state.status).toBe("ONLINE");
  });
  it("severidad configurable: override > regla específica > ambiente > MEDIUM", () => {
    const rules = [{ id: "1", name: "", environment: "PRODUCTION", endpointType: null, projectPriority: null, clientId: null, severity: "HIGH" as const, enabled: true }, { id: "2", name: "", environment: "PRODUCTION", endpointType: null, projectPriority: "URGENT", clientId: null, severity: "CRITICAL" as const, enabled: true }, { id: "3", name: "", environment: "STAGING", endpointType: null, projectPriority: null, clientId: null, severity: "LOW" as const, enabled: true }];
    expect(resolveSeverity(rules, base)).toBe("HIGH");
    expect(resolveSeverity(rules, { ...base, project: { ...base.project, priority: "URGENT" } })).toBe("CRITICAL");
    expect(resolveSeverity(rules, { ...base, endpoint: { ...base.endpoint, environment: "STAGING" } })).toBe("LOW");
    expect(resolveSeverity(rules, { ...base, endpoint: { ...base.endpoint, environment: "DEMO" } })).toBe("MEDIUM");
    expect(resolveSeverity(rules, { ...base, incidentSeverity: "INFO" })).toBe("INFO");
  });
  it("uptime documentado: mantenimiento excluido o incluido según política", () => {
    const checks = [{ success: true, inMaintenance: false }, { success: false, inMaintenance: true }, { success: true, inMaintenance: false }, { success: false, inMaintenance: false }];
    expect(uptimeOf(checks, "EXCLUDE").percentage).toBeCloseTo(66.6667, 3);
    expect(uptimeOf(checks, "INCLUDE").percentage).toBe(50);
    expect(uptimeOf([], "EXCLUDE").percentage).toBeNull();
  });
  it("MTTA, MTTR y downtime con nombres y fórmulas distintas", () => {
    const at = (min: number) => new Date(Date.UTC(2026, 9, 1, 16, min)).toISOString();
    const metrics = incidentMetrics([
      { confirmedAt: at(0), acknowledgedAt: at(4), resolvedAt: at(30), downtimeSeconds: 600, reopenedCount: 0, status: "RESOLVED" },
      { confirmedAt: at(0), acknowledgedAt: at(10), resolvedAt: null, downtimeSeconds: null, reopenedCount: 0, status: "INVESTIGATING" },
      { confirmedAt: at(0), acknowledgedAt: at(50), resolvedAt: at(60), downtimeSeconds: 1200, reopenedCount: 1, status: "RESOLVED" },
    ]);
    expect(metrics).toMatchObject({ mttaSeconds: 420, mttaSamples: 2, mttrSeconds: 2700, mttrSamples: 2, meanDowntimeSeconds: 900, totalDowntimeSeconds: 1800 });
  });
  it("percentiles iguales a percentile_cont y formato de duración", () => {
    expect(percentile([100, 200, 300, 400], 0.5)).toBe(250);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.95)).toBeCloseTo(95.5, 9);
    expect([formatDuration(420), formatDuration(6120), formatDuration(45), formatDuration(90_000)]).toEqual(["7 min", "1 h 42 min", "45 s", "1 d 1 h"]);
  });
});

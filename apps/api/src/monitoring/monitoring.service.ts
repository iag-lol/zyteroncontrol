import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type {
  AlertRule, ClientMonitoringSummary, Incident, IncidentDetail, IncidentStatus, MaintenanceWindow, MonitorConfig, MonitoringDashboard,
  MonitoringMonthlyReport, MonitorView, UptimeBucket,
} from "@zyteron/contracts/monitoring";
import { alertChannels, alertTargets, endpointEnvironments, endpointTypes, executableMonitorTypes, incidentSeverities, monitorIntervals } from "@zyteron/contracts/monitoring";
import { uuidPattern } from "../commercial/commercial.validation.js";
import { UsersDirectoryService } from "../users/users.module.js";
import { MonitoringAlerts } from "./monitoring.alerts.js";
import { activeStatuses, formatDuration, incidentTransitions, severityRank } from "./monitoring.engine.js";
import { santiagoDate, santiagoDateTime, toCsv } from "./monitoring.format.js";
import { hasFleetScope, hasMonitoringPermission, scopeFor, type MonitoringPermission } from "./monitoring.rbac.js";
import { MonitoringRunner } from "./monitoring.runner.js";
import { LEASE_SECONDS, MonitoringScheduler } from "./monitoring.scheduler.js";
import { incidentMetrics } from "./monitoring.stats.js";
import { defaultEscalationPolicy, defaultMonitorConfig, defaultNotifyEvents, MONITORING_STORE, MonitoringError, type IncidentFilter, type MonitoringStore } from "./monitoring.store.js";
import type { IncidentPatch } from "./monitoring.types.js";
import { assertMonitorTarget, configuredAllowedPorts, publicAddressPolicy, SsrfError, systemResolver, type Resolver } from "./ssrf-guard.js";

export const MONITORING_RESOLVER = Symbol("MONITORING_RESOLVER");
export interface MonitoringActor { userId: string | null; role: string }

export function monitoringActor(headers: Record<string, string | undefined>): MonitoringActor {
  const userId = headers["x-zyteron-user-id"];
  return { userId: userId && uuidPattern.test(userId) ? userId : null, role: headers["x-zyteron-role"] || "" };
}

const text = (value: unknown, label: string, max = 500, min = 1) => {
  if (typeof value !== "string" || value.trim().length < min) throw new BadRequestException(`${label} es obligatorio${min > 1 ? ` (mínimo ${min} caracteres)` : ""}.`);
  if (value.trim().length > max) throw new BadRequestException(`${label} excede ${max} caracteres.`);
  return value.trim();
};
const optionalText = (value: unknown, label: string, max = 2000) => value === undefined || value === null || value === "" ? null : text(value, label, max);
const uuid = (value: unknown, label: string) => { if (typeof value !== "string" || !uuidPattern.test(value)) throw new BadRequestException(`${label} inválido.`); return value; };
const optionalUuid = (value: unknown, label: string) => value === undefined || value === null || value === "" ? null : uuid(value, label);
const int = (value: unknown, label: string, min: number, max: number) => { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new BadRequestException(`${label} debe estar entre ${min} y ${max}.`); return parsed; };
const oneOf = <T extends string>(value: unknown, options: readonly T[], label: string) => { if (!options.includes(value as T)) throw new BadRequestException(`${label} no válido.`); return value as T; };
const iso = (value: unknown, label: string) => { const date = new Date(String(value)); if (!value || Number.isNaN(date.getTime())) throw new BadRequestException(`${label} inválida.`); return date.toISOString(); };
const containsIp = (value: string) => /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value) || /\b[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){3,7}\b/i.test(value);
const periodHours: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };
const endpointResponsibleRoles = new Set(["PROGRAMADOR", "DESARROLLO", "TECH_LEAD", "JEFE_DESARROLLO", "OPERACIONES", "SOPORTE_TECNICO"]);

export function normalizeMonitorUrl(raw: string) {
  const trimmed = raw.trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

@Injectable()
export class MonitoringService {
  private readonly manualRate = new Map<string, number[]>();
  private readonly taskKeys = new Map<string, { taskId: string; at: number }>();
  constructor(
    @Inject(MONITORING_STORE) private readonly store: MonitoringStore,
    private readonly runner: MonitoringRunner,
    private readonly alerts: MonitoringAlerts,
    @Inject(MONITORING_RESOLVER) private readonly resolver: Resolver,
    @Optional() private readonly directory?: UsersDirectoryService,
    @Optional() private readonly scheduler?: MonitoringScheduler,
  ) {}

  // ---------------------------------------------------------------- acceso
  require(actor: MonitoringActor, ...permissions: MonitoringPermission[]) {
    if (!permissions.some((permission) => hasMonitoringPermission(actor.role, permission))) throw new ForbiddenException("Tu rol no tiene permiso para esta acción de monitoreo.");
  }
  /** null = toda la operación; [] = sin proyectos. Nunca depende del sidebar. */
  async projectScope(actor: MonitoringActor): Promise<string[] | null> {
    if (hasFleetScope(actor.role)) return null;
    if (!actor.userId) return [];
    return this.store.projectIdsForUser(actor.userId);
  }
  async assertProject(actor: MonitoringActor, projectId: string) {
    const scope = await this.projectScope(actor);
    if (scope && !scope.includes(projectId)) throw new ForbiddenException("No tienes acceso a este proyecto.");
  }
  private async assertMonitoringScope(actor: MonitoringActor, projectId: string | null) {
    if (projectId) return this.assertProject(actor, projectId);
    if (!hasFleetScope(actor.role)) throw new ForbiddenException("Sólo gerencia, jefaturas y operaciones pueden acceder a monitores sin proyecto.");
  }
  private async monitorFor(actor: MonitoringActor, id: string) {
    const monitor = await this.store.getMonitor(uuid(id, "Monitor"));
    if (!monitor) throw new NotFoundException("Monitor no encontrado.");
    await this.assertMonitoringScope(actor, monitor.projectId);
    return monitor;
  }
  private async incidentFor(actor: MonitoringActor, id: string) {
    const incident = await this.store.getIncident(uuid(id, "Incidente"));
    if (!incident) throw new NotFoundException("Incidente no encontrado.");
    await this.assertMonitoringScope(actor, incident.projectId);
    return incident;
  }
  me(actor: MonitoringActor) { this.require(actor, "monitoring.dashboard.view", "monitoring.summary.view"); return scopeFor(actor.role); }

  // ---------------------------------------------------------------- configuración de monitores
  private parseConfig(body: Record<string, unknown>, base: MonitorConfig): Partial<MonitorConfig> {
    const out: Partial<MonitorConfig> = {};
    if (body.monitorType !== undefined && !executableMonitorTypes.includes(body.monitorType as never)) throw new BadRequestException(`El tipo ${String(body.monitorType)} aún no tiene ejecutor real; sólo HTTP/HTTPS están disponibles.`);
    if (body.intervalSeconds !== undefined) { if (!monitorIntervals.includes(Number(body.intervalSeconds) as never)) throw new BadRequestException("Intervalo no permitido: 1, 5, 10, 15, 30 o 60 min."); out.intervalSeconds = Number(body.intervalSeconds) as MonitorConfig["intervalSeconds"]; }
    if (body.timeoutMs !== undefined) out.timeoutMs = int(body.timeoutMs, "Timeout (ms)", 1000, 30_000);
    if (body.httpMethod !== undefined) out.httpMethod = oneOf(body.httpMethod, ["GET", "HEAD"] as const, "Método HTTP");
    if (typeof body.expectedStatus === "string") {
      const match = /^(\d{3})(?:\s*-\s*(\d{3}))?$/.exec(body.expectedStatus.trim());
      if (!match) throw new BadRequestException("Expected status debe ser 200 o un rango como 200-299.");
      out.expectedStatusMin = Number(match[1]); out.expectedStatusMax = Number(match[2] ?? match[1]);
    }
    if (body.expectedStatusMin !== undefined) out.expectedStatusMin = int(body.expectedStatusMin, "Status mínimo", 100, 599);
    if (body.expectedStatusMax !== undefined) out.expectedStatusMax = int(body.expectedStatusMax, "Status máximo", 100, 599);
    if (body.expectedContent !== undefined) out.expectedContent = optionalText(body.expectedContent, "Contenido esperado", 200);
    if (body.followRedirects !== undefined) out.followRedirects = Boolean(body.followRedirects);
    if (body.maxRedirects !== undefined) out.maxRedirects = int(body.maxRedirects, "Máximo de redirecciones", 0, 5);
    if (body.failureThreshold !== undefined) out.failureThreshold = int(body.failureThreshold, "Umbral de fallas", 1, 10);
    if (body.recoveryThreshold !== undefined) out.recoveryThreshold = int(body.recoveryThreshold, "Umbral de recuperación", 1, 10);
    if (body.sslMonitoringEnabled !== undefined) out.sslMonitoringEnabled = Boolean(body.sslMonitoringEnabled);
    if (body.warningLatencyMs !== undefined) out.warningLatencyMs = body.warningLatencyMs === null || body.warningLatencyMs === "" ? null : int(body.warningLatencyMs, "Latencia de advertencia", 50, 60_000);
    if (body.criticalLatencyMs !== undefined) out.criticalLatencyMs = body.criticalLatencyMs === null || body.criticalLatencyMs === "" ? null : int(body.criticalLatencyMs, "Latencia crítica", 50, 60_000);
    if (body.incidentSeverity !== undefined) out.incidentSeverity = body.incidentSeverity === null || body.incidentSeverity === "" ? null : oneOf(body.incidentSeverity, incidentSeverities, "Severidad");
    if (body.maintenanceMode !== undefined) out.maintenanceMode = oneOf(body.maintenanceMode, ["CHECK_AND_SUPPRESS", "PAUSE_CHECKS"] as const, "Política de mantenimiento");
    if (body.alertRuleId !== undefined) out.alertRuleId = optionalUuid(body.alertRuleId, "Regla de alerta");
    if (body.clientVisibility !== undefined) out.clientVisibility = oneOf(body.clientVisibility, ["INTERNAL", "CLIENT_VISIBLE"] as const, "Visibilidad");
    const merged = { ...base, ...out };
    if (merged.expectedStatusMin > merged.expectedStatusMax) throw new BadRequestException("El status mínimo no puede superar al máximo.");
    if (merged.timeoutMs >= merged.intervalSeconds * 1000) throw new BadRequestException("El timeout debe ser menor que el intervalo.");
    if (merged.warningLatencyMs && merged.criticalLatencyMs && merged.warningLatencyMs >= merged.criticalLatencyMs) throw new BadRequestException("La latencia de advertencia debe ser menor que la crítica.");
    if (merged.expectedContent && merged.httpMethod !== "GET") throw new BadRequestException("El content check requiere método GET.");
    return out;
  }
  private async validateTarget(url: string) {
    try { return await assertMonitorTarget(normalizeMonitorUrl(url), this.resolver, publicAddressPolicy, configuredAllowedPorts()); }
    catch (error) { if (error instanceof SsrfError) throw new BadRequestException(`URL rechazada por la política de seguridad: ${error.message}`); throw error; }
  }
  private async validateResponsible(projectId: string | null, responsibleUserId: string | null) {
    if (!responsibleUserId || !this.directory) return;
    const selected = (await this.directory.list()).find((user) => user.id === responsibleUserId && user.active);
    if (!selected || !selected.role || !endpointResponsibleRoles.has(selected.role)) throw new BadRequestException("El responsable debe ser un usuario activo de Desarrollo u Operaciones.");
    if (projectId && ["PROGRAMADOR", "DESARROLLO", "TECH_LEAD", "SOPORTE_TECNICO"].includes(selected.role)) {
      const members = await this.store.projectMemberIds(projectId);
      if (!members.includes(selected.id)) throw new BadRequestException("El responsable técnico debe pertenecer al proyecto seleccionado.");
    }
  }

  async listMonitors(actor: MonitoringActor, query: Record<string, string | undefined>) {
    this.require(actor, "monitor.view");
    return this.store.listMonitors({ projectIds: await this.projectScope(actor), projectId: query.projectId, clientId: query.clientId, status: query.status, environment: query.environment, responsibleUserId: query.responsibleUserId, search: query.search });
  }
  async getMonitor(actor: MonitoringActor, id: string) { this.require(actor, "monitor.view"); return this.monitorFor(actor, id); }

  /** Registra (o reutiliza) un endpoint con cliente y proyecto opcional, con validación SSRF previa. */
  async createMonitor(actor: MonitoringActor, body: Record<string, unknown>) {
    this.require(actor, "monitor.create");
    let endpointId = optionalUuid(body.endpointId, "Endpoint");
    let url: URL;
    if (endpointId) {
      const endpoint = await this.store.getEndpoint(endpointId);
      if (!endpoint) throw new NotFoundException("Endpoint no encontrado.");
      await this.assertMonitoringScope(actor, endpoint.projectId);
      await this.validateResponsible(endpoint.projectId, endpoint.responsibleUserId);
      url = await this.validateTarget(endpoint.url);
    } else {
      const projectId = optionalUuid(body.projectId, "Proyecto");
      const clientId = optionalUuid(body.clientId, "Cliente");
      if (!projectId && !clientId) throw new BadRequestException("Selecciona un cliente; el proyecto es opcional.");
      await this.assertMonitoringScope(actor, projectId);
      if (projectId && !(await this.store.getProject(projectId))) throw new NotFoundException("Proyecto no encontrado.");
      url = await this.validateTarget(text(body.url, "URL", 2048));
      const responsibleUserId = optionalUuid(body.responsibleUserId, "Responsable");
      await this.validateResponsible(projectId, responsibleUserId);
      const existing = (await this.store.listEndpoints(null, projectId ?? undefined)).find((endpoint) => endpoint.projectId === projectId && endpoint.clientId === (projectId ? endpoint.clientId : clientId) && endpoint.url.replace(/\/$/, "").toLowerCase() === url.toString().replace(/\/$/, "").toLowerCase());
      endpointId = existing?.id ?? (await this.store.createEndpoint(projectId, {
        clientId: projectId ? undefined : clientId,
        name: text(body.name, "Nombre", 120), url: url.toString(), environment: oneOf(body.environment ?? "PRODUCTION", endpointEnvironments, "Ambiente"),
        endpointType: oneOf(body.endpointType ?? "WEB", endpointTypes, "Tipo de endpoint"), monitoringEnabled: true, responsibleUserId,
      })).id;
    }
    const monitorType = url.protocol === "https:" ? "HTTPS" : "HTTP";
    const config: MonitorConfig = { ...defaultMonitorConfig, ...this.parseConfig(body, { ...defaultMonitorConfig, monitorType }), monitorType, enabled: body.enabled === undefined ? true : Boolean(body.enabled), sslMonitoringEnabled: monitorType === "HTTPS" && (body.sslMonitoringEnabled === undefined ? true : Boolean(body.sslMonitoringEnabled)) };
    if (config.alertRuleId && !(await this.store.listAlertRules()).some((rule) => rule.id === config.alertRuleId)) throw new BadRequestException("Regla de alerta no encontrada.");
    let monitor: MonitorView;
    try { monitor = await this.store.createMonitor(endpointId, config, actor.userId); }
    catch (error) { if (error instanceof MonitoringError && error.code === "MONITOR_BUSY") throw new ConflictException(error.message); throw error; }
    await this.store.publishEvents({ projectId: monitor.projectId, clientId: monitor.clientId, endpointId: monitor.endpointId, monitorId: monitor.id, incidentId: null }, [{ eventType: "MONITOR_CREATED", tone: "INFO", title: `Monitor ${monitor.monitorType} creado para ${monitor.endpointName}.`, actorId: actor.userId, payload: { intervalSeconds: monitor.intervalSeconds } }], []);
    return monitor;
  }

  async updateMonitor(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "monitor.edit");
    const monitor = await this.monitorFor(actor, id);
    if (body.enabled !== undefined) throw new BadRequestException("Usa enable/disable para cambiar el estado del monitor.");
    if (body.url !== undefined || body.name !== undefined || body.environment !== undefined || body.endpointType !== undefined || body.responsibleUserId !== undefined) {
      this.require(actor, "endpoint.manage");
      const patch: Record<string, unknown> = {};
      if (body.url !== undefined) { const url = await this.validateTarget(text(body.url, "URL", 2048)); if ((url.protocol === "https:" ? "HTTPS" : "HTTP") !== monitor.monitorType) throw new BadRequestException("Cambiar entre HTTP y HTTPS requiere crear un monitor nuevo."); patch.url = url.toString(); }
      if (body.name !== undefined) patch.name = text(body.name, "Nombre", 120);
      if (body.environment !== undefined) patch.environment = oneOf(body.environment, endpointEnvironments, "Ambiente");
      if (body.endpointType !== undefined) patch.endpointType = oneOf(body.endpointType, endpointTypes, "Tipo de endpoint");
      if (body.responsibleUserId !== undefined) { const responsibleUserId = optionalUuid(body.responsibleUserId, "Responsable"); await this.validateResponsible(monitor.projectId, responsibleUserId); patch.responsibleUserId = responsibleUserId; }
      await this.store.updateEndpoint(monitor.endpointId, patch);
    }
    return this.store.updateMonitor(monitor.id, this.parseConfig(body, monitor));
  }
  async setEnabled(actor: MonitoringActor, id: string, enabled: boolean) {
    this.require(actor, "monitor.disable");
    const monitor = await this.monitorFor(actor, id);
    if (enabled) await this.validateTarget(monitor.url);
    const next = await this.store.setMonitorEnabled(monitor.id, enabled);
    await this.store.publishEvents({ projectId: monitor.projectId, clientId: monitor.clientId, endpointId: monitor.endpointId, monitorId: monitor.id, incidentId: null }, [{ eventType: enabled ? "MONITOR_ENABLED" : "MONITOR_DISABLED", tone: enabled ? "INFO" : "WARNING", title: `Monitor de ${monitor.endpointName} ${enabled ? "habilitado" : "deshabilitado"}.`, actorId: actor.userId }], []);
    return next;
  }

  /** CHECK NOW: permisos, alcance, cooldown por monitor, límite por usuario y la misma política SSRF del worker. */
  async checkNow(actor: MonitoringActor, id: string) {
    this.require(actor, "monitor.view");
    const monitor = await this.monitorFor(actor, id);
    const key = actor.userId ?? `role:${actor.role}`, now = Date.now(), recent = (this.manualRate.get(key) ?? []).filter((at) => now - at < 60_000);
    if (recent.length >= 10) throw new HttpException("Límite de comprobaciones manuales alcanzado (10 por minuto).", HttpStatus.TOO_MANY_REQUESTS);
    this.manualRate.set(key, [...recent, now]);
    const settings = await this.store.getSettings();
    const worker = `manual:${actor.userId ?? actor.role}`;
    let execution;
    try { execution = await this.store.claimMonitor(monitor.id, worker, LEASE_SECONDS, settings.manualCheckCooldownSeconds); }
    catch (error) {
      if (error instanceof MonitoringError && error.code === "MONITOR_COOLDOWN") throw new HttpException(`Espera ${settings.manualCheckCooldownSeconds} s entre comprobaciones manuales.`, HttpStatus.TOO_MANY_REQUESTS);
      if (error instanceof MonitoringError && error.code === "MONITOR_BUSY") throw new ConflictException("Hay una comprobación en curso para este monitor.");
      if (error instanceof MonitoringError && error.code === "MONITOR_DISABLED") throw new ConflictException("El monitor está deshabilitado.");
      throw error;
    }
    try {
      const report = await this.runner.execute(execution, "MANUAL", worker);
      return { result: report.result, status: report.decision.state.status, statusReason: report.decision.state.statusReason, incidentId: report.applied.incidentId, incidentNumber: report.applied.incidentNumber, monitor: await this.store.getMonitor(monitor.id) };
    } catch (error) { await this.store.releaseLease(monitor.id, worker, 0).catch(() => undefined); throw error; }
  }

  async listChecks(actor: MonitoringActor, id: string, query: Record<string, string | undefined>) {
    this.require(actor, "monitor.view");
    const monitor = await this.monitorFor(actor, id);
    return this.store.listChecks(monitor.id, { page: Math.max(1, Number(query.page) || 1), pageSize: Math.min(100, Math.max(1, Number(query.pageSize) || 25)), success: query.result === "success" ? true : query.result === "failure" ? false : undefined, statusCode: query.statusCode ? Number(query.statusCode) : undefined, from: query.from ? iso(query.from, "Fecha desde") : undefined, to: query.to ? iso(query.to, "Fecha hasta") : undefined });
  }
  async stats(actor: MonitoringActor, id: string) {
    this.require(actor, "monitor.view");
    const monitor = await this.monitorFor(actor, id);
    const now = Date.now();
    const [stats, hourly, daily, incidents] = await Promise.all([
      this.store.monitorStats(monitor.id), this.store.buckets([monitor.id], "hour", new Date(now - 24 * 3_600_000).toISOString()), this.store.buckets([monitor.id], "day", new Date(now - 90 * 86_400_000).toISOString()),
      this.store.listIncidents({ projectIds: null, monitorId: monitor.id, state: "all", page: 1, pageSize: 50, from: new Date(now - 90 * 86_400_000).toISOString() }),
    ]);
    return { stats, hourly: hourly[monitor.id] ?? [], daily: daily[monitor.id] ?? [], incidents: incidents.items };
  }

  async endpointDetail(actor: MonitoringActor, id: string) {
    this.require(actor, "endpoint.view");
    const endpoint = await this.store.getEndpoint(uuid(id, "Endpoint"));
    if (!endpoint) throw new NotFoundException("Endpoint no encontrado.");
    await this.assertMonitoringScope(actor, endpoint.projectId);
    const [monitors, maintenance, incidents] = await Promise.all([
      this.store.listMonitors({ projectIds: null, endpointId: endpoint.id }),
      endpoint.projectId ? this.store.listMaintenance({ projectIds: null, projectId: endpoint.projectId, from: new Date(Date.now() - 30 * 86_400_000).toISOString() }) : Promise.resolve([]),
      this.store.listIncidents({ projectIds: null, endpointId: endpoint.id, state: "all", page: 1, pageSize: 20 }),
    ]);
    return { endpoint, monitors, maintenance: maintenance.filter((window) => !window.endpointId || window.endpointId === endpoint.id), incidents: incidents.items };
  }

  // ---------------------------------------------------------------- incidentes
  async listIncidents(actor: MonitoringActor, query: Record<string, string | undefined>) {
    this.require(actor, "incident.view");
    const filter: IncidentFilter = { projectIds: await this.projectScope(actor), state: (["open", "closed", "all"].includes(query.state ?? "") ? query.state : "all") as IncidentFilter["state"], status: query.status, severity: query.severity, projectId: query.projectId, clientId: query.clientId, monitorId: query.monitorId, assignedTo: query.assignedTo === "me" ? actor.userId ?? undefined : query.assignedTo, from: query.from ? iso(query.from, "Fecha desde") : undefined, to: query.to ? iso(query.to, "Fecha hasta") : undefined, page: Math.max(1, Number(query.page) || 1), pageSize: Math.min(100, Math.max(1, Number(query.pageSize) || 25)) };
    return this.store.listIncidents(filter);
  }

  allowedTransitions(actor: MonitoringActor, incident: Incident): IncidentStatus[] {
    if (!hasMonitoringPermission(actor.role, "incident.manage")) return [];
    return incidentTransitions[incident.status];
  }

  async getIncident(actor: MonitoringActor, id: string): Promise<IncidentDetail> {
    this.require(actor, "incident.view");
    const incident = await this.incidentFor(actor, id);
    const windowStart = new Date(new Date(incident.detectedAt).getTime() - 30 * 60_000).toISOString();
    const windowEnd = incident.recoveredAt ?? incident.resolvedAt ?? new Date().toISOString();
    const [events, links, checks, deployments, monitor] = await Promise.all([
      this.store.incidentEvents(incident.id), this.store.incidentLinks(incident.id),
      incident.monitorId ? this.store.checksBetween(incident.monitorId, windowStart, new Date(new Date(windowEnd).getTime() + 10 * 60_000).toISOString(), 60) : Promise.resolve([]),
      incident.projectId ? this.store.recentDeployments(incident.projectId, incident.detectedAt, 5) : Promise.resolve([]),
      incident.monitorId ? this.store.getMonitor(incident.monitorId) : Promise.resolve(undefined),
    ]);
    // Contexto, no causalidad: se listan deployments de las 48 h previas a la primera falla.
    const context = deployments.filter((item) => new Date(incident.detectedAt).getTime() - new Date(item.completedAt ?? item.createdAt).getTime() <= 48 * 3_600_000)
      .map((item) => ({ id: item.id, environment: item.environment, version: item.version, status: item.status, recordType: item.recordType, startedAt: item.startedAt, completedAt: item.completedAt, createdAt: item.createdAt, minutesBeforeDetection: Math.round((new Date(incident.detectedAt).getTime() - new Date(item.completedAt ?? item.createdAt).getTime()) / 60_000) }));
    return { incident, events, links, recentChecks: checks, deployments: context, monitor: monitor ?? null, allowedTransitions: this.allowedTransitions(actor, incident) };
  }

  private async mutate(incident: Incident, patch: IncidentPatch, events: Parameters<MonitoringStore["mutateIncident"]>[3], monitoringEvents: Parameters<MonitoringStore["mutateIncident"]>[4], outbox: Parameters<MonitoringStore["mutateIncident"]>[5]) {
    const next = await this.store.mutateIncident(incident.id, incident.status, patch, events, monitoringEvents, outbox);
    if (!next) throw new ConflictException("El incidente cambió mientras lo editabas. Recarga e intenta nuevamente.");
    return next;
  }

  async acknowledge(actor: MonitoringActor, id: string) {
    this.require(actor, "incident.acknowledge");
    const incident = await this.incidentFor(actor, id);
    if (!activeStatuses.has(incident.status)) throw new ConflictException("Sólo se reconocen incidentes activos.");
    if (incident.acknowledgedAt) throw new ConflictException("El incidente ya fue reconocido.");
    const now = new Date().toISOString(), toStatus: IncidentStatus = ["DETECTED", "CONFIRMED"].includes(incident.status) ? "ACKNOWLEDGED" : incident.status;
    return this.mutate(incident, { status: toStatus, acknowledged_at: now, acknowledged_by: actor.userId, ...(incident.assignedTo ? {} : actor.userId ? { assigned_to: actor.userId, assigned_at: now } : {}) },
      [{ eventType: "ACKNOWLEDGED", fromStatus: incident.status, toStatus, actorId: actor.userId, actorType: "USER", message: `Reconocido tras ${formatDuration((Date.parse(now) - Date.parse(incident.confirmedAt ?? incident.detectedAt)) / 1000)}.` }],
      [{ eventType: "INCIDENT_ACKNOWLEDGED", tone: "INFO", title: `Incidente {incidentNumber} reconocido.`, actorId: actor.userId }],
      [{ eventType: "INCIDENT_ACKNOWLEDGED", payload: { acknowledgedBy: actor.userId } }]);
  }

  async assign(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "incident.assign");
    const incident = await this.incidentFor(actor, id);
    if (incident.status === "CLOSED") throw new ConflictException("El incidente está cerrado.");
    const userId = uuid(body.userId, "Responsable");
    if (userId === incident.assignedTo) throw new ConflictException("El incidente ya está asignado a esa persona.");
    const next = await this.mutate(incident, { assigned_to: userId, assigned_at: new Date().toISOString() },
      [{ eventType: "ASSIGNED", actorId: actor.userId, actorType: "USER", message: optionalText(body.note, "Nota", 500) ?? "Reasignación manual.", metadata: { from: incident.assignedTo, to: userId } }],
      [{ eventType: "INCIDENT_ASSIGNED", tone: "INFO", title: `Incidente {incidentNumber} reasignado.`, actorId: actor.userId, payload: { assignedTo: userId } }], []);
    await this.alerts.dispatchIncident("INCIDENT_ASSIGNED", next, incident.monitorId ? (await this.store.getMonitor(incident.monitorId)) ?? null : null).catch((error) => this.alerts.logError("Alertas", error));
    return next;
  }

  async changeStatus(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "incident.manage");
    const incident = await this.incidentFor(actor, id);
    const status = oneOf(body.status, ["CONFIRMED", "ACKNOWLEDGED", "INVESTIGATING", "MITIGATING", "MONITORING"] as const, "Estado");
    if (!incidentTransitions[incident.status].includes(status)) throw new BadRequestException(`Transición no permitida: ${incident.status} → ${status}.`);
    const note = optionalText(body.note, "Nota", 1000), now = new Date().toISOString();
    const reopening = incident.status === "RESOLVED";
    const patch: IncidentPatch = { status, ...(incident.acknowledgedAt || status === "CONFIRMED" ? {} : { acknowledged_at: now, acknowledged_by: actor.userId }), ...(reopening ? { resolved_at: null, resolved_by: null, reopened_count: incident.reopenedCount + 1, last_reopened_at: now } : {}) };
    return this.mutate(incident, patch,
      [{ eventType: reopening ? "REOPENED" : "STATUS_CHANGED", fromStatus: incident.status, toStatus: status, actorId: actor.userId, actorType: "USER", message: note }],
      [{ eventType: reopening ? "INCIDENT_REOPENED" : "INCIDENT_STATUS_CHANGED", tone: reopening ? "CRITICAL" : "INFO", title: reopening ? "Incidente {incidentNumber} reabierto manualmente." : `Incidente {incidentNumber}: ${incident.status} → ${status}.`, actorId: actor.userId }], []);
  }

  async resolve(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "incident.resolve");
    const incident = await this.incidentFor(actor, id);
    if (!activeStatuses.has(incident.status)) throw new ConflictException("El incidente no está activo.");
    const monitor = incident.monitorId ? await this.store.getMonitor(incident.monitorId) : undefined;
    if (monitor && monitor.enabled && monitor.consecutiveFailures >= monitor.failureThreshold) throw new ConflictException("El endpoint sigue fallando; espera la recuperación confirmada antes de resolver.");
    const resolution = text(body.resolution, "Resolución", 4000, 10), now = new Date().toISOString();
    const toStatus: IncidentStatus = incident.postmortemRequired ? "POSTMORTEM_REQUIRED" : "RESOLVED";
    const openOutage = incident.currentOutageStartedAt ? Math.max(0, (Date.parse(now) - Date.parse(incident.currentOutageStartedAt)) / 1000) : 0;
    const next = await this.mutate(incident, { status: toStatus, resolved_at: now, resolved_by: actor.userId, resolution, root_cause: optionalText(body.rootCause, "Causa raíz", 4000) ?? incident.rootCause, ...(incident.currentOutageStartedAt ? { current_outage_started_at: null, downtime_seconds: Math.round((incident.downtimeSeconds ?? 0) + openOutage), recovered_at: incident.recoveredAt ?? now } : {}), ...(incident.acknowledgedAt ? {} : { acknowledged_at: now, acknowledged_by: actor.userId }) },
      [{ eventType: "RESOLVED", fromStatus: incident.status, toStatus, actorId: actor.userId, actorType: "USER", message: resolution }],
      [{ eventType: "INCIDENT_RESOLVED", tone: "SUCCESS", title: `Incidente {incidentNumber} resuelto${toStatus === "POSTMORTEM_REQUIRED" ? "; postmortem pendiente" : ""}.`, actorId: actor.userId }],
      [{ eventType: "INCIDENT_RESOLVED", payload: { resolvedBy: actor.userId } }]);
    await this.alerts.dispatchIncident("INCIDENT_RESOLVED", next, monitor ?? null).catch((error) => this.alerts.logError("Alertas", error));
    return next;
  }

  async updatePostmortem(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "incident.manage");
    const incident = await this.incidentFor(actor, id);
    if (incident.status === "CLOSED") throw new ConflictException("El incidente está cerrado.");
    const fields = { root_cause: body.rootCause, impact: body.impact, resolution: body.resolution, preventive_actions: body.preventiveActions };
    const patch: IncidentPatch = {};
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) patch[key as keyof IncidentPatch] = optionalText(value, key, 4000);
    const merged = { rootCause: patch.root_cause ?? incident.rootCause, impact: patch.impact ?? incident.impact, resolution: patch.resolution ?? incident.resolution, preventiveActions: patch.preventive_actions ?? incident.preventiveActions };
    const complete = Object.values(merged).every((value) => typeof value === "string" && value.trim().length >= 10);
    patch.postmortem_completed_at = complete ? incident.postmortemCompletedAt ?? new Date().toISOString() : null;
    return this.mutate(incident, patch, [{ eventType: "POSTMORTEM_UPDATED", actorId: actor.userId, actorType: "USER", message: complete ? "Postmortem completo." : "Postmortem actualizado (incompleto).", metadata: { fields: Object.keys(patch) } }], [], []);
  }

  async close(actor: MonitoringActor, id: string) {
    this.require(actor, "incident.resolve");
    const incident = await this.incidentFor(actor, id);
    if (!["RESOLVED", "POSTMORTEM_REQUIRED"].includes(incident.status)) throw new ConflictException("Sólo se cierran incidentes resueltos.");
    if (incident.postmortemRequired && !incident.postmortemCompletedAt) throw new ConflictException("Completa el postmortem (causa raíz, impacto, resolución y acciones preventivas) antes de cerrar.");
    return this.mutate(incident, { status: "CLOSED", closed_at: new Date().toISOString(), closed_by: actor.userId },
      [{ eventType: "CLOSED", fromStatus: incident.status, toStatus: "CLOSED", actorId: actor.userId, actorType: "USER" }],
      [{ eventType: "INCIDENT_CLOSED", tone: "INFO", title: "Incidente {incidentNumber} cerrado.", actorId: actor.userId }], []);
  }

  async comment(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "incident.acknowledge", "incident.manage");
    const incident = await this.incidentFor(actor, id);
    // Las notas son siempre internas; el texto para cliente se gestiona en client_summary.
    const message = text(body.body, "Nota", 4000);
    const next = await this.store.mutateIncident(incident.id, null, {}, [{ eventType: "COMMENT", actorId: actor.userId, actorType: "USER", message, visibility: "INTERNAL" }], [], []);
    if (!next) throw new ConflictException("No fue posible registrar la nota.");
    return this.store.incidentEvents(incident.id);
  }

  async setVisibility(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "incident.assign");
    const incident = await this.incidentFor(actor, id);
    const clientVisibility = oneOf(body.clientVisibility, ["INTERNAL", "CLIENT_VISIBLE"] as const, "Visibilidad");
    const clientSummary = optionalText(body.clientSummary, "Resumen para cliente", 500);
    if (clientVisibility === "CLIENT_VISIBLE" && !clientSummary) throw new BadRequestException("Un incidente visible para el cliente requiere un resumen redactado para cliente.");
    if (clientSummary && containsIp(clientSummary)) throw new BadRequestException("El resumen para cliente no puede incluir direcciones IP ni datos de infraestructura.");
    return this.mutate(incident, { client_visibility: clientVisibility, client_summary: clientSummary },
      [{ eventType: "VISIBILITY_CHANGED", actorId: actor.userId, actorType: "USER", message: clientVisibility === "CLIENT_VISIBLE" ? "Visible para el cliente con resumen autorizado." : "Visibilidad interna.", metadata: { clientVisibility } }], [], []);
  }

  /** Tarea correctiva en Operaciones (tasks) vinculada al incidente; nunca crea monitoring_tasks. */
  async createTask(actor: MonitoringActor, id: string, body: Record<string, unknown>, idempotencyKey?: string) {
    this.require(actor, "incident.manage");
    const incident = await this.incidentFor(actor, id);
    if (!incident.projectId) throw new BadRequestException("Vincula el monitor a un proyecto antes de crear una tarea operativa.");
    const cacheKey = idempotencyKey ? `${incident.id}:${idempotencyKey}` : null;
    const cached = cacheKey ? this.taskKeys.get(cacheKey) : undefined;
    const previous = cached && Date.now() - cached.at < 600_000 ? await this.store.getTask(cached.taskId) : undefined;
    if (previous) return { task: previous, links: await this.store.incidentLinks(incident.id) };
    const priority = severityRank[incident.severity] >= severityRank.HIGH ? "URGENT" : incident.severity === "MEDIUM" ? "HIGH" : "NORMAL";
    const task = await this.store.createTask({
      projectId: incident.projectId, title: optionalText(body.title, "Título", 200) ?? `Corregir causa de ${incident.incidentNumber}: ${incident.title}`,
      description: `Tarea correctiva del incidente ${incident.incidentNumber} (${incident.severity}). ${incident.description ?? ""}`.trim(), status: "TODO",
      priority: (body.priority as never) ?? priority, assignedTo: optionalUuid(body.assignedTo, "Responsable") ?? incident.assignedTo, createdBy: actor.userId, clientVisibility: "INTERNAL",
      dueDate: body.dueDate ? String(body.dueDate).slice(0, 10) : null,
    });
    if (cacheKey) this.taskKeys.set(cacheKey, { taskId: task.id, at: Date.now() });
    await this.store.addIncidentLink({ incidentId: incident.id, linkType: "TASK", targetId: task.id, externalReference: null, createdBy: actor.userId });
    await this.store.mutateIncident(incident.id, null, {}, [{ eventType: "TASK_CREATED", actorId: actor.userId, actorType: "USER", message: task.title, metadata: { taskId: task.id } }], [{ eventType: "INCIDENT_TASK_CREATED", tone: "INFO", title: `Tarea correctiva creada para {incidentNumber}.`, actorId: actor.userId, payload: { taskId: task.id } }], []);
    return { task, links: await this.store.incidentLinks(incident.id) };
  }

  /** Integración desacoplada con Bugs de Desarrollo: guarda la referencia sin depender de sus tablas. */
  async linkBug(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "incident.manage");
    const incident = await this.incidentFor(actor, id);
    const bugId = optionalUuid(body.bugId, "Bug"), reference = optionalText(body.reference, "Referencia", 200);
    if (!bugId && !reference) throw new BadRequestException("Indica el identificador del bug o una referencia externa.");
    const link = await this.store.addIncidentLink({ incidentId: incident.id, linkType: "BUG", targetId: bugId, externalReference: reference, createdBy: actor.userId });
    await this.store.mutateIncident(incident.id, null, {}, [{ eventType: "BUG_LINKED", actorId: actor.userId, actorType: "USER", message: reference ?? bugId, metadata: { bugId, reference } }], [], []);
    return link;
  }

  // ---------------------------------------------------------------- mantenimiento
  async listMaintenance(actor: MonitoringActor, query: Record<string, string | undefined>) {
    this.require(actor, "maintenance.view");
    return this.store.listMaintenance({ projectIds: await this.projectScope(actor), projectId: query.projectId, clientId: query.clientId, status: query.status, from: query.from, to: query.to });
  }
  private validateWindow(startsAt: string, endsAt: string) {
    const start = Date.parse(startsAt), end = Date.parse(endsAt), now = Date.now();
    if (end <= start) throw new BadRequestException("El término debe ser posterior al inicio.");
    if (end <= now) throw new BadRequestException("La ventana ya terminó.");
    if (end - start > 14 * 86_400_000) throw new BadRequestException("Una ventana no puede durar más de 14 días.");
    if (start - now > 365 * 86_400_000) throw new BadRequestException("Sólo se pueden programar ventanas dentro de los próximos 12 meses.");
  }
  async createMaintenance(actor: MonitoringActor, body: Record<string, unknown>) {
    this.require(actor, "maintenance.create");
    const projectId = uuid(body.projectId, "Proyecto");
    await this.assertProject(actor, projectId);
    const endpointId = optionalUuid(body.endpointId, "Endpoint");
    if (endpointId) { const endpoint = await this.store.getEndpoint(endpointId); if (!endpoint || endpoint.projectId !== projectId) throw new BadRequestException("El endpoint debe pertenecer al proyecto."); }
    const startsAt = iso(body.startsAt, "Fecha de inicio"), endsAt = iso(body.endsAt, "Fecha de término");
    this.validateWindow(startsAt, endsAt);
    const clientVisibility = oneOf(body.clientVisibility ?? "INTERNAL", ["INTERNAL", "CLIENT_VISIBLE"] as const, "Visibilidad");
    const clientSummary = optionalText(body.clientSummary, "Resumen para cliente", 500);
    if (clientSummary && containsIp(clientSummary)) throw new BadRequestException("El resumen para cliente no puede incluir direcciones IP.");
    const window = await this.store.createMaintenance({ projectId, endpointId, title: text(body.title, "Título", 160), description: optionalText(body.description, "Descripción"), clientSummary, startsAt, endsAt, suppressAlerts: body.suppressAlerts === undefined ? true : Boolean(body.suppressAlerts), clientVisibility, createdBy: actor.userId });
    await this.store.publishEvents({ projectId, clientId: window.clientId, endpointId, monitorId: null, incidentId: null }, [{ eventType: "MAINTENANCE_SCHEDULED", tone: "INFO", title: `Ventana «${window.title}» programada ${santiagoDateTime(startsAt)} – ${santiagoDateTime(endsAt)}.`, actorId: actor.userId, maintenanceWindowId: window.id, visibility: clientVisibility }], []);
    return window;
  }
  private async windowFor(actor: MonitoringActor, id: string) {
    const window = await this.store.getMaintenance(uuid(id, "Ventana"));
    if (!window) throw new NotFoundException("Ventana de mantenimiento no encontrada.");
    await this.assertProject(actor, window.projectId);
    if (!hasMonitoringPermission(actor.role, "maintenance.manage") && !(hasMonitoringPermission(actor.role, "maintenance.create") && window.createdBy && window.createdBy === actor.userId)) throw new ForbiddenException("Sólo quien creó la ventana o un responsable de mantenimiento puede modificarla.");
    return window;
  }
  async updateMaintenance(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "maintenance.create", "maintenance.manage");
    const window = await this.windowFor(actor, id);
    if (!["PLANNED", "ACTIVE"].includes(window.status)) throw new ConflictException("Sólo se editan ventanas planificadas o activas.");
    const patch: Partial<MaintenanceWindow> = {};
    if (body.title !== undefined) patch.title = text(body.title, "Título", 160);
    if (body.description !== undefined) patch.description = optionalText(body.description, "Descripción");
    if (body.startsAt !== undefined) { if (window.status === "ACTIVE") throw new BadRequestException("No se puede mover el inicio de una ventana activa."); patch.startsAt = iso(body.startsAt, "Fecha de inicio"); }
    if (body.endsAt !== undefined) patch.endsAt = iso(body.endsAt, "Fecha de término");
    if (body.suppressAlerts !== undefined) patch.suppressAlerts = Boolean(body.suppressAlerts);
    if (body.clientVisibility !== undefined) patch.clientVisibility = oneOf(body.clientVisibility, ["INTERNAL", "CLIENT_VISIBLE"] as const, "Visibilidad");
    if (body.clientSummary !== undefined) { patch.clientSummary = optionalText(body.clientSummary, "Resumen para cliente", 500); if (patch.clientSummary && containsIp(patch.clientSummary)) throw new BadRequestException("El resumen para cliente no puede incluir direcciones IP."); }
    this.validateWindow(patch.startsAt ?? window.startsAt, patch.endsAt ?? window.endsAt);
    return this.store.updateMaintenance(window.id, patch);
  }
  async cancelMaintenance(actor: MonitoringActor, id: string) {
    this.require(actor, "maintenance.create", "maintenance.manage");
    const window = await this.windowFor(actor, id);
    if (!["PLANNED", "ACTIVE"].includes(window.status)) throw new ConflictException("La ventana ya finalizó o fue cancelada.");
    const next = await this.store.updateMaintenance(window.id, { status: "CANCELLED", cancelledAt: new Date().toISOString() });
    await this.store.publishEvents({ projectId: window.projectId, clientId: window.clientId, endpointId: window.endpointId, monitorId: null, incidentId: null }, [{ eventType: "MAINTENANCE_CANCELLED", tone: "WARNING", title: `Ventana «${window.title}» cancelada.`, actorId: actor.userId, maintenanceWindowId: window.id, visibility: window.clientVisibility }], []);
    await this.store.runMaintenanceTransitions(new Date());
    return next;
  }

  // ---------------------------------------------------------------- estado, uptime, rendimiento, SSL
  async dashboard(actor: MonitoringActor): Promise<MonitoringDashboard> {
    this.require(actor, "monitoring.dashboard.view");
    const projectIds = await this.projectScope(actor);
    const [monitors, incidents, events, recoveries, workers] = await Promise.all([
      this.store.listMonitors({ projectIds }), this.store.listIncidents({ projectIds, state: "open", page: 1, pageSize: 100 }), this.store.listEvents({ projectIds, page: 1, pageSize: 25 }),
      this.store.listEvents({ projectIds, eventType: "ENDPOINT_RECOVERED", page: 1, pageSize: 6 }), hasFleetScope(actor.role) ? this.store.listHeartbeats() : Promise.resolve([]),
    ]);
    const fleet = await this.store.fleetStats(monitors.map((monitor) => monitor.id));
    const totals = { total: monitors.length, UNKNOWN: 0, ONLINE: 0, DEGRADED: 0, OFFLINE: 0, MAINTENANCE: 0, DISABLED: 0 };
    for (const monitor of monitors) totals[monitor.status] += 1;
    const measured = monitors.map((monitor) => fleet[monitor.id]?.uptime24h).filter((value): value is number => typeof value === "number");
    const sslRank = { EXPIRED: 0, INVALID: 1, EXPIRING_SOON: 2 } as Record<string, number>;
    return {
      totals, openIncidents: incidents.total, criticalIncidents: incidents.items.filter((item) => item.severity === "CRITICAL").length, unacknowledgedIncidents: incidents.items.filter((item) => !item.acknowledgedAt).length,
      globalUptime24h: measured.length ? Math.round((measured.reduce((sum, value) => sum + value, 0) / measured.length) * 100) / 100 : null,
      globalUptimeDefinition: "Promedio simple del uptime 24 h de cada monitor con datos (cada endpoint pesa igual).",
      sslExpiring: monitors.filter((monitor) => monitor.ssl.status in sslRank).sort((a, b) => sslRank[a.ssl.status]! - sslRank[b.ssl.status]! || (a.ssl.daysRemaining ?? 0) - (b.ssl.daysRemaining ?? 0)).slice(0, 8),
      highLatency: monitors.filter((monitor) => monitor.lastLatencyMs !== null && ((monitor.criticalLatencyMs && monitor.lastLatencyMs >= monitor.criticalLatencyMs) || (monitor.warningLatencyMs && monitor.lastLatencyMs >= monitor.warningLatencyMs))).sort((a, b) => (b.lastLatencyMs ?? 0) - (a.lastLatencyMs ?? 0)).slice(0, 8),
      recentRecoveries: recoveries.items, activeIncidents: incidents.items.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.detectedAt.localeCompare(a.detectedAt)), events: events.items,
      monitors, fleet, workers, realtimeConfigured: Boolean(process.env.SUPABASE_URL), generatedAt: new Date().toISOString(),
    };
  }

  async statusBoard(actor: MonitoringActor, query: Record<string, string | undefined>) {
    this.require(actor, "monitoring.dashboard.view");
    const monitors = (await this.store.listMonitors({ projectIds: await this.projectScope(actor), clientId: query.clientId, status: query.status, environment: query.environment, responsibleUserId: query.responsibleUserId, projectId: query.projectId }))
      .filter((monitor) => !query.severity || monitor.activeIncident?.severity === query.severity);
    return { monitors, fleet: await this.store.fleetStats(monitors.map((monitor) => monitor.id)), generatedAt: new Date().toISOString() };
  }

  async projectStatus(actor: MonitoringActor, projectId: string) {
    this.require(actor, "monitor.view");
    await this.assertProject(actor, uuid(projectId, "Proyecto"));
    const [monitors, open, recent, maintenance] = await Promise.all([
      this.store.listMonitors({ projectIds: null, projectId }), this.store.listIncidents({ projectIds: null, projectId, state: "open", page: 1, pageSize: 20 }),
      this.store.listIncidents({ projectIds: null, projectId, state: "all", page: 1, pageSize: 10 }), this.store.listMaintenance({ projectIds: null, projectId, from: new Date().toISOString() }),
    ]);
    return { projectId, monitors, fleet: await this.store.fleetStats(monitors.map((monitor) => monitor.id)), openIncidents: open.items, recentIncidents: recent.items, maintenance };
  }

  /** Client 360. Ventas recibe sólo un resumen autorizado, sin descripciones internas ni errores técnicos. */
  async clientStatus(actor: MonitoringActor, clientId: string): Promise<ClientMonitoringSummary> {
    this.require(actor, "monitor.view", "monitoring.summary.view");
    uuid(clientId, "Cliente");
    const summaryOnly = !hasMonitoringPermission(actor.role, "monitor.view");
    const projectIds = summaryOnly ? null : await this.projectScope(actor);
    const [monitors, open, recent, maintenance] = await Promise.all([
      this.store.listMonitors({ projectIds, clientId }), this.store.listIncidents({ projectIds, clientId, state: "open", page: 1, pageSize: 20 }),
      this.store.listIncidents({ projectIds, clientId, state: "all", page: 1, pageSize: 20 }), this.store.listMaintenance({ projectIds, clientId, from: new Date().toISOString() }),
    ]);
    const fleet = await this.store.fleetStats(monitors.map((monitor) => monitor.id));
    const lastDown = recent.items.find((item) => item.confirmedAt);
    const sanitizeIncident = (item: Incident): Incident => summaryOnly ? { ...item, description: null, rootCause: null, impact: null, resolution: null, preventiveActions: null, failureType: null, endpointUrl: null, title: item.clientVisibility === "CLIENT_VISIBLE" && item.clientSummary ? item.clientSummary : `Incidente ${item.severity}` } : item;
    const sanitizeMonitor = (item: MonitorView): MonitorView => summaryOnly ? { ...item, statusReason: null, lastErrorMessage: null, lastErrorType: null, expectedContent: null, url: new URL(item.url).host } : item;
    return { clientId, monitors: monitors.map(sanitizeMonitor), fleet, openIncidents: open.items.map(sanitizeIncident), recentIncidents: recent.items.map(sanitizeIncident), lastDowntime: lastDown ? { incidentNumber: lastDown.incidentNumber, at: lastDown.confirmedAt!, downtimeSeconds: lastDown.downtimeSeconds } : null, maintenance: summaryOnly ? maintenance.map((item) => ({ ...item, description: null })) : maintenance };
  }

  async uptime(actor: MonitoringActor, query: Record<string, string | undefined>) {
    this.require(actor, "monitor.view");
    const period = periodHours[query.period ?? "30d"] ? query.period ?? "30d" : "30d";
    const projectIds = await this.projectScope(actor);
    const monitors = await this.store.listMonitors({ projectIds, clientId: query.clientId, projectId: query.projectId });
    const ids = monitors.map((monitor) => monitor.id), from = new Date(Date.now() - periodHours[period]! * 3_600_000).toISOString();
    const [fleet, buckets, incidents] = await Promise.all([this.store.fleetStats(ids), this.store.buckets(ids, period === "24h" ? "hour" : "day", from), this.store.listIncidents({ projectIds, clientId: query.clientId, projectId: query.projectId, state: "all", from, page: 1, pageSize: 100 })]);
    const settings = await this.store.getSettings();
    return { period, granularity: period === "24h" ? "hour" : "day", monitors, fleet, buckets, incidents: incidents.items, maintenancePolicy: settings.uptimeMaintenancePolicy, retention: { rawDays: settings.rawRetentionDays, dailyDays: settings.dailyRetentionDays } };
  }

  async performance(actor: MonitoringActor, query: Record<string, string | undefined>) {
    this.require(actor, "monitor.view");
    const period = ["24h", "7d"].includes(query.period ?? "") ? query.period! : "24h";
    const monitors = await this.store.listMonitors({ projectIds: await this.projectScope(actor), clientId: query.clientId, projectId: query.projectId });
    const ids = monitors.map((monitor) => monitor.id), hours = periodHours[period]!;
    const [ranking, buckets] = await Promise.all([this.store.latencyRanking(ids, hours), this.store.buckets(ids, period === "24h" ? "hour" : "day", new Date(Date.now() - hours * 3_600_000).toISOString())]);
    const slowest = monitors.filter((monitor) => ranking[monitor.id]).map((monitor) => ({ monitor, latency: ranking[monitor.id]! })).sort((a, b) => (b.latency.p95 ?? b.latency.avg ?? 0) - (a.latency.p95 ?? a.latency.avg ?? 0));
    return { period, monitors, ranking, buckets, slowest };
  }

  async ssl(actor: MonitoringActor) {
    this.require(actor, "ssl.view");
    const order: Record<string, number> = { EXPIRED: 0, INVALID: 1, EXPIRING_SOON: 2, UNKNOWN: 3, HEALTHY: 4, NOT_APPLICABLE: 5 };
    const monitors = (await this.store.listMonitors({ projectIds: await this.projectScope(actor) })).filter((monitor) => monitor.monitorType === "HTTPS")
      .sort((a, b) => order[a.ssl.status]! - order[b.ssl.status]! || (a.ssl.daysRemaining ?? 9999) - (b.ssl.daysRemaining ?? 9999));
    const settings = await this.store.getSettings();
    return { monitors, counts: Object.fromEntries(Object.keys(order).map((status) => [status, monitors.filter((monitor) => monitor.ssl.status === status).length])), alertDays: settings.sslAlertDays, warningDays: settings.sslWarningDays };
  }

  async history(actor: MonitoringActor, query: Record<string, string | undefined>) {
    this.require(actor, "monitor.view");
    return this.store.listEvents({ projectIds: await this.projectScope(actor), projectId: query.projectId, clientId: query.clientId, monitorId: query.monitorId, incidentId: query.incidentId, eventType: query.eventType, from: query.from ? iso(query.from, "Fecha desde") : undefined, to: query.to ? iso(query.to, "Fecha hasta") : undefined, page: Math.max(1, Number(query.page) || 1), pageSize: Math.min(100, Math.max(1, Number(query.pageSize) || 40)) });
  }

  // ---------------------------------------------------------------- alertas y reglas
  async listAlertRules(actor: MonitoringActor) { this.require(actor, "alert_rule.view"); return this.store.listAlertRules(); }
  private parseRule(body: Record<string, unknown>, base?: AlertRule): Omit<AlertRule, "id" | "createdAt" | "updatedAt"> {
    const scopeType = oneOf(body.scopeType ?? base?.scopeType ?? "GLOBAL", ["GLOBAL", "CLIENT", "PROJECT", "MONITOR"] as const, "Alcance");
    const channels = Array.isArray(body.channels) ? body.channels.map((channel) => oneOf(channel, alertChannels, "Canal")) : base?.channels ?? ["IN_APP", "REALTIME"];
    if (!channels.length) throw new BadRequestException("Selecciona al menos un canal.");
    const rawPolicy = (body.escalationPolicy ?? base?.escalationPolicy ?? defaultEscalationPolicy) as AlertRule["escalationPolicy"];
    const steps = (Array.isArray(rawPolicy?.steps) ? rawPolicy.steps : []).map((step, index) => ({ afterMinutes: int(step.afterMinutes, `Minutos del paso ${index + 1}`, 0, 1440), targets: (Array.isArray(step.targets) ? step.targets : []).map((target) => oneOf(target, alertTargets, "Destinatario")) }));
    if (!steps.length || steps[0]!.afterMinutes !== 0 || !steps[0]!.targets.length) throw new BadRequestException("El primer paso de escalamiento debe notificar inmediatamente (0 min) a al menos un destinatario.");
    return {
      name: text(body.name ?? base?.name, "Nombre", 120), scopeType, clientId: scopeType === "CLIENT" ? uuid(body.clientId ?? base?.clientId, "Cliente") : null, projectId: scopeType === "PROJECT" ? uuid(body.projectId ?? base?.projectId, "Proyecto") : null,
      monitorId: scopeType === "MONITOR" ? uuid(body.monitorId ?? base?.monitorId, "Monitor") : null, minSeverity: oneOf(body.minSeverity ?? base?.minSeverity ?? "INFO", incidentSeverities, "Severidad mínima"),
      enabled: body.enabled === undefined ? base?.enabled ?? true : Boolean(body.enabled), channels, notifyEvents: Array.isArray(body.notifyEvents) ? body.notifyEvents.map((event) => oneOf(event, defaultNotifyEvents, "Evento")) : base?.notifyEvents ?? defaultNotifyEvents,
      escalationPolicy: { steps: steps.sort((a, b) => a.afterMinutes - b.afterMinutes), criticalImmediateTargets: (Array.isArray(rawPolicy?.criticalImmediateTargets) ? rawPolicy.criticalImmediateTargets : []).map((target) => oneOf(target, alertTargets, "Destinatario crítico")) },
      recoveryTargets: (Array.isArray(body.recoveryTargets) ? body.recoveryTargets : base?.recoveryTargets ?? ["ENDPOINT_RESPONSIBLE", "INCIDENT_ASSIGNEE", "PROJECT_LEAD"]).map((target) => oneOf(target, alertTargets, "Destinatario de recuperación")),
      soundProfile: oneOf(body.soundProfile ?? base?.soundProfile ?? "DEFAULT", ["DEFAULT", "URGENT", "SILENT"] as const, "Sonido"), criticalSoundProfile: oneOf(body.criticalSoundProfile ?? base?.criticalSoundProfile ?? "URGENT", ["DEFAULT", "URGENT", "SILENT"] as const, "Sonido crítico"),
      createdBy: base?.createdBy ?? null,
    };
  }
  async createAlertRule(actor: MonitoringActor, body: Record<string, unknown>) {
    this.require(actor, "alert_rule.manage");
    const rule = this.parseRule(body);
    if (rule.projectId) await this.assertProject(actor, rule.projectId);
    return this.store.createAlertRule({ ...rule, createdBy: actor.userId });
  }
  async updateAlertRule(actor: MonitoringActor, id: string, body: Record<string, unknown>) {
    this.require(actor, "alert_rule.manage");
    const current = (await this.store.listAlertRules()).find((rule) => rule.id === uuid(id, "Regla"));
    if (!current) throw new NotFoundException("Regla no encontrada.");
    return this.store.updateAlertRule(current.id, this.parseRule(body, current));
  }

  async myAlerts(actor: MonitoringActor) {
    this.require(actor, "monitoring.dashboard.view");
    return this.store.listAlertsFor(actor.userId, actor.role, 50, await this.projectScope(actor));
  }
  async readAlert(actor: MonitoringActor, id: string) {
    this.require(actor, "monitoring.dashboard.view");
    if (!(await this.store.markAlertRead(uuid(id, "Alerta"), actor.userId, actor.role))) throw new NotFoundException("Alerta no encontrada.");
    return { ok: true };
  }

  // ---------------------------------------------------------------- políticas, workers, informes
  async settings(actor: MonitoringActor) { this.require(actor, "monitor.view"); return { settings: await this.store.getSettings(), severityRules: await this.store.listSeverityRules() }; }
  async updateSettings(actor: MonitoringActor, body: Record<string, unknown>) {
    this.require(actor, "monitoring.settings.manage");
    const patch: Record<string, unknown> = {};
    const ranges: Record<string, [number, number]> = { rawRetentionDays: [7, 90], hourlyRetentionDays: [30, 400], dailyRetentionDays: [90, 1825], reopenWindowMinutes: [0, 1440], sslWarningDays: [1, 120], sslCheckIntervalMinutes: [60, 1440], manualCheckCooldownSeconds: [30, 3600], perHostConcurrency: [1, 5], contentInspectBytes: [1024, 262_144] };
    for (const [key, [min, max]] of Object.entries(ranges)) if (body[key] !== undefined) patch[key] = int(body[key], key, min, max);
    if (body.autoResolveAfterMinutes !== undefined) patch.autoResolveAfterMinutes = body.autoResolveAfterMinutes === null ? null : int(body.autoResolveAfterMinutes, "autoResolveAfterMinutes", 5, 1440);
    if (body.recoveryPolicy !== undefined) patch.recoveryPolicy = oneOf(body.recoveryPolicy, ["MONITORING", "AUTO_RESOLVE"] as const, "Política de recuperación");
    if (body.uptimeMaintenancePolicy !== undefined) patch.uptimeMaintenancePolicy = oneOf(body.uptimeMaintenancePolicy, ["EXCLUDE", "INCLUDE"] as const, "Política de uptime");
    if (body.postmortemSeverities !== undefined) patch.postmortemSeverities = (Array.isArray(body.postmortemSeverities) ? body.postmortemSeverities : []).map((value) => oneOf(value, incidentSeverities, "Severidad"));
    if (body.sslAlertDays !== undefined) patch.sslAlertDays = [...new Set((Array.isArray(body.sslAlertDays) ? body.sslAlertDays : []).map((value) => int(value, "Días de alerta SSL", 1, 120)))].sort((a, b) => b - a);
    return this.store.updateSettings(patch, actor.userId);
  }
  async workers(actor: MonitoringActor) { this.require(actor, "monitoring.dashboard.view"); if (!hasFleetScope(actor.role)) throw new ForbiddenException("Sólo gerencia y jefaturas ven el estado del scheduler."); return this.store.listHeartbeats(); }
  async diagnostics(actor: MonitoringActor) {
    this.require(actor, "monitoring.dashboard.view");
    if (!hasFleetScope(actor.role)) throw new ForbiddenException("Sólo gerencia y jefaturas ven el diagnóstico del worker.");
    const scheduler = this.scheduler?.diagnostics() ?? { active: false, workerId: null, checksExecuted: 0, lastError: null, processRole: process.env.MONITORING_PROCESS_ROLE ?? "unspecified" };
    return {
      releaseSha: process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT_SHA ?? null,
      persistenceMode: this.store.mode,
      scheduler,
      databaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      realtimeConfigured: Boolean(process.env.SUPABASE_URL),
      alertChannels: { inApp: true, email: Boolean(process.env.RESEND_API_KEY && process.env.MONITORING_MAIL_FROM), webPush: false },
      workers: this.store.mode === "unavailable" ? [] : await this.store.listHeartbeats(),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Agregaciones para el futuro informe mensual del cliente (sin Report Builder). */
  async monthlyReport(actor: MonitoringActor, query: Record<string, string | undefined>): Promise<MonitoringMonthlyReport> {
    this.require(actor, "monitoring.export");
    const month = /^\d{4}-\d{2}$/.test(query.month ?? "") ? query.month! : new Date().toISOString().slice(0, 7);
    const from = new Date(`${month}-01T00:00:00-03:00`), to = new Date(from); to.setMonth(to.getMonth() + 1);
    const projectIds = await this.projectScope(actor), clientId = query.clientId ? uuid(query.clientId, "Cliente") : undefined;
    const monitors = await this.store.listMonitors({ projectIds, clientId });
    const [daily, incidents, maintenance, settings] = await Promise.all([this.store.buckets(monitors.map((monitor) => monitor.id), "day", from.toISOString()), this.store.listIncidents({ projectIds, clientId, state: "all", from: from.toISOString(), to: to.toISOString(), page: 1, pageSize: 100 }), this.store.listMaintenance({ projectIds, clientId, from: from.toISOString(), to: to.toISOString() }), this.store.getSettings()]);
    const inMonth = (bucket: UptimeBucket) => bucket.periodStart >= from.toISOString() && bucket.periodStart < to.toISOString();
    return {
      clientId: clientId ?? null, month, from: from.toISOString(), to: to.toISOString(), maintenancePolicy: settings.uptimeMaintenancePolicy, generatedAt: new Date().toISOString(),
      monitors: monitors.map((monitor) => {
        const days = (daily[monitor.id] ?? []).filter(inMonth), checks = days.reduce((sum, day) => sum + day.checks, 0);
        const evaluated = settings.uptimeMaintenancePolicy === "EXCLUDE" ? days.reduce((sum, day) => sum + day.checks - day.maintenanceChecks, 0) : checks;
        const ok = days.reduce((sum, day) => sum + (day.uptime === null ? 0 : (day.uptime / 100) * (settings.uptimeMaintenancePolicy === "EXCLUDE" ? day.checks - day.maintenanceChecks : day.checks)), 0);
        const latencyDays = days.filter((day) => day.avgLatencyMs !== null);
        return { monitorId: monitor.id, endpointName: monitor.endpointName, uptime: evaluated ? Math.round((ok / evaluated) * 10000) / 100 : null, checks, avgLatencyMs: latencyDays.length ? Math.round(latencyDays.reduce((sum, day) => sum + day.avgLatencyMs! * day.successes, 0) / Math.max(1, latencyDays.reduce((sum, day) => sum + day.successes, 0))) : null, p95LatencyMs: latencyDays.length ? Math.max(...latencyDays.map((day) => day.p95LatencyMs ?? 0)) : null, ssl: monitor.ssl };
      }),
      incidents: incidents.items, metrics: incidentMetrics(incidents.items), maintenance,
    };
  }

  async exportCsv(actor: MonitoringActor, kind: "uptime" | "incidents" | "ssl", query: Record<string, string | undefined>) {
    this.require(actor, "monitoring.export");
    if (kind === "ssl") {
      const { monitors } = await this.ssl(actor);
      return toCsv(["Cliente", "Proyecto", "Endpoint", "URL", "Estado SSL", "Vence", "Días restantes", "Emisor", "Error", "Última revisión"], monitors.map((m) => [m.clientName, m.projectName, m.endpointName, m.url, m.ssl.status, santiagoDate(m.ssl.expiresAt), m.ssl.daysRemaining, m.ssl.issuer, m.ssl.errorType, santiagoDateTime(m.ssl.checkedAt)]));
    }
    if (kind === "incidents") {
      const projectIds = await this.projectScope(actor);
      const items = (await this.store.listIncidents({ projectIds, clientId: query.clientId, projectId: query.projectId, state: "all", from: query.from, to: query.to, page: 1, pageSize: 100 })).items;
      return toCsv(["Número", "Cliente", "Proyecto", "Endpoint", "Severidad", "Estado", "Detectado", "Confirmado", "Reconocido", "Recuperado", "Resuelto", "Downtime", "Causa raíz"], items.map((i) => [i.incidentNumber, i.clientName, i.projectName, i.endpointName, i.severity, i.status, santiagoDateTime(i.detectedAt), santiagoDateTime(i.confirmedAt), santiagoDateTime(i.acknowledgedAt), santiagoDateTime(i.recoveredAt), santiagoDateTime(i.resolvedAt), formatDuration(i.downtimeSeconds), i.rootCause]));
    }
    const report = await this.uptime(actor, query);
    return toCsv(["Cliente", "Proyecto", "Endpoint", "Ambiente", "Estado", "Uptime 24 h", "Uptime 7 d", "Uptime 30 d", "Uptime 90 d", "Latencia media 24 h (ms)", "Política mantenimiento"], report.monitors.map((m) => { const f = report.fleet[m.id]; return [m.clientName, m.projectName, m.endpointName, m.environment, m.status, f?.uptime24h, f?.uptime7d, f?.uptime30d, f?.uptime90d, f?.avgLatency24h, report.maintenancePolicy]; }));
  }

}

export const monitoringResolverProvider = { provide: MONITORING_RESOLVER, useValue: systemResolver };

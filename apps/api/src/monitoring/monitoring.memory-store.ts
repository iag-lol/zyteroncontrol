import { randomUUID } from "node:crypto";
import type { OperationsTask, ProjectEndpoint } from "@zyteron/contracts";
import type {
  AlertDelivery, AlertRule, Incident, IncidentEvent, IncidentLink, IncidentStatus, LatencyWindow, MaintenanceWindow, MonitorCheck, MonitorConfig, MonitorStats,
  MonitoringEvent, MonitoringFleetEntry, MonitoringSettings, MonitorView, Paged, SeverityRule, SslStatus, UptimeBucket, WorkerHeartbeat,
} from "@zyteron/contracts/monitoring";
import type { OperationsRepository } from "../operations/operations.repository.js";
import type { CertificateObservation } from "./certificate-probe.js";
import { daysUntil } from "./certificate-probe.js";
import { activeStatuses, isReopenEligible } from "./monitoring.engine.js";
import { bucketize, latencyOf, uptimeOf } from "./monitoring.stats.js";
import {
  applyIncidentPatch, defaultEscalationPolicy, defaultNotifyEvents, defaultSettings, MonitoringError, paged,
  type AlertDeliveryDraft, type CheckFilter, type EndpointView, type EventFilter, type IncidentFilter, type IncidentMutationGuard, type MaintenanceFilter,
  type MaintenanceInput, type MonitorFilter, type MonitoringEndpointInput, type MonitoringStore,
} from "./monitoring.store.js";
import type { ApplyCheckPayload, ApplyCheckResult, EngineContext, EngineIncident, IncidentEventDraft, IncidentPatch, MonitorExecution, MonitoringEventDraft, OutboxDraft } from "./monitoring.types.js";

interface MonitorRow extends MonitorConfig {
  id: string; endpointId: string; status: MonitorView["status"]; statusReason: string | null; statusChangedAt: string | null; consecutiveFailures: number; consecutiveSuccesses: number;
  failureStreakStartedAt: string | null; lastCheckedAt: string | null; lastSuccessAt: string | null; lastFailureAt: string | null; lastStatusCode: number | null; lastLatencyMs: number | null;
  lastErrorType: MonitorView["lastErrorType"]; lastErrorMessage: string | null; nextCheckAt: string; leaseOwner: string | null; leaseExpiresAt: string | null; lastManualCheckAt: string | null;
  stateVersion: number; sslStatus: SslStatus; sslExpiresAt: string | null; sslIssuer: string | null; sslSubject: string | null; sslErrorType: MonitorView["ssl"]["errorType"];
  sslFingerprint: string | null; sslCheckedAt: string | null; sslNextCheckAt: string; createdBy: string | null; createdAt: string; updatedAt: string;
}

const iso = () => new Date().toISOString();
const santiagoYear = () => Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", year: "numeric" }).format(new Date()));

/** Store volátil para desarrollo local y pruebas. Replica las garantías del SQL (lease, unicidad, dedup). */
export class MemoryMonitoringStore implements MonitoringStore {
  readonly mode = "memory" as const;
  private settings: MonitoringSettings = { ...defaultSettings };
  private readonly severityRules: SeverityRule[] = [
    { id: randomUUID(), name: "Producción prioritaria caída", environment: "PRODUCTION", endpointType: null, projectPriority: "URGENT", clientId: null, severity: "CRITICAL", enabled: true },
    { id: randomUUID(), name: "Producción crítica caída", environment: "PRODUCTION", endpointType: null, projectPriority: "CRITICAL", clientId: null, severity: "CRITICAL", enabled: true },
    { id: randomUUID(), name: "Producción caída", environment: "PRODUCTION", endpointType: null, projectPriority: null, clientId: null, severity: "HIGH", enabled: true },
    { id: randomUUID(), name: "Staging caído", environment: "STAGING", endpointType: null, projectPriority: null, clientId: null, severity: "LOW", enabled: true },
    { id: randomUUID(), name: "Desarrollo caído", environment: "DEVELOPMENT", endpointType: null, projectPriority: null, clientId: null, severity: "INFO", enabled: true },
  ];
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly monitors = new Map<string, MonitorRow>();
  private readonly standaloneEndpoints = new Map<string, EndpointView>();
  private readonly checks: MonitorCheck[] = [];
  private readonly incidents = new Map<string, Incident>();
  private readonly incidentEventLog: IncidentEvent[] = [];
  private readonly links: IncidentLink[] = [];
  private readonly windows = new Map<string, MaintenanceWindow>();
  private readonly deliveries = new Map<string, AlertDelivery>();
  private readonly events: MonitoringEvent[] = [];
  readonly outbox: Array<{ id: string; aggregateType: string; aggregateId: string; eventType: string; payload: Record<string, unknown>; occurredAt: string; attempts: number; processedAt: string | null; leaseOwner: string | null; leaseExpiresAt: string | null; lastError: string | null }> = [];
  private readonly heartbeats = new Map<string, WorkerHeartbeat>();
  private readonly sslLog: Array<CertificateObservation & { monitorId: string }> = [];
  private checkSequence = 0;
  private incidentSequence = 0;

  constructor(private readonly operations: OperationsRepository) {
    const stamp = iso();
    const rule: AlertRule = { id: randomUUID(), name: "Escalamiento estándar Zyteron", scopeType: "GLOBAL", clientId: null, projectId: null, monitorId: null, minSeverity: "INFO", enabled: true, channels: ["IN_APP", "REALTIME"], notifyEvents: defaultNotifyEvents, escalationPolicy: defaultEscalationPolicy, recoveryTargets: ["ENDPOINT_RESPONSIBLE", "INCIDENT_ASSIGNEE", "PROJECT_LEAD"], soundProfile: "DEFAULT", criticalSoundProfile: "URGENT", createdBy: null, createdAt: stamp, updatedAt: stamp };
    this.alertRules.set(rule.id, rule);
  }

  async getSettings() { return { ...this.settings }; }
  async updateSettings(patch: Partial<MonitoringSettings>) { this.settings = { ...this.settings, ...patch }; return this.getSettings(); }
  async listSeverityRules() { return [...this.severityRules]; }
  async listAlertRules() { return [...this.alertRules.values()]; }
  async createAlertRule(input: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) { const stamp = iso(); const rule = { ...input, id: randomUUID(), createdAt: stamp, updatedAt: stamp }; this.alertRules.set(rule.id, rule); return rule; }
  async updateAlertRule(id: string, patch: Partial<AlertRule>) { const current = this.alertRules.get(id); if (!current) throw new MonitoringError("MONITOR_NOT_FOUND", "Regla no encontrada."); const next = { ...current, ...patch, id, updatedAt: iso() }; this.alertRules.set(id, next); return next; }

  private async endpointView(endpoint: ProjectEndpoint): Promise<EndpointView | undefined> {
    const project = await this.operations.getProject(endpoint.projectId);
    if (!project) return undefined;
    return { ...endpoint, clientId: project.clientId, clientName: project.clientName, projectName: project.name, projectNumber: project.projectNumber };
  }
  async getEndpoint(id: string) { const standalone = this.standaloneEndpoints.get(id); if (standalone) return { ...standalone }; const endpoint = await this.operations.getEndpoint(id); return endpoint ? this.endpointView(endpoint) : undefined; }
  async listEndpoints(projectIds: string[] | null, projectId?: string) {
    const ids = projectId ? [projectId] : projectIds ?? (await this.operations.listProjects({ page: 1, pageSize: 1000 })).items.map((project) => project.id);
    const result: EndpointView[] = projectId || projectIds ? [] : [...this.standaloneEndpoints.values()].map((endpoint) => ({ ...endpoint }));
    for (const id of ids) for (const endpoint of await this.operations.listEndpoints(id)) { const view = await this.endpointView(endpoint); if (view) result.push(view); }
    return result;
  }
  async createEndpoint(projectId: string | null, input: MonitoringEndpointInput) {
    if (projectId) return (await this.endpointView(await this.operations.createEndpoint(projectId, input)))!;
    const stamp = iso();
    const endpoint: EndpointView = {
      id: randomUUID(), projectId: null, projectName: null, projectNumber: null, clientId: input.clientId ?? null, clientName: null,
      name: input.name ?? "Endpoint", url: input.url ?? "", environment: input.environment ?? "PRODUCTION", endpointType: input.endpointType ?? "WEB",
      monitoringEnabled: input.monitoringEnabled ?? true, responsibleUserId: input.responsibleUserId ?? null, active: input.active ?? true,
      createdAt: stamp, updatedAt: stamp,
    };
    this.standaloneEndpoints.set(endpoint.id, endpoint);
    return { ...endpoint };
  }
  async updateEndpoint(id: string, patch: Partial<ProjectEndpoint>) {
    const standalone = this.standaloneEndpoints.get(id);
    if (!standalone) return (await this.endpointView(await this.operations.updateEndpoint(id, patch)))!;
    const next = { ...standalone, ...patch, projectId: null, updatedAt: iso() };
    this.standaloneEndpoints.set(id, next);
    return { ...next };
  }

  private activeIncidentFor(monitorId: string) { return [...this.incidents.values()].find((item) => item.monitorId === monitorId && activeStatuses.has(item.status)) ?? null; }
  private activeWindow(projectId: string | null, endpointId: string | null, at = new Date()) {
    if (!projectId) return null;
    return [...this.windows.values()].filter((w) => w.projectId === projectId && (!w.endpointId || w.endpointId === endpointId) && ["PLANNED", "ACTIVE"].includes(w.status) && new Date(w.startsAt) <= at && new Date(w.endsAt) > at)
      .sort((a, b) => Number(b.suppressAlerts) - Number(a.suppressAlerts) || b.endsAt.localeCompare(a.endsAt))[0] ?? null;
  }

  private async view(row: MonitorRow): Promise<MonitorView | undefined> {
    const endpoint = await this.getEndpoint(row.endpointId);
    if (!endpoint) return undefined;
    const project = endpoint.projectId ? await this.operations.getProject(endpoint.projectId) : undefined;
    const incident = this.activeIncidentFor(row.id);
    const window = this.activeWindow(endpoint.projectId, endpoint.id);
    return {
      ...row, endpointName: endpoint.name, url: endpoint.url, environment: endpoint.environment, endpointType: endpoint.endpointType, responsibleUserId: endpoint.responsibleUserId,
      projectId: project?.id ?? null, projectName: project?.name ?? null, projectNumber: project?.projectNumber ?? null, projectPriority: project?.priority ?? null, projectLeadId: project?.projectLeadId ?? null, developmentManagerId: project?.developmentManagerId ?? null,
      clientId: project?.clientId ?? endpoint.clientId, clientName: project?.clientName ?? endpoint.clientName,
      ssl: { status: row.sslStatus, expiresAt: row.sslExpiresAt, daysRemaining: daysUntil(row.sslExpiresAt), issuer: row.sslIssuer, subject: row.sslSubject, errorType: row.sslErrorType, checkedAt: row.sslCheckedAt },
      activeIncident: incident ? { id: incident.id, incidentNumber: incident.incidentNumber, severity: incident.severity, status: incident.status, confirmedAt: incident.confirmedAt } : null,
      activeMaintenance: window ? { id: window.id, title: window.title, endsAt: window.endsAt, suppressAlerts: window.suppressAlerts } : null,
    };
  }

  async listMonitors(filter: MonitorFilter) {
    const search = filter.search?.toLowerCase();
    const views = (await Promise.all([...this.monitors.values()].map((row) => this.view(row)))).filter((item): item is MonitorView => Boolean(item));
    return views.filter((item) => (!filter.projectIds || (item.projectId !== null && filter.projectIds.includes(item.projectId))) && (!filter.projectId || item.projectId === filter.projectId) && (!filter.clientId || item.clientId === filter.clientId)
      && (!filter.status || item.status === filter.status) && (!filter.environment || item.environment === filter.environment) && (!filter.responsibleUserId || item.responsibleUserId === filter.responsibleUserId)
      && (!filter.endpointId || item.endpointId === filter.endpointId) && (!search || [item.endpointName, item.url, item.projectName, item.clientName].some((value) => value?.toLowerCase().includes(search))))
      .sort((a, b) => (a.clientName ?? "").localeCompare(b.clientName ?? "") || (a.projectName ?? "").localeCompare(b.projectName ?? "") || a.endpointName.localeCompare(b.endpointName));
  }
  async getMonitor(id: string) { const row = this.monitors.get(id); return row ? this.view(row) : undefined; }
  async createMonitor(endpointId: string, config: MonitorConfig, actorId: string | null) {
    if ([...this.monitors.values()].some((row) => row.endpointId === endpointId && row.monitorType === config.monitorType)) throw new MonitoringError("MONITOR_BUSY", "El endpoint ya posee un monitor de este tipo.");
    const stamp = iso();
    const row: MonitorRow = { ...config, id: randomUUID(), endpointId, status: config.enabled ? "UNKNOWN" : "DISABLED", statusReason: config.enabled ? "Esperando primer check" : "Monitor deshabilitado", statusChangedAt: stamp, consecutiveFailures: 0, consecutiveSuccesses: 0, failureStreakStartedAt: null, lastCheckedAt: null, lastSuccessAt: null, lastFailureAt: null, lastStatusCode: null, lastLatencyMs: null, lastErrorType: null, lastErrorMessage: null, nextCheckAt: stamp, leaseOwner: null, leaseExpiresAt: null, lastManualCheckAt: null, stateVersion: 0, sslStatus: "UNKNOWN", sslExpiresAt: null, sslIssuer: null, sslSubject: null, sslErrorType: null, sslFingerprint: null, sslCheckedAt: null, sslNextCheckAt: stamp, createdBy: actorId, createdAt: stamp, updatedAt: stamp };
    this.monitors.set(row.id, row);
    return (await this.view(row))!;
  }
  async updateMonitor(id: string, patch: Partial<MonitorConfig>) {
    const row = this.monitors.get(id); if (!row) throw new MonitoringError("MONITOR_NOT_FOUND");
    Object.assign(row, patch, { updatedAt: iso() });
    return (await this.view(row))!;
  }
  async setMonitorEnabled(id: string, enabled: boolean) {
    const row = this.monitors.get(id); if (!row) throw new MonitoringError("MONITOR_NOT_FOUND");
    Object.assign(row, { enabled, status: enabled ? "UNKNOWN" : "DISABLED", statusReason: enabled ? "Monitor habilitado; esperando próximo check" : "Monitor deshabilitado", statusChangedAt: iso(), nextCheckAt: iso(), consecutiveFailures: 0, consecutiveSuccesses: 0, failureStreakStartedAt: null, leaseOwner: null, leaseExpiresAt: null, stateVersion: row.stateVersion + 1, updatedAt: iso() });
    return (await this.view(row))!;
  }

  private async execution(row: MonitorRow, workerId: string): Promise<MonitorExecution> {
    const view = (await this.view(row))!;
    const project = view.projectId ? await this.operations.getProject(view.projectId) : undefined;
    return { ...row, projectId: view.projectId, clientId: view.clientId, leaseOwner: workerId, endpoint: { id: view.endpointId, name: view.endpointName, url: view.url, environment: view.environment, endpointType: view.endpointType, responsibleUserId: view.responsibleUserId, active: true }, project: { id: project?.id ?? null, name: project?.name ?? null, projectNumber: project?.projectNumber ?? null, priority: project?.priority ?? null, projectLeadId: project?.projectLeadId ?? null, developmentManagerId: project?.developmentManagerId ?? null, clientId: project?.clientId ?? view.clientId, clientName: project?.clientName ?? view.clientName } };
  }
  async claimDue(workerId: string, limit: number, leaseSeconds: number) {
    const now = new Date(), result: MonitorExecution[] = [];
    for (const row of [...this.monitors.values()].sort((a, b) => a.nextCheckAt.localeCompare(b.nextCheckAt))) {
      if (result.length >= limit) break;
      if (!row.enabled || !["HTTP", "HTTPS"].includes(row.monitorType) || new Date(row.nextCheckAt) > now || (row.leaseExpiresAt && new Date(row.leaseExpiresAt) > now)) continue;
      const endpoint = await this.getEndpoint(row.endpointId);
      if (!endpoint?.active) continue;
      if (row.maintenanceMode === "PAUSE_CHECKS" && this.activeWindow(endpoint.projectId, endpoint.id, now)) {
        Object.assign(row, { nextCheckAt: new Date(now.getTime() + row.intervalSeconds * 1000).toISOString(), status: "MAINTENANCE", statusReason: "Checks pausados por ventana de mantenimiento", stateVersion: row.stateVersion + 1 });
        continue;
      }
      Object.assign(row, { leaseOwner: workerId, leaseExpiresAt: new Date(now.getTime() + leaseSeconds * 1000).toISOString() });
      result.push(await this.execution(row, workerId));
    }
    return result;
  }
  async claimMonitor(id: string, workerId: string, leaseSeconds: number, cooldownSeconds: number) {
    const row = this.monitors.get(id), now = Date.now();
    if (!row) throw new MonitoringError("MONITOR_NOT_FOUND");
    if (!row.enabled) throw new MonitoringError("MONITOR_DISABLED");
    if (row.leaseExpiresAt && new Date(row.leaseExpiresAt).getTime() > now) throw new MonitoringError("MONITOR_BUSY");
    if (row.lastManualCheckAt && new Date(row.lastManualCheckAt).getTime() > now - cooldownSeconds * 1000) throw new MonitoringError("MONITOR_COOLDOWN");
    Object.assign(row, { leaseOwner: workerId, leaseExpiresAt: new Date(now + leaseSeconds * 1000).toISOString(), lastManualCheckAt: new Date(now).toISOString() });
    return this.execution(row, workerId);
  }
  async releaseLease(id: string, workerId: string, retrySeconds: number) {
    const row = this.monitors.get(id);
    if (row?.leaseOwner === workerId) Object.assign(row, { leaseOwner: null, leaseExpiresAt: null, nextCheckAt: new Date(Math.max(new Date(row.nextCheckAt).getTime(), Date.now() + retrySeconds * 1000)).toISOString() });
  }
  private engineIncident(item: Incident): EngineIncident { return { id: item.id, incidentNumber: item.incidentNumber, status: item.status, severity: item.severity, acknowledgedAt: item.acknowledgedAt, confirmedAt: item.confirmedAt, currentOutageStartedAt: item.currentOutageStartedAt, recoveredAt: item.recoveredAt, resolvedAt: item.resolvedAt, downtimeSeconds: item.downtimeSeconds, reopenedCount: item.reopenedCount, postmortemRequired: item.postmortemRequired, assignedTo: item.assignedTo }; }
  async engineContext(monitor: MonitorExecution, now: Date, reopenWindowMinutes: number): Promise<EngineContext> {
    const active = this.activeIncidentFor(monitor.id);
    const latest = [...this.incidents.values()].filter((item) => item.monitorId === monitor.id && !activeStatuses.has(item.status)).sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))[0];
    const window = this.activeWindow(monitor.projectId, monitor.endpointId, now);
    return { activeIncident: active ? this.engineIncident(active) : null, reopenCandidate: !active && latest && isReopenEligible(latest, now, reopenWindowMinutes) ? this.engineIncident(latest) : null, maintenance: window ? { id: window.id, title: window.title, suppressAlerts: window.suppressAlerts, endsAt: window.endsAt } : null };
  }

  async applyCheck(payload: ApplyCheckPayload): Promise<ApplyCheckResult> {
    const row = this.monitors.get(payload.monitorId);
    if (!row) throw new MonitoringError("MONITOR_NOT_FOUND");
    if (row.leaseOwner !== payload.workerId || row.stateVersion !== payload.expectedVersion) throw new MonitoringError("MONITOR_LEASE_LOST");
    const view = (await this.view(row))!;
    const c = payload.check;
    const check: MonitorCheck = { id: String(++this.checkSequence), monitorId: row.id, checkedAt: c.checkedAt, success: c.success, statusCode: c.statusCode, latencyMs: c.latencyMs, errorType: c.errorType, errorCode: c.errorCode, errorMessage: c.errorMessage?.slice(0, 300) ?? null, sslValid: c.sslValid, sslExpiresAt: c.sslExpiresAt, redirectCount: c.redirectCount, contentMatched: c.contentMatched, inMaintenance: c.inMaintenance, triggerType: c.triggerType, source: c.source };
    this.checks.push(check);
    let incident: Incident | null = null, applied = false;
    const action = payload.incident;
    if (action?.action === "CREATE") {
      const existing = this.activeIncidentFor(row.id);
      if (existing) incident = existing;
      else {
        const d = action.draft, stamp = iso();
        incident = { id: randomUUID(), incidentNumber: `INC-${santiagoYear()}-${String(++this.incidentSequence).padStart(6, "0")}`, projectId: view.projectId, projectName: view.projectName, endpointId: view.endpointId, endpointName: view.endpointName, endpointUrl: view.url, environment: view.environment, monitorId: row.id, clientId: view.clientId, clientName: view.clientName, source: "MONITOR", title: d.title, description: d.description, clientSummary: null, severity: d.severity, status: "CONFIRMED", failureType: d.failureType, detectedAt: d.detectedAt, confirmedAt: d.confirmedAt, acknowledgedAt: null, acknowledgedBy: null, assignedTo: d.assignedTo, assignedAt: d.assignedTo ? d.confirmedAt : null, currentOutageStartedAt: d.confirmedAt, recoveredAt: null, resolvedAt: null, resolvedBy: null, closedAt: null, closedBy: null, downtimeSeconds: null, rootCause: null, impact: null, resolution: null, preventiveActions: null, postmortemRequired: d.postmortemRequired, postmortemCompletedAt: null, clientVisibility: "INTERNAL", reopenedCount: 0, lastReopenedAt: null, escalationLevel: 0, lastEscalatedAt: null, createdAt: stamp, updatedAt: stamp };
        this.incidents.set(incident.id, incident);
        applied = true;
      }
    } else if (action) {
      const current = this.incidents.get(action.id);
      if (current && action.expectedStatuses.includes(current.status)) {
        incident = applyIncidentPatch(current, action.patch);
        if (activeStatuses.has(incident.status) && [...this.incidents.values()].some((item) => item.id !== incident!.id && item.monitorId === row.id && activeStatuses.has(item.status))) incident = null;
        else { this.incidents.set(incident.id, incident); applied = true; }
      }
    }
    this.sideEffects(applied ? incident : null, view, applied ? payload.incidentEvents : [], payload.monitoringEvents.filter((event) => applied || !event.requiresIncident), payload.outbox.filter((event) => applied || !event.requiresIncident));
    const s = payload.state;
    Object.assign(row, { status: s.status, statusReason: s.statusReason, statusChangedAt: s.status !== row.status ? c.checkedAt : row.statusChangedAt, consecutiveFailures: s.consecutiveFailures, consecutiveSuccesses: s.consecutiveSuccesses, failureStreakStartedAt: s.failureStreakStartedAt, lastCheckedAt: c.checkedAt, lastSuccessAt: c.success ? c.checkedAt : row.lastSuccessAt, lastFailureAt: c.success ? row.lastFailureAt : c.checkedAt, lastStatusCode: c.statusCode, lastLatencyMs: c.latencyMs, lastErrorType: c.errorType, lastErrorMessage: c.errorMessage, nextCheckAt: s.nextCheckAt, leaseOwner: null, leaseExpiresAt: null, stateVersion: row.stateVersion + 1, updatedAt: iso() });
    return { checkId: check.id, incidentId: incident?.id ?? null, incidentNumber: incident?.incidentNumber ?? null, incidentApplied: applied, stateVersion: row.stateVersion };
  }

  private sideEffects(incident: Incident | null, scope: { projectId: string | null; clientId: string | null; endpointId: string | null; monitorId?: string | null; id?: string }, incidentEvents: IncidentEventDraft[], monitoringEvents: MonitoringEventDraft[], outbox: OutboxDraft[]) {
    const monitorId = scope.monitorId ?? (scope as { id?: string }).id ?? null;
    if (incident) for (const event of incidentEvents) this.incidentEventLog.push({ id: randomUUID(), incidentId: incident.id, eventType: event.eventType, fromStatus: event.fromStatus ?? null, toStatus: event.toStatus ?? null, actorId: event.actorId ?? null, actorType: event.actorType, message: event.message ?? null, visibility: event.visibility ?? "INTERNAL", metadata: event.metadata ?? {}, occurredAt: event.occurredAt ?? iso() });
    for (const event of monitoringEvents) this.events.unshift({ id: randomUUID(), projectId: incident?.projectId ?? scope.projectId, clientId: incident?.clientId ?? scope.clientId, endpointId: incident?.endpointId ?? scope.endpointId, monitorId, incidentId: event.attachIncident === false ? null : incident?.id ?? null, maintenanceWindowId: event.maintenanceWindowId ?? null, eventType: event.eventType, tone: event.tone, title: event.title.replace("{incidentNumber}", incident?.incidentNumber ?? ""), visibility: event.visibility ?? "INTERNAL", actorId: event.actorId ?? null, payload: { ...(event.payload ?? {}), ...(incident ? { incidentNumber: incident.incidentNumber } : {}) }, occurredAt: event.occurredAt ?? iso() });
    for (const event of outbox) this.outbox.push({ id: randomUUID(), aggregateType: event.aggregateType ?? "INCIDENT", aggregateId: (event.aggregateType === "MONITOR" ? monitorId : incident?.id ?? monitorId) ?? "", eventType: event.eventType, payload: { ...(event.payload ?? {}), incidentId: incident?.id ?? null, incidentNumber: incident?.incidentNumber ?? null, monitorId, projectId: incident?.projectId ?? scope.projectId, clientId: incident?.clientId ?? scope.clientId }, occurredAt: iso(), attempts: 0, processedAt: null, leaseOwner: null, leaseExpiresAt: null, lastError: null });
  }

  async listChecks(monitorId: string, filter: CheckFilter): Promise<Paged<MonitorCheck>> {
    const items = this.checks.filter((check) => check.monitorId === monitorId && (filter.success === undefined || check.success === filter.success) && (!filter.statusCode || check.statusCode === filter.statusCode) && (!filter.from || check.checkedAt >= filter.from) && (!filter.to || check.checkedAt <= filter.to)).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
    return paged(items, filter.page, filter.pageSize);
  }
  async checksBetween(monitorId: string, from: string, to: string, limit: number) { return this.checks.filter((check) => check.monitorId === monitorId && check.checkedAt >= from && check.checkedAt <= to).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)).slice(0, limit); }

  async dueSslMonitors(limit: number) {
    const now = iso();
    const due = [...this.monitors.values()].filter((row) => row.enabled && row.sslMonitoringEnabled && row.sslNextCheckAt <= now && row.monitorType === "HTTPS").slice(0, limit);
    return (await Promise.all(due.map((row) => this.view(row)))).filter((item): item is MonitorView => Boolean(item));
  }
  async recordSsl(monitorId: string, observation: CertificateObservation, nextCheckAt: string) {
    const row = this.monitors.get(monitorId); if (!row) return;
    this.sslLog.push({ ...observation, monitorId });
    Object.assign(row, { sslStatus: observation.status, sslExpiresAt: observation.expiresAt ?? (observation.status === "UNKNOWN" ? row.sslExpiresAt : null), sslIssuer: observation.issuer ?? row.sslIssuer, sslSubject: observation.subject ?? row.sslSubject, sslErrorType: observation.errorType, sslFingerprint: observation.fingerprint ?? row.sslFingerprint, sslCheckedAt: observation.observedAt, sslNextCheckAt: nextCheckAt });
  }

  async listIncidents(filter: IncidentFilter) {
    const items = [...this.incidents.values()].filter((item) => (!filter.projectIds || (item.projectId !== null && filter.projectIds.includes(item.projectId))) && (!filter.state || filter.state === "all" || (filter.state === "open" ? activeStatuses.has(item.status) : !activeStatuses.has(item.status)))
      && (!filter.status || item.status === filter.status) && (!filter.severity || item.severity === filter.severity) && (!filter.projectId || item.projectId === filter.projectId) && (!filter.clientId || item.clientId === filter.clientId)
      && (!filter.monitorId || item.monitorId === filter.monitorId) && (!filter.endpointId || item.endpointId === filter.endpointId) && (!filter.assignedTo || item.assignedTo === filter.assignedTo) && (!filter.from || item.detectedAt >= filter.from) && (!filter.to || item.detectedAt <= filter.to))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
    return paged(items, filter.page, filter.pageSize);
  }
  async getIncident(id: string) { return this.incidents.get(id); }
  async incidentEvents(id: string) { return this.incidentEventLog.filter((event) => event.incidentId === id).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)); }
  async mutateIncident(id: string, expectedStatus: IncidentStatus | null, patch: IncidentPatch, incidentEvents: IncidentEventDraft[], monitoringEvents: MonitoringEventDraft[], outbox: OutboxDraft[], guard: IncidentMutationGuard = {}) {
    const current = this.incidents.get(id);
    if (!current) throw new MonitoringError("INCIDENT_NOT_FOUND");
    if (expectedStatus && current.status !== expectedStatus) return null;
    if (guard.escalationBelow !== undefined && current.escalationLevel >= guard.escalationBelow) return null;
    if (guard.unacknowledged && current.acknowledgedAt) return null;
    const next = applyIncidentPatch(current, patch);
    this.incidents.set(id, next);
    this.sideEffects(next, { projectId: next.projectId, clientId: next.clientId, endpointId: next.endpointId, monitorId: next.monitorId }, incidentEvents, monitoringEvents, outbox);
    return next;
  }
  async incidentLinks(id: string) { return this.links.filter((link) => link.incidentId === id); }
  async addIncidentLink(input: Omit<IncidentLink, "id" | "createdAt">) {
    const existing = this.links.find((link) => link.incidentId === input.incidentId && link.linkType === input.linkType && link.targetId && link.targetId === input.targetId);
    if (existing) return existing;
    const link = { ...input, id: randomUUID(), createdAt: iso() }; this.links.push(link); return link;
  }
  async incidentsForEscalation() { return [...this.incidents.values()].filter((item) => ["DETECTED", "CONFIRMED"].includes(item.status) && !item.acknowledgedAt); }
  async incidentsForAutoResolve(minutes: number, now: Date) { return [...this.incidents.values()].filter((item) => item.status === "MONITORING" && item.recoveredAt && new Date(item.recoveredAt).getTime() <= now.getTime() - minutes * 60_000); }

  private async maintenanceView(window: MaintenanceWindow): Promise<MaintenanceWindow> {
    const project = await this.operations.getProject(window.projectId);
    const endpoint = window.endpointId ? await this.operations.getEndpoint(window.endpointId) : undefined;
    return { ...window, projectName: project?.name ?? null, endpointName: endpoint?.name ?? null, clientId: project?.clientId ?? null };
  }
  async listMaintenance(filter: MaintenanceFilter) {
    const items = [...this.windows.values()].filter((w) => (!filter.projectIds || filter.projectIds.includes(w.projectId)) && (!filter.projectId || w.projectId === filter.projectId) && (!filter.clientId || w.clientId === filter.clientId) && (!filter.status || w.status === filter.status) && (!filter.from || w.endsAt >= filter.from) && (!filter.to || w.startsAt <= filter.to)).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return Promise.all(items.map((item) => this.maintenanceView(item)));
  }
  async getMaintenance(id: string) { const item = this.windows.get(id); return item ? this.maintenanceView(item) : undefined; }
  async createMaintenance(input: MaintenanceInput) {
    if (input.endpointId) { const endpoint = await this.operations.getEndpoint(input.endpointId); if (endpoint?.projectId !== input.projectId) throw new MonitoringError("MONITOR_NOT_FOUND", "El endpoint debe pertenecer al proyecto de la ventana."); }
    const stamp = iso(), now = new Date();
    const window: MaintenanceWindow = { ...input, id: randomUUID(), projectName: null, endpointName: null, clientId: null, status: "PLANNED", cancelledAt: null, startedAt: null, completedAt: null, createdAt: stamp, updatedAt: stamp };
    if (new Date(window.startsAt) <= now && new Date(window.endsAt) > now) Object.assign(window, { status: "ACTIVE", startedAt: stamp });
    this.windows.set(window.id, window);
    return this.maintenanceView(window);
  }
  async updateMaintenance(id: string, patch: Partial<MaintenanceWindow>) { const current = this.windows.get(id); if (!current) throw new MonitoringError("MONITOR_NOT_FOUND", "Ventana no encontrada."); const next = { ...current, ...patch, id, updatedAt: iso() }; this.windows.set(id, next); return this.maintenanceView(next); }
  async runMaintenanceTransitions(now: Date) {
    const started: MaintenanceWindow[] = [], completed: MaintenanceWindow[] = [];
    for (const window of this.windows.values()) {
      if (window.status === "PLANNED" && new Date(window.startsAt) <= now && new Date(window.endsAt) > now) { Object.assign(window, { status: "ACTIVE", startedAt: now.toISOString(), updatedAt: iso() }); started.push(window); this.sideEffects(null, { projectId: window.projectId, clientId: window.clientId, endpointId: window.endpointId, monitorId: null }, [], [{ eventType: "MAINTENANCE_STARTED", tone: "INFO", title: `Inició la ventana de mantenimiento «${window.title}».`, maintenanceWindowId: window.id, visibility: window.clientVisibility }], [{ aggregateType: "MAINTENANCE_WINDOW", eventType: "MAINTENANCE_STARTED" }]); }
      else if (["PLANNED", "ACTIVE"].includes(window.status) && new Date(window.endsAt) <= now) { Object.assign(window, { status: "COMPLETED", startedAt: window.startedAt ?? window.startsAt, completedAt: now.toISOString(), updatedAt: iso() }); completed.push(window); this.sideEffects(null, { projectId: window.projectId, clientId: window.clientId, endpointId: window.endpointId, monitorId: null }, [], [{ eventType: "MAINTENANCE_COMPLETED", tone: "SUCCESS", title: `Finalizó la ventana de mantenimiento «${window.title}».`, maintenanceWindowId: window.id, visibility: window.clientVisibility }], [{ aggregateType: "MAINTENANCE_WINDOW", eventType: "MAINTENANCE_COMPLETED" }]); }
    }
    for (const row of this.monitors.values()) {
      const endpoint = await this.operations.getEndpoint(row.endpointId);
      if (row.status === "MAINTENANCE" && !row.leaseOwner && endpoint && !this.activeWindow(endpoint.projectId, endpoint.id, now)) Object.assign(row, { status: row.enabled ? "UNKNOWN" : "DISABLED", statusReason: "Ventana de mantenimiento finalizada; esperando próximo check", statusChangedAt: iso(), nextCheckAt: iso(), stateVersion: row.stateVersion + 1 });
    }
    return { started: await Promise.all(started.map((item) => this.maintenanceView(item))), completed: await Promise.all(completed.map((item) => this.maintenanceView(item))) };
  }

  async insertDeliveries(rows: AlertDeliveryDraft[]) {
    const inserted: AlertDelivery[] = [];
    for (const row of rows) { if (this.deliveries.has(row.dedupKey)) continue; const delivery: AlertDelivery = { ...row, id: randomUUID(), readAt: null, createdAt: iso() }; this.deliveries.set(row.dedupKey, delivery); inserted.push(delivery); }
    return inserted;
  }
  async updateDelivery(id: string, patch: Partial<Pick<AlertDelivery, "status" | "sentAt">>) { const item = [...this.deliveries.values()].find((delivery) => delivery.id === id); if (item) Object.assign(item, patch); }
  async listAlertsFor(userId: string | null, role: string, limit: number, projectIds: string[] | null) {
    return [...this.deliveries.values()].filter((item) => item.channel === "IN_APP" && ((userId && item.recipientUserId === userId) || (item.recipientRole === role && (!projectIds || !item.projectId || projectIds.includes(item.projectId))))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }
  async markAlertRead(id: string, userId: string | null, role: string) {
    const item = [...this.deliveries.values()].find((delivery) => delivery.id === id && ((userId && delivery.recipientUserId === userId) || delivery.recipientRole === role));
    if (!item) return false; item.readAt = item.readAt ?? iso(); return true;
  }

  async listEvents(filter: EventFilter) {
    const items = this.events.filter((event) => (!filter.projectIds || (event.projectId && filter.projectIds.includes(event.projectId))) && (!filter.projectId || event.projectId === filter.projectId) && (!filter.clientId || event.clientId === filter.clientId) && (!filter.monitorId || event.monitorId === filter.monitorId) && (!filter.incidentId || event.incidentId === filter.incidentId) && (!filter.eventType || event.eventType === filter.eventType) && (!filter.from || event.occurredAt >= filter.from) && (!filter.to || event.occurredAt <= filter.to)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return paged(items, filter.page, filter.pageSize);
  }
  async publishEvents(context: { projectId: string | null; clientId: string | null; endpointId: string | null; monitorId: string | null; incidentId: string | null }, events: MonitoringEventDraft[], outbox: OutboxDraft[]) {
    this.sideEffects(context.incidentId ? this.incidents.get(context.incidentId) ?? null : null, context, [], events, outbox);
  }
  async claimOutbox(workerId: string, limit: number, leaseSeconds: number) {
    const now = Date.now(), claimed = this.outbox.filter((item) => !item.processedAt && (!item.leaseExpiresAt || Date.parse(item.leaseExpiresAt) < now)).slice(0, limit);
    for (const item of claimed) { item.leaseOwner = workerId; item.leaseExpiresAt = new Date(now + leaseSeconds * 1000).toISOString(); item.attempts += 1; }
    return claimed.map(({ id, aggregateType, aggregateId, eventType, payload, occurredAt, attempts }) => ({ id, aggregateType, aggregateId, eventType, payload, occurredAt, attempts }));
  }
  async completeOutbox(id: string, workerId: string, error: string | null) {
    const item = this.outbox.find((entry) => entry.id === id && entry.leaseOwner === workerId); if (!item) return;
    item.lastError = error; item.leaseOwner = null; item.leaseExpiresAt = null; if (!error) item.processedAt = iso();
  }

  private within(monitorId: string, ms: number) { const from = Date.now() - ms; return this.checks.filter((check) => check.monitorId === monitorId && new Date(check.checkedAt).getTime() >= from); }
  async monitorStats(monitorId: string): Promise<MonitorStats> {
    const policy = this.settings.uptimeMaintenancePolicy, hour = 3_600_000, day = 24 * hour;
    const all = this.checks.filter((check) => check.monitorId === monitorId);
    return {
      uptime: { h1: uptimeOf(this.within(monitorId, hour), policy), h24: uptimeOf(this.within(monitorId, day), policy), d7: uptimeOf(this.within(monitorId, 7 * day), policy), d30: uptimeOf(this.within(monitorId, 30 * day), policy), d90: uptimeOf(this.within(monitorId, 90 * day), policy) },
      latency: { h1: latencyOf(this.within(monitorId, hour)), h24: latencyOf(this.within(monitorId, day)), d7: latencyOf(this.within(monitorId, 7 * day)), d30: latencyOf(this.within(monitorId, 30 * day)) },
      current: this.monitors.get(monitorId)?.lastLatencyMs ?? null, firstCheckAt: all.map((check) => check.checkedAt).sort()[0] ?? null, maintenancePolicy: policy, generatedAt: iso(),
    };
  }
  async fleetStats(monitorIds: string[]) {
    const policy = this.settings.uptimeMaintenancePolicy, day = 86_400_000, result: Record<string, MonitoringFleetEntry> = {};
    for (const id of monitorIds) {
      const h24 = this.within(id, day), latency = latencyOf(h24);
      result[id] = { uptime24h: uptimeOf(h24, policy).percentage, uptime7d: uptimeOf(this.within(id, 7 * day), policy).percentage, uptime30d: uptimeOf(this.within(id, 30 * day), policy).percentage, uptime90d: uptimeOf(this.within(id, 90 * day), policy).percentage, avgLatency24h: latency.avg, p95Latency24h: latency.p95, firstDay: this.checks.filter((check) => check.monitorId === id).map((check) => check.checkedAt).sort()[0] ?? null };
    }
    return result;
  }
  async buckets(monitorIds: string[], granularity: "hour" | "day", from: string) {
    const result: Record<string, UptimeBucket[]> = {};
    for (const id of monitorIds) result[id] = bucketize(this.checks.filter((check) => check.monitorId === id && check.checkedAt >= from), granularity, this.settings.uptimeMaintenancePolicy);
    return result;
  }
  async latencyRanking(monitorIds: string[], hours: number) {
    const result: Record<string, LatencyWindow> = {};
    for (const id of monitorIds) { const window = latencyOf(this.within(id, hours * 3_600_000)); if (window.samples) result[id] = window; }
    return result;
  }
  async refreshRollups() { return 0; }
  async purge() {
    const cutoff = Date.now() - this.settings.rawRetentionDays * 86_400_000, before = this.checks.length;
    for (let index = this.checks.length - 1; index >= 0; index--) if (new Date(this.checks[index]!.checkedAt).getTime() < cutoff) this.checks.splice(index, 1);
    return { rawDeleted: before - this.checks.length, skipped: false };
  }

  async heartbeat(input: import("./monitoring.store.js").WorkerHeartbeatInput) {
    const current = this.heartbeats.get(input.workerId);
    const nextJobAt = [...this.monitors.values()].filter((item) => item.enabled).sort((a, b) => a.nextCheckAt.localeCompare(b.nextCheckAt))[0]?.nextCheckAt ?? null;
    const lastCheckAt = [...this.checks].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0]?.checkedAt ?? null;
    this.heartbeats.set(input.workerId, { ...input, startedAt: current?.startedAt ?? iso(), lastSeenAt: iso(), nextJobAt, queueLagSeconds: nextJobAt ? Math.max(0, Math.floor((Date.now() - Date.parse(nextJobAt)) / 1000)) : null, lastCheckAt });
  }
  async listHeartbeats() { return [...this.heartbeats.values()].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)); }

  async projectIdsForUser(userId: string) { return this.operations.projectIdsForUser(userId); }
  async getProject(id: string) { return this.operations.getProject(id); }
  async projectMemberIds(projectId: string) { return (await this.operations.listMembers(projectId)).map((member) => member.userId); }
  async recentDeployments(projectId: string, before: string, limit: number) { return (await this.operations.listDeployments({ page: 1, pageSize: 100, projectId })).items.filter((item) => item.createdAt <= before).slice(0, limit); }
  async createTask(input: Partial<OperationsTask>) { return this.operations.createTask(input); }
  async getTask(id: string) { return this.operations.getTask(id); }

  /** Sólo para tests: permite simular el paso del tiempo sobre evidencia ya registrada. */
  shiftIncidentTimes(id: string, patch: Partial<Incident>) { const current = this.incidents.get(id); if (current) this.incidents.set(id, { ...current, ...patch }); }
  allDeliveries() { return [...this.deliveries.values()]; }
  forceDue(id: string) { const row = this.monitors.get(id); if (row) row.nextCheckAt = new Date(Date.now() - 1000).toISOString(); }
}

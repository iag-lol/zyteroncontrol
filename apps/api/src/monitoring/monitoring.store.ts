import type { OperationsProject, OperationsTask, ProjectDeployment, ProjectEndpoint } from "@zyteron/contracts";
import type {
  AlertDelivery, AlertRule, Incident, IncidentEvent, IncidentLink, IncidentStatus, LatencyWindow, MaintenanceWindow, MonitorCheck, MonitorConfig, MonitorStats,
  MonitoringEvent, MonitoringFleetEntry, MonitoringSettings, MonitorView, Paged, SeverityRule, UptimeBucket, WorkerHeartbeat,
} from "@zyteron/contracts/monitoring";
import type { CertificateObservation } from "./certificate-probe.js";
import { ServiceUnavailableException } from "@nestjs/common";
import type {
  ApplyCheckPayload, ApplyCheckResult, EngineContext, IncidentEventDraft, IncidentPatch, MonitorExecution, MonitoringEventDraft, OutboxDraft,
} from "./monitoring.types.js";

export const MONITORING_STORE = Symbol("MONITORING_STORE");

export interface MonitorFilter { projectIds: string[] | null; projectId?: string; clientId?: string; status?: string; environment?: string; responsibleUserId?: string; search?: string; endpointId?: string }
export interface IncidentFilter { projectIds: string[] | null; state?: "open" | "closed" | "all"; status?: string; severity?: string; projectId?: string; clientId?: string; monitorId?: string; endpointId?: string; assignedTo?: string; from?: string; to?: string; page: number; pageSize: number }
export interface CheckFilter { page: number; pageSize: number; success?: boolean; statusCode?: number; from?: string; to?: string }
export interface MaintenanceFilter { projectIds: string[] | null; projectId?: string; clientId?: string; status?: string; from?: string; to?: string }
export interface EventFilter { projectIds: string[] | null; projectId?: string; clientId?: string; monitorId?: string; incidentId?: string; eventType?: string; from?: string; to?: string; page: number; pageSize: number }
export interface EndpointView extends Omit<ProjectEndpoint, "projectId"> { projectId: string | null; clientId: string | null; clientName: string | null; projectName: string | null; projectNumber: string | null }
export interface MonitoringEndpointInput extends Partial<ProjectEndpoint> { clientId?: string | null }
export interface AlertDeliveryDraft extends Omit<AlertDelivery, "id" | "createdAt" | "readAt"> { maintenanceWindowId?: string | null }
export interface IncidentMutationGuard { escalationBelow?: number; unacknowledged?: boolean }
export interface MaintenanceInput { projectId: string; endpointId: string | null; title: string; description: string | null; clientSummary: string | null; startsAt: string; endsAt: string; suppressAlerts: boolean; clientVisibility: "INTERNAL" | "CLIENT_VISIBLE"; createdBy: string | null }
export interface WorkerHeartbeatInput { workerId: string; hostname: string; checksExecuted: number; lastError: string | null; releaseSha: string | null; persistenceMode: string; schedulerActive: boolean; processRole: string; }
export interface MonitoringOutboxEvent { id: string; aggregateType: string; aggregateId: string; eventType: string; payload: Record<string, unknown>; occurredAt: string; attempts: number; }

export interface MonitoringStore {
  readonly mode: "supabase" | "memory" | "unavailable";
  getSettings(): Promise<MonitoringSettings>;
  updateSettings(patch: Partial<MonitoringSettings>, actorId: string | null): Promise<MonitoringSettings>;
  listSeverityRules(): Promise<SeverityRule[]>;
  listAlertRules(): Promise<AlertRule[]>;
  createAlertRule(input: Omit<AlertRule, "id" | "createdAt" | "updatedAt">): Promise<AlertRule>;
  updateAlertRule(id: string, patch: Partial<AlertRule>): Promise<AlertRule>;

  listMonitors(filter: MonitorFilter): Promise<MonitorView[]>;
  getMonitor(id: string): Promise<MonitorView | undefined>;
  createMonitor(endpointId: string, config: MonitorConfig, actorId: string | null): Promise<MonitorView>;
  updateMonitor(id: string, patch: Partial<MonitorConfig>): Promise<MonitorView>;
  setMonitorEnabled(id: string, enabled: boolean): Promise<MonitorView>;
  getEndpoint(id: string): Promise<EndpointView | undefined>;
  listEndpoints(projectIds: string[] | null, projectId?: string): Promise<EndpointView[]>;
  createEndpoint(projectId: string | null, input: MonitoringEndpointInput): Promise<EndpointView>;
  updateEndpoint(id: string, patch: Partial<ProjectEndpoint>): Promise<EndpointView>;

  claimDue(workerId: string, limit: number, leaseSeconds: number): Promise<MonitorExecution[]>;
  claimMonitor(id: string, workerId: string, leaseSeconds: number, cooldownSeconds: number): Promise<MonitorExecution>;
  releaseLease(id: string, workerId: string, retrySeconds: number): Promise<void>;
  engineContext(monitor: MonitorExecution, now: Date, reopenWindowMinutes: number): Promise<EngineContext>;
  applyCheck(payload: ApplyCheckPayload): Promise<ApplyCheckResult>;
  listChecks(monitorId: string, filter: CheckFilter): Promise<Paged<MonitorCheck>>;
  checksBetween(monitorId: string, from: string, to: string, limit: number): Promise<MonitorCheck[]>;

  dueSslMonitors(limit: number): Promise<MonitorView[]>;
  recordSsl(monitorId: string, observation: CertificateObservation, nextCheckAt: string): Promise<void>;

  listIncidents(filter: IncidentFilter): Promise<Paged<Incident>>;
  getIncident(id: string): Promise<Incident | undefined>;
  incidentEvents(id: string): Promise<IncidentEvent[]>;
  mutateIncident(id: string, expectedStatus: IncidentStatus | null, patch: IncidentPatch, incidentEvents: IncidentEventDraft[], monitoringEvents: MonitoringEventDraft[], outbox: OutboxDraft[], guard?: IncidentMutationGuard): Promise<Incident | null>;
  incidentLinks(id: string): Promise<IncidentLink[]>;
  addIncidentLink(input: Omit<IncidentLink, "id" | "createdAt">): Promise<IncidentLink>;
  incidentsForEscalation(): Promise<Incident[]>;
  incidentsForAutoResolve(minutes: number, now: Date): Promise<Incident[]>;

  listMaintenance(filter: MaintenanceFilter): Promise<MaintenanceWindow[]>;
  getMaintenance(id: string): Promise<MaintenanceWindow | undefined>;
  createMaintenance(input: MaintenanceInput): Promise<MaintenanceWindow>;
  updateMaintenance(id: string, patch: Partial<MaintenanceWindow>): Promise<MaintenanceWindow>;
  runMaintenanceTransitions(now: Date): Promise<{ started: MaintenanceWindow[]; completed: MaintenanceWindow[] }>;

  insertDeliveries(rows: AlertDeliveryDraft[]): Promise<AlertDelivery[]>;
  updateDelivery(id: string, patch: Partial<Pick<AlertDelivery, "status" | "sentAt">> & { providerReference?: string | null; errorMessage?: string | null }): Promise<void>;
  listAlertsFor(userId: string | null, role: string, limit: number, projectIds: string[] | null): Promise<AlertDelivery[]>;
  markAlertRead(id: string, userId: string | null, role: string): Promise<boolean>;

  listEvents(filter: EventFilter): Promise<Paged<MonitoringEvent>>;
  publishEvents(context: { projectId: string | null; clientId: string | null; endpointId: string | null; monitorId: string | null; incidentId: string | null }, events: MonitoringEventDraft[], outbox: OutboxDraft[]): Promise<void>;
  claimOutbox(workerId: string, limit: number, leaseSeconds: number): Promise<MonitoringOutboxEvent[]>;
  completeOutbox(id: string, workerId: string, error: string | null): Promise<void>;

  monitorStats(monitorId: string): Promise<MonitorStats>;
  fleetStats(monitorIds: string[]): Promise<Record<string, MonitoringFleetEntry>>;
  buckets(monitorIds: string[], granularity: "hour" | "day", from: string): Promise<Record<string, UptimeBucket[]>>;
  latencyRanking(monitorIds: string[], hours: number): Promise<Record<string, LatencyWindow>>;
  refreshRollups(from: string, to: string): Promise<number>;
  purge(): Promise<Record<string, unknown>>;

  heartbeat(input: WorkerHeartbeatInput): Promise<void>;
  listHeartbeats(): Promise<WorkerHeartbeat[]>;

  projectIdsForUser(userId: string): Promise<string[]>;
  getProject(id: string): Promise<OperationsProject | undefined>;
  projectMemberIds(projectId: string): Promise<string[]>;
  recentDeployments(projectId: string, before: string, limit: number): Promise<ProjectDeployment[]>;
  createTask(input: Partial<OperationsTask>): Promise<OperationsTask>;
  getTask(id: string): Promise<OperationsTask | undefined>;
}

/**
 * Mantiene el API levantado para que health-checks y otros dominios sigan disponibles, pero hace
 * fallar Monitoreo de forma explícita. Nunca convierte una falta de Supabase en datos volátiles.
 */
export function unavailableMonitoringStore(): MonitoringStore {
  const failure = () => Promise.reject(new ServiceUnavailableException("Monitoreo no está disponible: falta configurar la persistencia Supabase del API."));
  return new Proxy({ mode: "unavailable" } as MonitoringStore, {
    get(target, property) {
      if (property === "mode") return target.mode;
      if (property === "then") return undefined;
      return failure;
    },
  });
}

export class MonitoringError extends Error {
  constructor(readonly code: "MONITOR_NOT_FOUND" | "MONITOR_DISABLED" | "MONITOR_BUSY" | "MONITOR_COOLDOWN" | "MONITOR_LEASE_LOST" | "INCIDENT_NOT_FOUND", message?: string) { super(message ?? code); }
}

export const defaultSettings: MonitoringSettings = {
  rawRetentionDays: 30, hourlyRetentionDays: 90, dailyRetentionDays: 730, reopenWindowMinutes: 30, recoveryPolicy: "MONITORING", autoResolveAfterMinutes: 30,
  uptimeMaintenancePolicy: "EXCLUDE", postmortemSeverities: ["HIGH", "CRITICAL"], sslAlertDays: [90, 60, 30, 15, 7, 3, 1], sslWarningDays: 30, sslCheckIntervalMinutes: 360,
  manualCheckCooldownSeconds: 60, perHostConcurrency: 2, contentInspectBytes: 65536,
};

export const defaultEscalationPolicy: AlertRule["escalationPolicy"] = {
  steps: [{ afterMinutes: 0, targets: ["ENDPOINT_RESPONSIBLE", "DEVELOPMENT_MANAGER", "GENERAL_MANAGER"] }, { afterMinutes: 5, targets: ["PROJECT_LEAD"] }],
  criticalImmediateTargets: [],
};
export const defaultNotifyEvents = ["INCIDENT_CONFIRMED", "INCIDENT_ESCALATED", "ENDPOINT_RECOVERED", "INCIDENT_RESOLVED", "SSL_EXPIRING", "SSL_EXPIRED", "LATENCY_DEGRADED", "MAINTENANCE_STARTED", "MAINTENANCE_COMPLETED"];

export const defaultMonitorConfig: MonitorConfig = {
  monitorType: "HTTPS", enabled: true, intervalSeconds: 300, timeoutMs: 10_000, httpMethod: "GET", expectedStatusMin: 200, expectedStatusMax: 299, expectedContent: null,
  followRedirects: true, maxRedirects: 3, failureThreshold: 3, recoveryThreshold: 2, sslMonitoringEnabled: true, warningLatencyMs: null, criticalLatencyMs: null,
  incidentSeverity: null, maintenanceMode: "CHECK_AND_SUPPRESS", alertRuleId: null, clientVisibility: "INTERNAL",
};

export function paged<T>(items: T[], page: number, pageSize: number): Paged<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length, totalPages: Math.ceil(items.length / pageSize) };
}

const snakeToCamel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
export function applyIncidentPatch(incident: Incident, patch: IncidentPatch): Incident {
  const next: Record<string, unknown> = { ...incident };
  for (const [key, value] of Object.entries(patch)) next[snakeToCamel(key)] = value;
  return { ...(next as unknown as Incident), updatedAt: new Date().toISOString() };
}

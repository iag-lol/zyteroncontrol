// Contratos del Módulo 05 · Monitoreo / Site Reliability Center.
// Archivo independiente (subpath "@zyteron/contracts/monitoring") para no editar el índice compartido.

export const monitorStatuses = ["UNKNOWN", "ONLINE", "DEGRADED", "OFFLINE", "MAINTENANCE", "DISABLED"] as const;
export type MonitorStatus = (typeof monitorStatuses)[number];
export const monitorTypes = ["HTTP", "HTTPS", "TCP", "DNS", "API", "CUSTOM"] as const;
export type MonitorType = (typeof monitorTypes)[number];
/** Tipos con ejecutor real. El resto queda reservado y el backend impide activarlos. */
export const executableMonitorTypes: MonitorType[] = ["HTTP", "HTTPS"];
export const monitorIntervals = [60, 300, 600, 900, 1800, 3600] as const;
export type MonitorInterval = (typeof monitorIntervals)[number];
export const incidentSeverities = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IncidentSeverity = (typeof incidentSeverities)[number];
export const incidentStatuses = ["DETECTED", "CONFIRMED", "ACKNOWLEDGED", "INVESTIGATING", "MITIGATING", "MONITORING", "RESOLVED", "POSTMORTEM_REQUIRED", "CLOSED"] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];
export const activeIncidentStatuses: IncidentStatus[] = ["DETECTED", "CONFIRMED", "ACKNOWLEDGED", "INVESTIGATING", "MITIGATING", "MONITORING"];
export const sslStatuses = ["HEALTHY", "EXPIRING_SOON", "EXPIRED", "INVALID", "UNKNOWN", "NOT_APPLICABLE"] as const;
export type SslStatus = (typeof sslStatuses)[number];
export const maintenanceStatuses = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export type MaintenanceStatus = (typeof maintenanceStatuses)[number];
export const endpointEnvironments = ["PRODUCTION", "STAGING", "DEVELOPMENT", "QA", "DEMO"] as const;
export const endpointTypes = ["WEB", "API", "ADMIN", "CLIENT_PORTAL", "STAGING", "EXTERNAL_SERVICE"] as const;
export const alertChannels = ["IN_APP", "REALTIME", "EMAIL", "WEB_PUSH"] as const;
export type AlertChannel = (typeof alertChannels)[number];
export const alertTargets = ["ENDPOINT_RESPONSIBLE", "INCIDENT_ASSIGNEE", "PROJECT_LEAD", "DEVELOPMENT_MANAGER", "GENERAL_MANAGER", "PROJECT_MEMBERS"] as const;
export type AlertTarget = (typeof alertTargets)[number];
export type CheckErrorType = "TIMEOUT" | "DNS" | "CONNECTION" | "TLS" | "SSRF_BLOCKED" | "HTTP_STATUS" | "CONTENT_MISMATCH" | "REDIRECT_LIMIT" | "REDIRECT_LOOP" | "RESPONSE_TOO_LARGE" | "INVALID_URL" | "UNKNOWN";
export type SslErrorType = "EXPIRED" | "HOSTNAME_MISMATCH" | "UNTRUSTED" | "SELF_SIGNED" | "NOT_YET_VALID" | "TLS_FAILURE" | "CONNECTION" | "SSRF_BLOCKED" | "TIMEOUT";
export type Visibility = "INTERNAL" | "CLIENT_VISIBLE";
export type SoundProfile = "DEFAULT" | "URGENT" | "SILENT";

export interface MonitorConfig {
  monitorType: MonitorType; enabled: boolean; intervalSeconds: MonitorInterval; timeoutMs: number; httpMethod: "GET" | "HEAD";
  expectedStatusMin: number; expectedStatusMax: number; expectedContent: string | null; followRedirects: boolean; maxRedirects: number;
  failureThreshold: number; recoveryThreshold: number; sslMonitoringEnabled: boolean; warningLatencyMs: number | null; criticalLatencyMs: number | null;
  incidentSeverity: IncidentSeverity | null; maintenanceMode: "CHECK_AND_SUPPRESS" | "PAUSE_CHECKS"; alertRuleId: string | null; clientVisibility: Visibility;
}

export interface MonitorSslState { status: SslStatus; expiresAt: string | null; daysRemaining: number | null; issuer: string | null; subject: string | null; errorType: SslErrorType | null; checkedAt: string | null; }

export interface MonitorView extends MonitorConfig {
  id: string; endpointId: string; endpointName: string; url: string; environment: string; endpointType: string; responsibleUserId: string | null;
  projectId: string | null; projectName: string | null; projectNumber: string | null; projectPriority: string | null; projectLeadId: string | null; developmentManagerId: string | null;
  clientId: string | null; clientName: string | null;
  status: MonitorStatus; statusReason: string | null; statusChangedAt: string | null; consecutiveFailures: number; consecutiveSuccesses: number;
  lastCheckedAt: string | null; lastSuccessAt: string | null; lastFailureAt: string | null; lastStatusCode: number | null; lastLatencyMs: number | null;
  lastErrorType: CheckErrorType | null; lastErrorMessage: string | null; nextCheckAt: string | null; ssl: MonitorSslState;
  activeIncident: { id: string; incidentNumber: string; severity: IncidentSeverity; status: IncidentStatus; confirmedAt: string | null } | null;
  activeMaintenance: { id: string; title: string; endsAt: string; suppressAlerts: boolean } | null;
  createdBy: string | null; createdAt: string; updatedAt: string;
}

export interface MonitorCheck {
  id: string; monitorId: string; checkedAt: string; success: boolean; statusCode: number | null; latencyMs: number | null; errorType: CheckErrorType | null;
  errorCode: string | null; errorMessage: string | null; sslValid: boolean | null; sslExpiresAt: string | null; redirectCount: number; contentMatched: boolean | null;
  inMaintenance: boolean; triggerType: "SCHEDULED" | "MANUAL"; source: string | null;
}

export interface UptimeWindow { checks: number; successes: number; maintenanceChecks: number; percentage: number | null; }
export interface LatencyWindow { samples: number; avg: number | null; p50: number | null; p95: number | null; min: number | null; max: number | null; }
export interface MonitorStats {
  uptime: Partial<Record<"h1" | "h24" | "d7" | "d30" | "d90", UptimeWindow>>;
  latency: Partial<Record<"h1" | "h24" | "d7" | "d30", LatencyWindow>>;
  current: number | null; firstCheckAt: string | null; maintenancePolicy: "EXCLUDE" | "INCLUDE"; generatedAt: string;
}
export interface UptimeBucket { periodStart: string; checks: number; successes: number; failures: number; maintenanceChecks: number; uptime: number | null; avgLatencyMs: number | null; p95LatencyMs: number | null; }

export interface Incident {
  id: string; incidentNumber: string; projectId: string | null; projectName: string | null; endpointId: string | null; endpointName: string | null; endpointUrl: string | null;
  environment: string | null; monitorId: string | null; clientId: string | null; clientName: string | null; source: "MONITOR" | "MANUAL"; title: string;
  description: string | null; clientSummary: string | null; severity: IncidentSeverity; status: IncidentStatus; failureType: string | null;
  detectedAt: string; confirmedAt: string | null; acknowledgedAt: string | null; acknowledgedBy: string | null; assignedTo: string | null; assignedAt: string | null;
  currentOutageStartedAt: string | null; recoveredAt: string | null; resolvedAt: string | null; resolvedBy: string | null; closedAt: string | null; closedBy: string | null;
  downtimeSeconds: number | null; rootCause: string | null; impact: string | null; resolution: string | null; preventiveActions: string | null;
  postmortemRequired: boolean; postmortemCompletedAt: string | null; clientVisibility: Visibility; reopenedCount: number; lastReopenedAt: string | null;
  escalationLevel: number; lastEscalatedAt: string | null; createdAt: string; updatedAt: string;
}
export interface IncidentEvent { id: string; incidentId: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string | null; actorType: "USER" | "SYSTEM"; message: string | null; visibility: Visibility; metadata: Record<string, unknown>; occurredAt: string; }
export interface IncidentLink { id: string; incidentId: string; linkType: "TASK" | "BUG" | "DEPLOYMENT" | "EXTERNAL"; targetId: string | null; externalReference: string | null; createdBy: string | null; createdAt: string; }
export interface IncidentDeploymentContext { id: string; environment: string; version: string; status: string; recordType: string; startedAt: string | null; completedAt: string | null; createdAt: string; minutesBeforeDetection: number | null; }
export interface IncidentDetail { incident: Incident; events: IncidentEvent[]; links: IncidentLink[]; recentChecks: MonitorCheck[]; deployments: IncidentDeploymentContext[]; monitor: MonitorView | null; allowedTransitions: IncidentStatus[]; }

export interface MaintenanceWindow {
  id: string; projectId: string; projectName: string | null; endpointId: string | null; endpointName: string | null; clientId: string | null; title: string;
  description: string | null; clientSummary: string | null; startsAt: string; endsAt: string; status: MaintenanceStatus; suppressAlerts: boolean;
  clientVisibility: Visibility; createdBy: string | null; cancelledAt: string | null; startedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string;
}

export interface EscalationStep { afterMinutes: number; targets: AlertTarget[]; }
export interface AlertRule {
  id: string; name: string; scopeType: "GLOBAL" | "CLIENT" | "PROJECT" | "MONITOR"; clientId: string | null; projectId: string | null; monitorId: string | null;
  minSeverity: IncidentSeverity; enabled: boolean; channels: AlertChannel[]; notifyEvents: string[];
  escalationPolicy: { steps: EscalationStep[]; criticalImmediateTargets: AlertTarget[] }; recoveryTargets: AlertTarget[];
  soundProfile: SoundProfile; criticalSoundProfile: SoundProfile; createdBy: string | null; createdAt: string; updatedAt: string;
}
export interface AlertDelivery {
  id: string; dedupKey: string; incidentId: string | null; monitorId: string | null; projectId: string | null; ruleId: string | null; recipientUserId: string | null;
  recipientRole: string | null; channel: AlertChannel; stage: string; eventType: string; status: "QUEUED" | "ACCEPTED" | "DELIVERED" | "SENT" | "PROVIDER_NOT_CONFIGURED" | "NO_ADDRESS" | "FAILED" | "SUPPRESSED";
  title: string; body: string | null; href: string | null; severity: IncidentSeverity | null; soundProfile: SoundProfile; sentAt: string | null; readAt: string | null; createdAt: string;
}
export interface MonitoringEvent {
  id: string; projectId: string | null; clientId: string | null; endpointId: string | null; monitorId: string | null; incidentId: string | null; maintenanceWindowId: string | null;
  eventType: string; tone: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL"; title: string; visibility: Visibility; actorId: string | null; payload: Record<string, unknown>; occurredAt: string;
}
export interface MonitoringSettings {
  rawRetentionDays: number; hourlyRetentionDays: number; dailyRetentionDays: number; reopenWindowMinutes: number; recoveryPolicy: "MONITORING" | "AUTO_RESOLVE";
  autoResolveAfterMinutes: number | null; uptimeMaintenancePolicy: "EXCLUDE" | "INCLUDE"; postmortemSeverities: IncidentSeverity[]; sslAlertDays: number[];
  sslWarningDays: number; sslCheckIntervalMinutes: number; manualCheckCooldownSeconds: number; perHostConcurrency: number; contentInspectBytes: number;
}
export interface SeverityRule { id: string; name: string; environment: string | null; endpointType: string | null; projectPriority: string | null; clientId: string | null; severity: IncidentSeverity; enabled: boolean; }
export interface WorkerHeartbeat { workerId: string; hostname: string | null; startedAt: string; lastSeenAt: string; checksExecuted: number; lastError: string | null; releaseSha: string | null; persistenceMode: string; schedulerActive: boolean; processRole: string; nextJobAt: string | null; queueLagSeconds: number | null; lastCheckAt: string | null; }

export interface MonitoringFleetEntry { uptime24h: number | null; uptime7d: number | null; uptime30d: number | null; uptime90d: number | null; avgLatency24h: number | null; p95Latency24h: number | null; firstDay: string | null; }
export interface MonitoringDashboard {
  totals: Record<MonitorStatus, number> & { total: number };
  openIncidents: number; criticalIncidents: number; unacknowledgedIncidents: number; globalUptime24h: number | null; globalUptimeDefinition: string;
  sslExpiring: MonitorView[]; highLatency: MonitorView[]; recentRecoveries: MonitoringEvent[]; activeIncidents: Incident[]; events: MonitoringEvent[];
  monitors: MonitorView[]; fleet: Record<string, MonitoringFleetEntry>; workers: WorkerHeartbeat[]; realtimeConfigured: boolean; generatedAt: string;
}
export interface MonitoringScope { role: string; scope: "OWN" | "PROJECT" | "ASSIGNED" | "TEAM" | "DEPARTMENT" | "ALL"; permissions: string[]; }
export interface IncidentMetrics { incidents: number; resolved: number; mttaSeconds: number | null; mttaSamples: number; mttrSeconds: number | null; mttrSamples: number; meanDowntimeSeconds: number | null; totalDowntimeSeconds: number; }
export interface MonitoringMonthlyReport {
  clientId: string | null; month: string; from: string; to: string; monitors: Array<{ monitorId: string; endpointName: string; uptime: number | null; checks: number; avgLatencyMs: number | null; p95LatencyMs: number | null; ssl: MonitorSslState }>;
  incidents: Incident[]; metrics: IncidentMetrics; maintenance: MaintenanceWindow[]; maintenancePolicy: "EXCLUDE" | "INCLUDE"; generatedAt: string;
}
export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }
export interface ClientMonitoringSummary { clientId: string; monitors: MonitorView[]; fleet: Record<string, MonitoringFleetEntry>; openIncidents: Incident[]; recentIncidents: Incident[]; lastDowntime: { incidentNumber: string; at: string; downtimeSeconds: number | null } | null; maintenance: MaintenanceWindow[]; }

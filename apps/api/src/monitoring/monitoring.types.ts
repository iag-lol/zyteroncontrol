import type {
  CheckErrorType, IncidentSeverity, IncidentStatus, MonitorConfig, MonitorStatus, MonitoringSettings, SslStatus, Visibility,
} from "@zyteron/contracts/monitoring";

/** Contexto que el scheduler entrega al worker (equivale a monitoring_execution_payload en SQL). */
export interface MonitorExecution extends Omit<MonitorConfig, "clientVisibility"> {
  id: string; endpointId: string; projectId: string | null; clientId: string | null; status: MonitorStatus; statusReason: string | null;
  consecutiveFailures: number; consecutiveSuccesses: number; failureStreakStartedAt: string | null; lastLatencyMs: number | null;
  stateVersion: number; sslFingerprint: string | null; sslStatus: SslStatus; leaseOwner: string;
  endpoint: { id: string; name: string; url: string; environment: string; endpointType: string; responsibleUserId: string | null; active: boolean };
  project: { id: string | null; name: string | null; projectNumber: string | null; priority: string | null; projectLeadId: string | null; developmentManagerId: string | null; clientId: string | null; clientName: string | null };
}

export interface CheckOutcome {
  checkedAt: string; success: boolean; statusCode: number | null; latencyMs: number | null; errorType: CheckErrorType | null; errorCode: string | null;
  errorMessage: string | null; redirectCount: number; contentMatched: boolean | null; sslValid: boolean | null; sslExpiresAt: string | null;
}

export interface EngineIncident {
  id: string; incidentNumber: string; status: IncidentStatus; severity: IncidentSeverity; acknowledgedAt: string | null; confirmedAt: string | null;
  currentOutageStartedAt: string | null; recoveredAt: string | null; resolvedAt: string | null; downtimeSeconds: number | null; reopenedCount: number;
  postmortemRequired: boolean; assignedTo: string | null;
}

export interface MaintenanceContext { id: string; title: string; suppressAlerts: boolean; endsAt: string }

export interface EngineContext {
  activeIncident: EngineIncident | null; reopenCandidate: EngineIncident | null; maintenance: MaintenanceContext | null;
}

export interface IncidentEventDraft {
  eventType: string; fromStatus?: string | null; toStatus?: string | null; actorId?: string | null; actorType: "USER" | "SYSTEM"; message?: string | null;
  visibility?: Visibility; metadata?: Record<string, unknown>; occurredAt?: string;
}
export interface MonitoringEventDraft {
  eventType: string; tone: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL"; title: string; visibility?: Visibility; actorId?: string | null;
  payload?: Record<string, unknown>; occurredAt?: string; maintenanceWindowId?: string | null; attachIncident?: boolean; requiresIncident?: boolean;
}
export interface OutboxDraft { aggregateType?: "INCIDENT" | "MONITOR" | "MAINTENANCE_WINDOW"; eventType: string; payload?: Record<string, unknown>; requiresIncident?: boolean }

/** Claves en snake_case: se aplican con jsonb_populate_record en SQL y se traducen en memoria. */
export type IncidentPatch = Partial<Record<
  "status" | "severity" | "title" | "description" | "client_summary" | "confirmed_at" | "acknowledged_at" | "acknowledged_by" | "assigned_to" | "assigned_at" |
  "current_outage_started_at" | "recovered_at" | "resolved_at" | "resolved_by" | "closed_at" | "closed_by" | "downtime_seconds" | "root_cause" | "impact" |
  "resolution" | "preventive_actions" | "postmortem_required" | "postmortem_completed_at" | "client_visibility" | "reopened_count" | "last_reopened_at" |
  "escalation_level" | "last_escalated_at", string | number | boolean | null>>;

export interface IncidentDraft {
  title: string; description: string; severity: IncidentSeverity; failureType: string | null; detectedAt: string; confirmedAt: string;
  assignedTo: string | null; postmortemRequired: boolean;
}

export type IncidentAction =
  | { action: "CREATE"; draft: IncidentDraft }
  | { action: "REOPEN" | "RELAPSE" | "RECOVER"; id: string; expectedStatuses: IncidentStatus[]; patch: IncidentPatch };

export type AlertTriggerType = "INCIDENT_CONFIRMED" | "INCIDENT_REOPENED" | "INCIDENT_RELAPSED" | "ENDPOINT_RECOVERED" | "INCIDENT_RESOLVED" | "LATENCY_DEGRADED";

export interface MonitorStatePatch {
  status: MonitorStatus; statusReason: string; consecutiveFailures: number; consecutiveSuccesses: number; failureStreakStartedAt: string | null; nextCheckAt: string;
}

export interface EngineDecision {
  state: MonitorStatePatch; previousStatus: MonitorStatus; statusChanged: boolean; incident: IncidentAction | null;
  incidentEvents: IncidentEventDraft[]; monitoringEvents: MonitoringEventDraft[]; outbox: OutboxDraft[]; alerts: AlertTriggerType[];
}

export interface ApplyCheckPayload {
  monitorId: string; workerId: string; expectedVersion: number;
  check: CheckOutcome & { inMaintenance: boolean; triggerType: "SCHEDULED" | "MANUAL"; source: string };
  state: MonitorStatePatch; incident: IncidentAction | null; incidentEvents: IncidentEventDraft[]; monitoringEvents: MonitoringEventDraft[]; outbox: OutboxDraft[];
}
export interface ApplyCheckResult { checkId: string; incidentId: string | null; incidentNumber: string | null; incidentApplied: boolean; stateVersion: number }

export type { MonitoringSettings };

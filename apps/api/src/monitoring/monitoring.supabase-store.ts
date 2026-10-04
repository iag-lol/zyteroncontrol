import type { SupabaseClient } from "@supabase/supabase-js";
import type { OperationsTask, ProjectEndpoint } from "@zyteron/contracts";
import type {
  AlertDelivery, AlertRule, Incident, IncidentEvent, IncidentLink, IncidentStatus, LatencyWindow, MaintenanceWindow, MonitorCheck, MonitorConfig, MonitorStats,
  MonitoringEvent, MonitoringFleetEntry, MonitoringSettings, MonitorView, Paged, SeverityRule, UptimeBucket, WorkerHeartbeat,
} from "@zyteron/contracts/monitoring";
import type { OperationsRepository } from "../operations/operations.repository.js";
import { pageBounds } from "../domain/server-supabase.js";
import { daysUntil, type CertificateObservation } from "./certificate-probe.js";
import {
  MonitoringError, type AlertDeliveryDraft, type CheckFilter, type EndpointView, type EventFilter, type IncidentFilter, type IncidentMutationGuard,
  type MaintenanceFilter, type MaintenanceInput, type MonitorFilter, type MonitoringStore,
} from "./monitoring.store.js";
import type { ApplyCheckPayload, ApplyCheckResult, EngineContext, EngineIncident, IncidentEventDraft, IncidentPatch, MonitorExecution, MonitoringEventDraft, OutboxDraft } from "./monitoring.types.js";

const ACTIVE = ["DETECTED", "CONFIRMED", "ACKNOWLEDGED", "INVESTIGATING", "MITIGATING", "MONITORING"];
const MONITOR_SELECT = "*,project_endpoints!inner(id,name,url,environment,endpoint_type,responsible_user_id,active),projects!inner(id,name,project_number,priority,project_lead_id,development_manager_id),clients(legal_name,trade_name)";
const INCIDENT_SELECT = "*,projects(name),project_endpoints(name,url,environment),clients(legal_name,trade_name)";
const rel = (value: unknown): Record<string, any> | null => Array.isArray(value) ? (value[0] as Record<string, any>) ?? null : (value as Record<string, any>) ?? null;
const clientName = (value: unknown) => { const row = rel(value); return row ? String(row.trade_name || row.legal_name || "") || null : null; };
const num = (value: unknown) => value === null || value === undefined ? null : Number(value);
const configToRow = (config: Partial<MonitorConfig>) => {
  const map: Record<keyof MonitorConfig, string> = { monitorType: "monitor_type", enabled: "enabled", intervalSeconds: "interval_seconds", timeoutMs: "timeout_ms", httpMethod: "http_method", expectedStatusMin: "expected_status_min", expectedStatusMax: "expected_status_max", expectedContent: "expected_content", followRedirects: "follow_redirects", maxRedirects: "max_redirects", failureThreshold: "failure_threshold", recoveryThreshold: "recovery_threshold", sslMonitoringEnabled: "ssl_monitoring_enabled", warningLatencyMs: "warning_latency_ms", criticalLatencyMs: "critical_latency_ms", incidentSeverity: "incident_severity", maintenanceMode: "maintenance_mode", alertRuleId: "alert_rule_id", clientVisibility: "client_visibility" };
  return Object.fromEntries(Object.entries(config).filter(([key]) => key in map).map(([key, value]) => [map[key as keyof MonitorConfig], value]));
};
const rpcError = (error: { message?: string } | null) => {
  const message = error?.message ?? "";
  for (const code of ["MONITOR_NOT_FOUND", "MONITOR_DISABLED", "MONITOR_BUSY", "MONITOR_COOLDOWN", "MONITOR_LEASE_LOST", "INCIDENT_NOT_FOUND"] as const) if (message.includes(code)) return new MonitoringError(code);
  return error;
};

/** Persistencia en Supabase PostgreSQL. Las operaciones críticas usan RPC transaccionales de la migración. */
export class SupabaseMonitoringStore implements MonitoringStore {
  readonly mode = "supabase" as const;
  constructor(private readonly db: SupabaseClient, private readonly operations: OperationsRepository) {}

  async getSettings(): Promise<MonitoringSettings> {
    const { data, error } = await this.db.from("monitoring_settings").select("*").eq("id", true).single(); if (error) throw error;
    return { rawRetentionDays: data.raw_retention_days, hourlyRetentionDays: data.hourly_retention_days, dailyRetentionDays: data.daily_retention_days, reopenWindowMinutes: data.reopen_window_minutes, recoveryPolicy: data.recovery_policy, autoResolveAfterMinutes: data.auto_resolve_after_minutes, uptimeMaintenancePolicy: data.uptime_maintenance_policy, postmortemSeverities: data.postmortem_severities, sslAlertDays: data.ssl_alert_days, sslWarningDays: data.ssl_warning_days, sslCheckIntervalMinutes: data.ssl_check_interval_minutes, manualCheckCooldownSeconds: data.manual_check_cooldown_seconds, perHostConcurrency: data.per_host_concurrency, contentInspectBytes: data.content_inspect_bytes };
  }
  async updateSettings(patch: Partial<MonitoringSettings>, actorId: string | null) {
    const map: Record<string, string> = { rawRetentionDays: "raw_retention_days", hourlyRetentionDays: "hourly_retention_days", dailyRetentionDays: "daily_retention_days", reopenWindowMinutes: "reopen_window_minutes", recoveryPolicy: "recovery_policy", autoResolveAfterMinutes: "auto_resolve_after_minutes", uptimeMaintenancePolicy: "uptime_maintenance_policy", postmortemSeverities: "postmortem_severities", sslAlertDays: "ssl_alert_days", sslWarningDays: "ssl_warning_days", sslCheckIntervalMinutes: "ssl_check_interval_minutes", manualCheckCooldownSeconds: "manual_check_cooldown_seconds", perHostConcurrency: "per_host_concurrency", contentInspectBytes: "content_inspect_bytes" };
    const row: Record<string, unknown> = { updated_by: actorId, updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(patch)) if (map[key]) row[map[key]!] = value;
    const { error } = await this.db.from("monitoring_settings").update(row).eq("id", true); if (error) throw error;
    return this.getSettings();
  }
  async listSeverityRules(): Promise<SeverityRule[]> {
    const { data, error } = await this.db.from("monitor_severity_rules").select("*").eq("enabled", true); if (error) throw error;
    return (data ?? []).map((r) => ({ id: r.id, name: r.name, environment: r.environment, endpointType: r.endpoint_type, projectPriority: r.project_priority, clientId: r.client_id, severity: r.severity, enabled: r.enabled }));
  }
  private ruleFromRow = (r: any): AlertRule => ({ id: r.id, name: r.name, scopeType: r.scope_type, clientId: r.client_id, projectId: r.project_id, monitorId: r.monitor_id, minSeverity: r.min_severity, enabled: r.enabled, channels: r.channels, notifyEvents: r.notify_events, escalationPolicy: r.escalation_policy, recoveryTargets: r.recovery_targets, soundProfile: r.sound_profile, criticalSoundProfile: r.critical_sound_profile, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at });
  private ruleToRow = (r: Partial<AlertRule>) => { const map: Record<string, string> = { name: "name", scopeType: "scope_type", clientId: "client_id", projectId: "project_id", monitorId: "monitor_id", minSeverity: "min_severity", enabled: "enabled", channels: "channels", notifyEvents: "notify_events", escalationPolicy: "escalation_policy", recoveryTargets: "recovery_targets", soundProfile: "sound_profile", criticalSoundProfile: "critical_sound_profile", createdBy: "created_by" }; return Object.fromEntries(Object.entries(r).filter(([key]) => map[key]).map(([key, value]) => [map[key], value])); };
  async listAlertRules() { const { data, error } = await this.db.from("monitor_alert_rules").select("*").order("created_at"); if (error) throw error; return (data ?? []).map(this.ruleFromRow); }
  async createAlertRule(input: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) { const { data, error } = await this.db.from("monitor_alert_rules").insert(this.ruleToRow(input)).select("*").single(); if (error) throw error; return this.ruleFromRow(data); }
  async updateAlertRule(id: string, patch: Partial<AlertRule>) { const { data, error } = await this.db.from("monitor_alert_rules").update(this.ruleToRow(patch)).eq("id", id).select("*").single(); if (error) throw error; return this.ruleFromRow(data); }

  private async decorateMonitors(rows: any[]): Promise<MonitorView[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id), projectIds = [...new Set(rows.map((row) => row.project_id as string))], now = new Date().toISOString();
    const [incidents, windows] = await Promise.all([
      this.db.from("incidents").select("id,monitor_id,incident_number,severity,status,confirmed_at").in("monitor_id", ids).in("status", ACTIVE),
      this.db.from("maintenance_windows").select("id,project_id,endpoint_id,title,ends_at,suppress_alerts").in("project_id", projectIds).in("status", ["PLANNED", "ACTIVE"]).lte("starts_at", now).gt("ends_at", now),
    ]);
    if (incidents.error) throw incidents.error; if (windows.error) throw windows.error;
    return rows.map((r) => {
      const endpoint = rel(r.project_endpoints)!, project = rel(r.projects)!, incident = (incidents.data ?? []).find((item) => item.monitor_id === r.id);
      const window = (windows.data ?? []).filter((item) => item.project_id === r.project_id && (!item.endpoint_id || item.endpoint_id === r.endpoint_id)).sort((a, b) => Number(b.suppress_alerts) - Number(a.suppress_alerts))[0];
      return {
        id: r.id, endpointId: r.endpoint_id, endpointName: endpoint.name, url: endpoint.url, environment: endpoint.environment, endpointType: endpoint.endpoint_type, responsibleUserId: endpoint.responsible_user_id,
        projectId: r.project_id, projectName: project.name, projectNumber: project.project_number, projectPriority: project.priority, projectLeadId: project.project_lead_id, developmentManagerId: project.development_manager_id,
        clientId: r.client_id, clientName: clientName(r.clients), monitorType: r.monitor_type, enabled: r.enabled, intervalSeconds: r.interval_seconds, timeoutMs: r.timeout_ms, httpMethod: r.http_method,
        expectedStatusMin: r.expected_status_min, expectedStatusMax: r.expected_status_max, expectedContent: r.expected_content, followRedirects: r.follow_redirects, maxRedirects: r.max_redirects,
        failureThreshold: r.failure_threshold, recoveryThreshold: r.recovery_threshold, sslMonitoringEnabled: r.ssl_monitoring_enabled, warningLatencyMs: r.warning_latency_ms, criticalLatencyMs: r.critical_latency_ms,
        incidentSeverity: r.incident_severity, maintenanceMode: r.maintenance_mode, alertRuleId: r.alert_rule_id, clientVisibility: r.client_visibility, status: r.status, statusReason: r.status_reason,
        statusChangedAt: r.status_changed_at, consecutiveFailures: r.consecutive_failures, consecutiveSuccesses: r.consecutive_successes, lastCheckedAt: r.last_checked_at, lastSuccessAt: r.last_success_at,
        lastFailureAt: r.last_failure_at, lastStatusCode: r.last_status_code, lastLatencyMs: r.last_latency_ms, lastErrorType: r.last_error_type, lastErrorMessage: r.last_error_message, nextCheckAt: r.next_check_at,
        ssl: { status: r.ssl_status, expiresAt: r.ssl_expires_at, daysRemaining: daysUntil(r.ssl_expires_at), issuer: r.ssl_issuer, subject: r.ssl_subject, errorType: r.ssl_error_type, checkedAt: r.ssl_checked_at },
        activeIncident: incident ? { id: incident.id, incidentNumber: incident.incident_number, severity: incident.severity, status: incident.status, confirmedAt: incident.confirmed_at } : null,
        activeMaintenance: window ? { id: window.id, title: window.title, endsAt: window.ends_at, suppressAlerts: window.suppress_alerts } : null,
        createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
      } satisfies MonitorView;
    });
  }
  async listMonitors(filter: MonitorFilter) {
    if (filter.projectIds && !filter.projectIds.length) return [];
    let query = this.db.from("monitors").select(MONITOR_SELECT);
    if (filter.projectIds) query = query.in("project_id", filter.projectIds);
    if (filter.projectId) query = query.eq("project_id", filter.projectId);
    if (filter.clientId) query = query.eq("client_id", filter.clientId);
    if (filter.status) query = query.eq("status", filter.status);
    if (filter.endpointId) query = query.eq("endpoint_id", filter.endpointId);
    const { data, error } = await query.limit(1000); if (error) throw error;
    const search = filter.search?.toLowerCase();
    return (await this.decorateMonitors(data ?? [])).filter((item) => (!filter.environment || item.environment === filter.environment) && (!filter.responsibleUserId || item.responsibleUserId === filter.responsibleUserId) && (!search || [item.endpointName, item.url, item.projectName, item.clientName].some((value) => value?.toLowerCase().includes(search))))
      .sort((a, b) => (a.clientName ?? "").localeCompare(b.clientName ?? "") || a.projectName.localeCompare(b.projectName) || a.endpointName.localeCompare(b.endpointName));
  }
  async getMonitor(id: string) { const { data, error } = await this.db.from("monitors").select(MONITOR_SELECT).eq("id", id).maybeSingle(); if (error) throw error; return data ? (await this.decorateMonitors([data]))[0] : undefined; }
  async createMonitor(endpointId: string, config: MonitorConfig, actorId: string | null) {
    const { data, error } = await this.db.from("monitors").insert({ ...configToRow(config), endpoint_id: endpointId, created_by: actorId, status: config.enabled ? "UNKNOWN" : "DISABLED", status_reason: config.enabled ? "Esperando primer check" : "Monitor deshabilitado" }).select("id").single();
    if (error?.code === "23505") throw new MonitoringError("MONITOR_BUSY", "El endpoint ya posee un monitor de este tipo.");
    if (error) throw error;
    if (config.enabled) await this.db.from("project_endpoints").update({ monitoring_enabled: true }).eq("id", endpointId);
    return (await this.getMonitor(data.id))!;
  }
  async updateMonitor(id: string, patch: Partial<MonitorConfig>) { const { error } = await this.db.from("monitors").update(configToRow(patch)).eq("id", id); if (error) throw error; return (await this.getMonitor(id))!; }
  async setMonitorEnabled(id: string, enabled: boolean) { const { error } = await this.db.rpc("monitoring_set_enabled", { p_monitor: id, p_enabled: enabled }); if (error) throw rpcError(error); return (await this.getMonitor(id))!; }

  private endpointFromRow = (r: any): EndpointView => ({ id: r.id, projectId: r.project_id, name: r.name, url: r.url, environment: r.environment, endpointType: r.endpoint_type, monitoringEnabled: r.monitoring_enabled, responsibleUserId: r.responsible_user_id, active: r.active, createdAt: r.created_at, updatedAt: r.updated_at, clientId: r.client_id, clientName: clientName(r.clients), projectName: rel(r.projects)?.name ?? "", projectNumber: rel(r.projects)?.project_number ?? null });
  async getEndpoint(id: string) { const { data, error } = await this.db.from("project_endpoints").select("*,projects(name,project_number),clients(legal_name,trade_name)").eq("id", id).maybeSingle(); if (error) throw error; return data ? this.endpointFromRow(data) : undefined; }
  async listEndpoints(projectIds: string[] | null, projectId?: string) {
    if (projectIds && !projectIds.length) return [];
    let query = this.db.from("project_endpoints").select("*,projects(name,project_number),clients(legal_name,trade_name)").eq("active", true);
    if (projectIds) query = query.in("project_id", projectIds); if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query.order("name").limit(1000); if (error) throw error; return (data ?? []).map(this.endpointFromRow);
  }
  async createEndpoint(projectId: string, input: Partial<ProjectEndpoint>) { const endpoint = await this.operations.createEndpoint(projectId, input); return (await this.getEndpoint(endpoint.id))!; }
  async updateEndpoint(id: string, patch: Partial<ProjectEndpoint>) { await this.operations.updateEndpoint(id, patch); return (await this.getEndpoint(id))!; }

  async claimDue(workerId: string, limit: number, leaseSeconds: number) { const { data, error } = await this.db.rpc("monitoring_claim_due_monitors", { p_worker: workerId, p_limit: limit, p_lease_seconds: leaseSeconds }); if (error) throw error; return (data ?? []) as MonitorExecution[]; }
  async claimMonitor(id: string, workerId: string, leaseSeconds: number, cooldownSeconds: number) { const { data, error } = await this.db.rpc("monitoring_claim_monitor", { p_monitor: id, p_worker: workerId, p_lease_seconds: leaseSeconds, p_cooldown_seconds: cooldownSeconds }); if (error) throw rpcError(error); return data as MonitorExecution; }
  async releaseLease(id: string, workerId: string, retrySeconds: number) { const { error } = await this.db.rpc("monitoring_release_lease", { p_monitor: id, p_worker: workerId, p_retry_seconds: retrySeconds }); if (error) throw error; }
  private engineIncident = (r: any): EngineIncident => ({ id: r.id, incidentNumber: r.incident_number, status: r.status, severity: r.severity, acknowledgedAt: r.acknowledged_at, confirmedAt: r.confirmed_at, currentOutageStartedAt: r.current_outage_started_at, recoveredAt: r.recovered_at, resolvedAt: r.resolved_at, downtimeSeconds: r.downtime_seconds, reopenedCount: r.reopened_count, postmortemRequired: r.postmortem_required, assignedTo: r.assigned_to });
  async engineContext(monitor: MonitorExecution, now: Date, reopenWindowMinutes: number): Promise<EngineContext> {
    const [active, latest, maintenance] = await Promise.all([
      this.db.from("incidents").select("*").eq("monitor_id", monitor.id).in("status", ACTIVE).maybeSingle(),
      this.db.from("incidents").select("*").eq("monitor_id", monitor.id).in("status", ["RESOLVED", "POSTMORTEM_REQUIRED"]).gte("resolved_at", new Date(now.getTime() - reopenWindowMinutes * 60_000).toISOString()).order("resolved_at", { ascending: false }).limit(1).maybeSingle(),
      this.db.rpc("monitoring_active_maintenance", { p_project: monitor.projectId, p_endpoint: monitor.endpointId, p_at: now.toISOString() }),
    ]);
    if (active.error) throw active.error; if (latest.error) throw latest.error; if (maintenance.error) throw maintenance.error;
    return { activeIncident: active.data ? this.engineIncident(active.data) : null, reopenCandidate: !active.data && reopenWindowMinutes > 0 && latest.data ? this.engineIncident(latest.data) : null, maintenance: maintenance.data ?? null };
  }
  async applyCheck(payload: ApplyCheckPayload): Promise<ApplyCheckResult> {
    const { data, error } = await this.db.rpc("monitoring_apply_check", { p: payload }); if (error) throw rpcError(error);
    return { checkId: String(data.checkId), incidentId: data.incidentId, incidentNumber: data.incidentNumber, incidentApplied: data.incidentApplied, stateVersion: Number(data.stateVersion) };
  }
  private checkFromRow = (r: any): MonitorCheck => ({ id: String(r.id), monitorId: r.monitor_id, checkedAt: r.checked_at, success: r.success, statusCode: r.status_code, latencyMs: r.latency_ms, errorType: r.error_type, errorCode: r.error_code, errorMessage: r.error_message, sslValid: r.ssl_valid, sslExpiresAt: r.ssl_expiry_at, redirectCount: r.redirect_count, contentMatched: r.content_matched, inMaintenance: r.in_maintenance, triggerType: r.trigger_type, source: r.source });
  async listChecks(monitorId: string, filter: CheckFilter): Promise<Paged<MonitorCheck>> {
    const { from, to } = pageBounds(filter.page, filter.pageSize);
    let query = this.db.from("monitor_checks").select("*", { count: "exact" }).eq("monitor_id", monitorId);
    if (filter.success !== undefined) query = query.eq("success", filter.success); if (filter.statusCode) query = query.eq("status_code", filter.statusCode);
    if (filter.from) query = query.gte("checked_at", filter.from); if (filter.to) query = query.lte("checked_at", filter.to);
    const { data, error, count } = await query.order("checked_at", { ascending: false }).range(from, to); if (error) throw error;
    return { items: (data ?? []).map(this.checkFromRow), page: filter.page, pageSize: filter.pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / filter.pageSize) };
  }
  async checksBetween(monitorId: string, from: string, to: string, limit: number) { const { data, error } = await this.db.from("monitor_checks").select("*").eq("monitor_id", monitorId).gte("checked_at", from).lte("checked_at", to).order("checked_at", { ascending: false }).limit(limit); if (error) throw error; return (data ?? []).map(this.checkFromRow); }

  async dueSslMonitors(limit: number) {
    const now = new Date().toISOString();
    const { data, error } = await this.db.from("monitors").select("id").eq("enabled", true).eq("ssl_monitoring_enabled", true).eq("monitor_type", "HTTPS").lte("ssl_next_check_at", now).order("ssl_next_check_at").limit(limit); if (error) throw error;
    const claimed: string[] = [];
    // Compare-and-set por fila: un solo worker obtiene cada probe aunque existan varias instancias.
    for (const row of data ?? []) { const result = await this.db.from("monitors").update({ ssl_next_check_at: new Date(Date.now() + 15 * 60_000).toISOString() }).eq("id", row.id).lte("ssl_next_check_at", now).select("id"); if (!result.error && result.data?.length) claimed.push(row.id); }
    if (!claimed.length) return [];
    const views = await this.db.from("monitors").select(MONITOR_SELECT).in("id", claimed); if (views.error) throw views.error;
    return this.decorateMonitors(views.data ?? []);
  }
  async recordSsl(monitorId: string, observation: CertificateObservation, nextCheckAt: string) {
    const monitor = await this.db.from("monitors").select("endpoint_id,project_id,ssl_expires_at,ssl_issuer,ssl_subject,ssl_fingerprint").eq("id", monitorId).single(); if (monitor.error) throw monitor.error;
    const insert = await this.db.from("ssl_observations").insert({ monitor_id: monitorId, endpoint_id: monitor.data.endpoint_id, project_id: monitor.data.project_id, hostname: observation.hostname, observed_at: observation.observedAt, status: observation.status, valid: observation.valid, issuer: observation.issuer, subject: observation.subject, not_before: observation.notBefore, expires_at: observation.expiresAt, days_remaining: observation.daysRemaining, fingerprint_sha256: observation.fingerprint, error_type: observation.errorType, error_code: observation.errorCode });
    if (insert.error) throw insert.error;
    const keep = observation.status === "UNKNOWN";
    const { error } = await this.db.from("monitors").update({ ssl_status: observation.status, ssl_expires_at: observation.expiresAt ?? (keep ? monitor.data.ssl_expires_at : null), ssl_issuer: observation.issuer ?? monitor.data.ssl_issuer, ssl_subject: observation.subject ?? monitor.data.ssl_subject, ssl_error_type: observation.errorType, ssl_fingerprint: observation.fingerprint ?? monitor.data.ssl_fingerprint, ssl_checked_at: observation.observedAt, ssl_next_check_at: nextCheckAt }).eq("id", monitorId);
    if (error) throw error;
  }

  private incidentFromRow = (r: any): Incident => ({ id: r.id, incidentNumber: r.incident_number, projectId: r.project_id, projectName: rel(r.projects)?.name ?? null, endpointId: r.endpoint_id, endpointName: rel(r.project_endpoints)?.name ?? null, endpointUrl: rel(r.project_endpoints)?.url ?? null, environment: rel(r.project_endpoints)?.environment ?? null, monitorId: r.monitor_id, clientId: r.client_id, clientName: clientName(r.clients), source: r.source, title: r.title, description: r.description, clientSummary: r.client_summary, severity: r.severity, status: r.status, failureType: r.failure_type, detectedAt: r.detected_at, confirmedAt: r.confirmed_at, acknowledgedAt: r.acknowledged_at, acknowledgedBy: r.acknowledged_by, assignedTo: r.assigned_to, assignedAt: r.assigned_at, currentOutageStartedAt: r.current_outage_started_at, recoveredAt: r.recovered_at, resolvedAt: r.resolved_at, resolvedBy: r.resolved_by, closedAt: r.closed_at, closedBy: r.closed_by, downtimeSeconds: r.downtime_seconds, rootCause: r.root_cause, impact: r.impact, resolution: r.resolution, preventiveActions: r.preventive_actions, postmortemRequired: r.postmortem_required, postmortemCompletedAt: r.postmortem_completed_at, clientVisibility: r.client_visibility, reopenedCount: r.reopened_count, lastReopenedAt: r.last_reopened_at, escalationLevel: r.escalation_level, lastEscalatedAt: r.last_escalated_at, createdAt: r.created_at, updatedAt: r.updated_at });
  async listIncidents(filter: IncidentFilter): Promise<Paged<Incident>> {
    if (filter.projectIds && !filter.projectIds.length) return { items: [], page: filter.page, pageSize: filter.pageSize, total: 0, totalPages: 0 };
    const { from, to } = pageBounds(filter.page, filter.pageSize);
    let query = this.db.from("incidents").select(INCIDENT_SELECT, { count: "exact" });
    if (filter.projectIds) query = query.in("project_id", filter.projectIds);
    if (filter.state === "open") query = query.in("status", ACTIVE); else if (filter.state === "closed") query = query.not("status", "in", `(${ACTIVE.join(",")})`);
    if (filter.status) query = query.eq("status", filter.status); if (filter.severity) query = query.eq("severity", filter.severity); if (filter.projectId) query = query.eq("project_id", filter.projectId);
    if (filter.clientId) query = query.eq("client_id", filter.clientId); if (filter.monitorId) query = query.eq("monitor_id", filter.monitorId); if (filter.endpointId) query = query.eq("endpoint_id", filter.endpointId);
    if (filter.assignedTo) query = query.eq("assigned_to", filter.assignedTo); if (filter.from) query = query.gte("detected_at", filter.from); if (filter.to) query = query.lte("detected_at", filter.to);
    const { data, error, count } = await query.order("detected_at", { ascending: false }).range(from, to); if (error) throw error;
    return { items: (data ?? []).map(this.incidentFromRow), page: filter.page, pageSize: filter.pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / filter.pageSize) };
  }
  async getIncident(id: string) { const { data, error } = await this.db.from("incidents").select(INCIDENT_SELECT).eq("id", id).maybeSingle(); if (error) throw error; return data ? this.incidentFromRow(data) : undefined; }
  async incidentEvents(id: string): Promise<IncidentEvent[]> {
    const { data, error } = await this.db.from("incident_events").select("*").eq("incident_id", id).order("occurred_at"); if (error) throw error;
    return (data ?? []).map((r) => ({ id: r.id, incidentId: r.incident_id, eventType: r.event_type, fromStatus: r.from_status, toStatus: r.to_status, actorId: r.actor_id, actorType: r.actor_type, message: r.message, visibility: r.visibility, metadata: r.metadata, occurredAt: r.occurred_at }));
  }
  async mutateIncident(id: string, expectedStatus: IncidentStatus | null, patch: IncidentPatch, incidentEvents: IncidentEventDraft[], monitoringEvents: MonitoringEventDraft[], outbox: OutboxDraft[], guard: IncidentMutationGuard = {}) {
    const { data, error } = await this.db.rpc("monitoring_mutate_incident", { p_incident: id, p_expected_status: expectedStatus, p_patch: patch, p_incident_events: incidentEvents, p_monitoring_events: monitoringEvents, p_outbox: outbox, p_guard: guard });
    if (error) throw rpcError(error);
    return data ? (await this.getIncident(id)) ?? null : null;
  }
  private linkFromRow = (r: any): IncidentLink => ({ id: r.id, incidentId: r.incident_id, linkType: r.link_type, targetId: r.target_id, externalReference: r.external_reference, createdBy: r.created_by, createdAt: r.created_at });
  async incidentLinks(id: string) { const { data, error } = await this.db.from("incident_links").select("*").eq("incident_id", id).order("created_at"); if (error) throw error; return (data ?? []).map(this.linkFromRow); }
  async addIncidentLink(input: Omit<IncidentLink, "id" | "createdAt">) {
    const { data, error } = await this.db.from("incident_links").insert({ incident_id: input.incidentId, link_type: input.linkType, target_id: input.targetId, external_reference: input.externalReference, created_by: input.createdBy }).select("*").single();
    if (error?.code === "23505") { const existing = (await this.incidentLinks(input.incidentId)).find((link) => link.linkType === input.linkType && link.targetId === input.targetId); if (existing) return existing; }
    if (error) throw error; return this.linkFromRow(data);
  }
  async incidentsForEscalation() { const { data, error } = await this.db.from("incidents").select(INCIDENT_SELECT).in("status", ["DETECTED", "CONFIRMED"]).is("acknowledged_at", null).limit(500); if (error) throw error; return (data ?? []).map(this.incidentFromRow); }
  async incidentsForAutoResolve(minutes: number, now: Date) { const { data, error } = await this.db.from("incidents").select(INCIDENT_SELECT).eq("status", "MONITORING").lte("recovered_at", new Date(now.getTime() - minutes * 60_000).toISOString()).limit(200); if (error) throw error; return (data ?? []).map(this.incidentFromRow); }

  private windowFromRow = (r: any): MaintenanceWindow => ({ id: r.id, projectId: r.project_id, projectName: rel(r.projects)?.name ?? null, endpointId: r.endpoint_id, endpointName: rel(r.project_endpoints)?.name ?? null, clientId: r.client_id, title: r.title, description: r.description, clientSummary: r.client_summary, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status, suppressAlerts: r.suppress_alerts, clientVisibility: r.client_visibility, createdBy: r.created_by, cancelledAt: r.cancelled_at, startedAt: r.started_at, completedAt: r.completed_at, createdAt: r.created_at, updatedAt: r.updated_at });
  async listMaintenance(filter: MaintenanceFilter) {
    if (filter.projectIds && !filter.projectIds.length) return [];
    let query = this.db.from("maintenance_windows").select("*,projects(name),project_endpoints(name)");
    if (filter.projectIds) query = query.in("project_id", filter.projectIds); if (filter.projectId) query = query.eq("project_id", filter.projectId); if (filter.clientId) query = query.eq("client_id", filter.clientId);
    if (filter.status) query = query.eq("status", filter.status); if (filter.from) query = query.gte("ends_at", filter.from); if (filter.to) query = query.lte("starts_at", filter.to);
    const { data, error } = await query.order("starts_at", { ascending: false }).limit(300); if (error) throw error; return (data ?? []).map(this.windowFromRow);
  }
  async getMaintenance(id: string) { const { data, error } = await this.db.from("maintenance_windows").select("*,projects(name),project_endpoints(name)").eq("id", id).maybeSingle(); if (error) throw error; return data ? this.windowFromRow(data) : undefined; }
  async createMaintenance(input: MaintenanceInput) {
    const now = new Date(), active = new Date(input.startsAt) <= now && new Date(input.endsAt) > now;
    const { data, error } = await this.db.from("maintenance_windows").insert({ project_id: input.projectId, endpoint_id: input.endpointId, title: input.title, description: input.description, client_summary: input.clientSummary, starts_at: input.startsAt, ends_at: input.endsAt, suppress_alerts: input.suppressAlerts, client_visibility: input.clientVisibility, created_by: input.createdBy, status: active ? "ACTIVE" : "PLANNED", started_at: active ? now.toISOString() : null }).select("id").single();
    if (error) throw error; return (await this.getMaintenance(data.id))!;
  }
  async updateMaintenance(id: string, patch: Partial<MaintenanceWindow>) {
    const map: Record<string, string> = { title: "title", description: "description", clientSummary: "client_summary", startsAt: "starts_at", endsAt: "ends_at", status: "status", suppressAlerts: "suppress_alerts", clientVisibility: "client_visibility", cancelledAt: "cancelled_at" };
    const row = Object.fromEntries(Object.entries(patch).filter(([key]) => map[key]).map(([key, value]) => [map[key], value]));
    const { error } = await this.db.from("maintenance_windows").update(row).eq("id", id); if (error) throw error; return (await this.getMaintenance(id))!;
  }
  async runMaintenanceTransitions() {
    const { data, error } = await this.db.rpc("monitoring_run_maintenance_transitions"); if (error) throw error;
    const map = (rows: any[]) => rows.map((row) => this.windowFromRow(row));
    return { started: map(data?.started ?? []), completed: map(data?.completed ?? []) };
  }

  private deliveryFromRow = (r: any): AlertDelivery => ({ id: r.id, dedupKey: r.dedup_key, incidentId: r.incident_id, monitorId: r.monitor_id, projectId: r.project_id, ruleId: r.rule_id, recipientUserId: r.recipient_user_id, recipientRole: r.recipient_role, channel: r.channel, stage: r.stage, eventType: r.event_type, status: r.status, title: r.title, body: r.body, href: r.href, severity: r.severity, soundProfile: r.sound_profile, sentAt: r.sent_at, readAt: r.read_at, createdAt: r.created_at });
  async insertDeliveries(rows: AlertDeliveryDraft[]) {
    if (!rows.length) return [];
    const { data, error } = await this.db.from("alert_delivery_events").upsert(rows.map((row) => ({ dedup_key: row.dedupKey, incident_id: row.incidentId, monitor_id: row.monitorId, project_id: row.projectId, maintenance_window_id: row.maintenanceWindowId ?? null, rule_id: row.ruleId, recipient_user_id: row.recipientUserId, recipient_role: row.recipientRole, channel: row.channel, stage: row.stage, event_type: row.eventType, status: row.status, title: row.title, body: row.body, href: row.href, severity: row.severity, sound_profile: row.soundProfile, sent_at: row.sentAt })), { onConflict: "dedup_key", ignoreDuplicates: true }).select("*");
    if (error) throw error; return (data ?? []).map(this.deliveryFromRow);
  }
  async updateDelivery(id: string, patch: Partial<Pick<AlertDelivery, "status" | "sentAt">> & { providerReference?: string | null; errorMessage?: string | null }) {
    const { error } = await this.db.from("alert_delivery_events").update({ status: patch.status, sent_at: patch.sentAt, provider_reference: patch.providerReference, error_message: patch.errorMessage?.slice(0, 300) }).eq("id", id); if (error) throw error;
  }
  async listAlertsFor(userId: string | null, role: string, limit: number, projectIds: string[] | null) {
    const filter = userId ? `recipient_user_id.eq.${userId},recipient_role.eq.${role}` : `recipient_role.eq.${role}`;
    const { data, error } = await this.db.from("alert_delivery_events").select("*").eq("channel", "IN_APP").or(filter).order("created_at", { ascending: false }).limit(limit); if (error) throw error;
    return (data ?? []).map(this.deliveryFromRow).filter((item) => item.recipientUserId === userId || !projectIds || !item.projectId || projectIds.includes(item.projectId));
  }
  async markAlertRead(id: string, userId: string | null, role: string) {
    const filter = userId ? `recipient_user_id.eq.${userId},recipient_role.eq.${role}` : `recipient_role.eq.${role}`;
    const { data, error } = await this.db.from("alert_delivery_events").update({ read_at: new Date().toISOString() }).eq("id", id).or(filter).is("read_at", null).select("id"); if (error) throw error; return Boolean(data?.length);
  }

  private eventFromRow = (r: any): MonitoringEvent => ({ id: r.id, projectId: r.project_id, clientId: r.client_id, endpointId: r.endpoint_id, monitorId: r.monitor_id, incidentId: r.incident_id, maintenanceWindowId: r.maintenance_window_id, eventType: r.event_type, tone: r.tone, title: r.title, visibility: r.visibility, actorId: r.actor_id, payload: r.payload, occurredAt: r.occurred_at });
  async listEvents(filter: EventFilter): Promise<Paged<MonitoringEvent>> {
    if (filter.projectIds && !filter.projectIds.length) return { items: [], page: filter.page, pageSize: filter.pageSize, total: 0, totalPages: 0 };
    const { from, to } = pageBounds(filter.page, filter.pageSize);
    let query = this.db.from("monitoring_events").select("*", { count: "exact" });
    if (filter.projectIds) query = query.in("project_id", filter.projectIds); if (filter.projectId) query = query.eq("project_id", filter.projectId); if (filter.clientId) query = query.eq("client_id", filter.clientId);
    if (filter.monitorId) query = query.eq("monitor_id", filter.monitorId); if (filter.incidentId) query = query.eq("incident_id", filter.incidentId); if (filter.eventType) query = query.eq("event_type", filter.eventType);
    if (filter.from) query = query.gte("occurred_at", filter.from); if (filter.to) query = query.lte("occurred_at", filter.to);
    const { data, error, count } = await query.order("occurred_at", { ascending: false }).range(from, to); if (error) throw error;
    return { items: (data ?? []).map(this.eventFromRow), page: filter.page, pageSize: filter.pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / filter.pageSize) };
  }
  async publishEvents(context: { projectId: string | null; clientId: string | null; endpointId: string | null; monitorId: string | null; incidentId: string | null }, events: MonitoringEventDraft[], outbox: OutboxDraft[]) {
    if (events.length) { const { error } = await this.db.from("monitoring_events").insert(events.map((event) => ({ project_id: context.projectId, client_id: context.clientId, endpoint_id: context.endpointId, monitor_id: context.monitorId, incident_id: context.incidentId, maintenance_window_id: event.maintenanceWindowId ?? null, event_type: event.eventType, tone: event.tone, title: event.title, visibility: event.visibility ?? "INTERNAL", actor_id: event.actorId ?? null, payload: event.payload ?? {}, occurred_at: event.occurredAt ?? new Date().toISOString() }))); if (error) throw error; }
    if (outbox.length) { const { error } = await this.db.from("business_event_outbox").insert(outbox.map((event) => ({ aggregate_type: event.aggregateType ?? "MONITOR", aggregate_id: context.monitorId ?? context.incidentId, event_type: event.eventType, payload: { ...(event.payload ?? {}), ...context } }))); if (error) throw error; }
  }
  async claimOutbox(workerId: string, limit: number, leaseSeconds: number) {
    const { data, error } = await this.db.rpc("monitoring_claim_outbox", { p_worker: workerId, p_limit: limit, p_lease_seconds: leaseSeconds }); if (error) throw error;
    return (data ?? []).map((row: any) => ({ id: row.id, aggregateType: row.aggregate_type, aggregateId: row.aggregate_id, eventType: row.event_type, payload: row.payload ?? {}, occurredAt: row.occurred_at, attempts: Number(row.attempts) }));
  }
  async completeOutbox(id: string, workerId: string, errorMessage: string | null) {
    const { error } = await this.db.rpc("monitoring_complete_outbox", { p_id: id, p_worker: workerId, p_error: errorMessage?.slice(0, 500) ?? null }); if (error) throw error;
  }

  async monitorStats(monitorId: string): Promise<MonitorStats> {
    const [stats, monitor] = await Promise.all([this.db.rpc("monitoring_monitor_stats", { p_monitor: monitorId }), this.db.from("monitors").select("last_latency_ms").eq("id", monitorId).maybeSingle()]);
    if (stats.error) throw stats.error;
    const raw = stats.data as any, numberize = (value: Record<string, any> = {}) => Object.fromEntries(Object.entries(value).map(([key, window]) => [key, Object.fromEntries(Object.entries(window as Record<string, unknown>).map(([field, entry]) => [field, num(entry)]))]));
    return { uptime: numberize(raw.uptime) as MonitorStats["uptime"], latency: numberize(raw.latency) as MonitorStats["latency"], current: monitor.data?.last_latency_ms ?? null, firstCheckAt: raw.firstCheckAt, maintenancePolicy: raw.maintenancePolicy, generatedAt: raw.generatedAt };
  }
  async fleetStats(monitorIds: string[]) {
    if (!monitorIds.length) return {};
    const [fleet, latency] = await Promise.all([this.db.rpc("monitoring_fleet_stats", { p_monitors: monitorIds }), this.latencyRanking(monitorIds, 24)]);
    if (fleet.error) throw fleet.error;
    const result: Record<string, MonitoringFleetEntry> = {};
    for (const [id, entry] of Object.entries((fleet.data ?? {}) as Record<string, any>)) result[id] = { uptime24h: num(entry.h24), uptime7d: num(entry.d7), uptime30d: num(entry.d30), uptime90d: num(entry.d90), avgLatency24h: latency[id]?.avg ?? num(entry.avgLatency24h), p95Latency24h: latency[id]?.p95 ?? null, firstDay: entry.firstDay ?? null };
    return result;
  }
  async buckets(monitorIds: string[], granularity: "hour" | "day", from: string) {
    if (!monitorIds.length) return {};
    const { data, error } = await this.db.from(granularity === "hour" ? "monitor_hourly_rollups" : "monitor_daily_rollups").select("*").in("monitor_id", monitorIds).gte("period_start", from).order("period_start").limit(20_000); if (error) throw error;
    const result: Record<string, UptimeBucket[]> = {};
    for (const r of data ?? []) (result[r.monitor_id] ??= []).push({ periodStart: r.period_start, checks: r.checks, successes: r.successes, failures: r.failures, maintenanceChecks: r.maintenance_checks, uptime: num(r.uptime_percentage), avgLatencyMs: num(r.avg_latency_ms), p95LatencyMs: num(r.p95_latency_ms) });
    return result;
  }
  async latencyRanking(monitorIds: string[], hours: number) {
    if (!monitorIds.length) return {};
    const { data, error } = await this.db.rpc("monitoring_latency_ranking", { p_monitors: monitorIds, p_hours: hours }); if (error) throw error;
    const result: Record<string, LatencyWindow> = {};
    for (const [id, entry] of Object.entries((data ?? {}) as Record<string, any>)) result[id] = { samples: Number(entry.samples), avg: num(entry.avg), p50: num(entry.p50), p95: num(entry.p95), min: null, max: null };
    return result;
  }
  async refreshRollups(from: string, to: string) { const { data, error } = await this.db.rpc("monitoring_refresh_rollups", { p_from: from, p_to: to }); if (error) throw error; return Number(data ?? 0); }
  async purge() { const { data, error } = await this.db.rpc("monitoring_purge", { p_batch: 5000 }); if (error) throw error; return data as Record<string, unknown>; }

  async heartbeat(input: import("./monitoring.store.js").WorkerHeartbeatInput) {
    const [next, last] = await Promise.all([
      this.db.from("monitors").select("next_check_at").eq("enabled", true).order("next_check_at").limit(1).maybeSingle(),
      this.db.from("monitor_checks").select("checked_at").order("checked_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (next.error) throw next.error; if (last.error) throw last.error;
    const nextJobAt = next.data?.next_check_at ?? null;
    const { error } = await this.db.from("monitoring_worker_heartbeats").upsert({ worker_id: input.workerId, hostname: input.hostname, last_seen_at: new Date().toISOString(), checks_executed: input.checksExecuted, last_error: input.lastError?.slice(0, 300) ?? null, release_sha: input.releaseSha, persistence_mode: input.persistenceMode, scheduler_active: input.schedulerActive, process_role: input.processRole, next_job_at: nextJobAt, queue_lag_seconds: nextJobAt ? Math.max(0, Math.floor((Date.now() - Date.parse(nextJobAt)) / 1000)) : null, last_check_at: last.data?.checked_at ?? null }, { onConflict: "worker_id" }); if (error) throw error;
  }
  async listHeartbeats(): Promise<WorkerHeartbeat[]> {
    const { data, error } = await this.db.from("monitoring_worker_heartbeats").select("*").gte("last_seen_at", new Date(Date.now() - 24 * 3_600_000).toISOString()).order("last_seen_at", { ascending: false }); if (error) throw error;
    return (data ?? []).map((r) => ({ workerId: r.worker_id, hostname: r.hostname, startedAt: r.started_at, lastSeenAt: r.last_seen_at, checksExecuted: Number(r.checks_executed), lastError: r.last_error, releaseSha: r.release_sha ?? null, persistenceMode: r.persistence_mode ?? "unknown", schedulerActive: Boolean(r.scheduler_active), processRole: r.process_role ?? "unknown", nextJobAt: r.next_job_at ?? null, queueLagSeconds: r.queue_lag_seconds === null || r.queue_lag_seconds === undefined ? null : Number(r.queue_lag_seconds), lastCheckAt: r.last_check_at ?? null }));
  }

  async projectIdsForUser(userId: string) { return this.operations.projectIdsForUser(userId); }
  async getProject(id: string) { return this.operations.getProject(id); }
  async projectMemberIds(projectId: string) { return (await this.operations.listMembers(projectId)).map((member) => member.userId); }
  async recentDeployments(projectId: string, before: string, limit: number) { return (await this.operations.listDeployments({ page: 1, pageSize: 50, projectId })).items.filter((item) => item.createdAt <= before).slice(0, limit); }
  async createTask(input: Partial<OperationsTask>) { return this.operations.createTask(input); }
  async getTask(id: string) { return this.operations.getTask(id); }
}

import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AlertDelivery, AlertRule, AlertTarget, Incident, IncidentSeverity, MaintenanceWindow, MonitorView, SoundProfile } from "@zyteron/contracts/monitoring";
import { createServerSupabase } from "../domain/server-supabase.js";
import type { CertificateObservation } from "./certificate-probe.js";
import { formatDuration, severityRank } from "./monitoring.engine.js";
import { MONITORING_STORE, type AlertDeliveryDraft, type MonitoringOutboxEvent, type MonitoringStore } from "./monitoring.store.js";
import type { AlertTriggerType } from "./monitoring.types.js";

export interface Recipient { userId: string | null; role: string | null; key: string }
export interface AlertScope {
  monitorId: string | null; projectId: string | null; clientId: string | null; alertRuleId: string | null; endpointName: string; responsibleUserId: string | null;
  projectLeadId: string | null; developmentManagerId: string | null; assignedTo: string | null; memberIds?: string[];
}

const scopeRank: Record<AlertRule["scopeType"], number> = { MONITOR: 4, PROJECT: 3, CLIENT: 2, GLOBAL: 1 };

/** Regla aplicable: la asignada al monitor o la más específica habilitada cuyo umbral de severidad se cumpla. */
export function selectRule(rules: AlertRule[], scope: Pick<AlertScope, "monitorId" | "projectId" | "clientId" | "alertRuleId">, severity: IncidentSeverity) {
  const eligible = rules.filter((rule) => rule.enabled && severityRank[severity] >= severityRank[rule.minSeverity]);
  const assigned = scope.alertRuleId ? eligible.find((rule) => rule.id === scope.alertRuleId) : undefined;
  if (assigned) return assigned;
  return eligible.filter((rule) => rule.scopeType === "GLOBAL" || (rule.scopeType === "CLIENT" && rule.clientId === scope.clientId) || (rule.scopeType === "PROJECT" && rule.projectId === scope.projectId) || (rule.scopeType === "MONITOR" && rule.monitorId === scope.monitorId))
    .sort((a, b) => scopeRank[b.scopeType] - scopeRank[a.scopeType])[0] ?? null;
}

/** Destinatarios dinámicos. Si un rol del proyecto no existe se escala al siguiente responsable; nunca a emails fijos. */
export function resolveTargets(targets: AlertTarget[], scope: AlertScope): Recipient[] {
  const user = (id: string): Recipient => ({ userId: id, role: null, key: `user:${id}` });
  const role = (name: string): Recipient => ({ userId: null, role: name, key: `role:${name}` });
  const manager = () => scope.developmentManagerId ? user(scope.developmentManagerId) : role("JEFE_DESARROLLO");
  const lead = () => scope.projectLeadId ? user(scope.projectLeadId) : manager();
  const recipients = targets.flatMap((target): Recipient[] => {
    switch (target) {
      case "ENDPOINT_RESPONSIBLE": return [scope.responsibleUserId ? user(scope.responsibleUserId) : lead()];
      case "INCIDENT_ASSIGNEE": return scope.assignedTo ? [user(scope.assignedTo)] : [];
      case "PROJECT_LEAD": return [lead()];
      case "DEVELOPMENT_MANAGER": return [manager()];
      case "GENERAL_MANAGER": return [role("GERENTE_GENERAL")];
      case "PROJECT_MEMBERS": return (scope.memberIds ?? []).map(user);
      default: return [];
    }
  });
  return [...new Map(recipients.map((recipient) => [recipient.key, recipient])).values()];
}

export function scopeFromMonitor(monitor: MonitorView, assignedTo: string | null = null): AlertScope {
  return { monitorId: monitor.id, projectId: monitor.projectId, clientId: monitor.clientId, alertRuleId: monitor.alertRuleId, endpointName: monitor.endpointName, responsibleUserId: monitor.responsibleUserId, projectLeadId: monitor.projectLeadId, developmentManagerId: monitor.developmentManagerId, assignedTo };
}

interface DispatchInput { rule: AlertRule; recipients: Recipient[]; stage: string; eventType: string; title: string; body: string; href: string; severity: IncidentSeverity; incidentId: string | null; monitorId: string | null; projectId: string | null; maintenanceWindowId?: string | null; sound?: SoundProfile }

@Injectable()
export class MonitoringMailer {
  private readonly logger = new Logger(MonitoringMailer.name);
  private readonly directory = createServerSupabase();
  private emailCache: { at: number; users: Array<{ id: string; email: string; role: string | null }> } | null = null;
  configured() { return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MONITORING_MAIL_FROM?.trim() && this.directory); }
  private async users() {
    if (!this.directory) return [];
    if (this.emailCache && Date.now() - this.emailCache.at < 300_000) return this.emailCache.users;
    const { data, error } = await this.directory.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const users = data.users.filter((user) => user.email).map((user) => ({ id: user.id, email: user.email!, role: typeof user.app_metadata.role === "string" ? user.app_metadata.role : null }));
    this.emailCache = { at: Date.now(), users };
    return users;
  }
  async addressesFor(recipient: Recipient) { const users = await this.users(); return recipient.userId ? users.filter((user) => user.id === recipient.userId).map((user) => user.email) : users.filter((user) => user.role === recipient.role).map((user) => user.email); }
  async send(to: string[], subject: string, text: string, idempotencyKey: string) {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "content-type": "application/json", "idempotency-key": idempotencyKey.slice(0, 256) }, body: JSON.stringify({ from: process.env.MONITORING_MAIL_FROM!.trim(), to, subject, text }) });
    const data = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok || !data.id) { this.logger.warn(`Resend rechazó el envío: ${response.status}`); throw new Error(data.message ?? `HTTP ${response.status}`); }
    return data.id;
  }
}

@Injectable()
export class MonitoringAlerts {
  private readonly logger = new Logger(MonitoringAlerts.name);
  constructor(@Inject(MONITORING_STORE) private readonly store: MonitoringStore, private readonly mailer: MonitoringMailer) {}

  /** Inserta entregas deduplicadas por dedup_key y ejecuta los canales externos sólo si están configurados. */
  async deliver(input: DispatchInput): Promise<AlertDelivery[]> {
    if (!input.recipients.length) return [];
    const channels = new Set(input.rule.channels.flatMap((channel) => channel === "REALTIME" ? ["IN_APP"] : [channel]));
    const sound = input.sound ?? (input.severity === "CRITICAL" ? input.rule.criticalSoundProfile : input.rule.soundProfile);
    const now = new Date().toISOString();
    const drafts: AlertDeliveryDraft[] = [];
    for (const recipient of input.recipients) for (const channel of channels) {
      const status = channel === "IN_APP" ? "DELIVERED" : channel === "EMAIL" && this.mailer.configured() ? "QUEUED" : "PROVIDER_NOT_CONFIGURED";
      drafts.push({ dedupKey: `${input.stage}:${recipient.key}:${channel}`, incidentId: input.incidentId, monitorId: input.monitorId, projectId: input.projectId, maintenanceWindowId: input.maintenanceWindowId ?? null, ruleId: input.rule.id, recipientUserId: recipient.userId, recipientRole: recipient.role, channel: channel as AlertDelivery["channel"], stage: input.stage.split(":")[0]!, eventType: input.eventType, status, title: input.title, body: input.body, href: input.href, severity: input.severity, soundProfile: sound, sentAt: status === "DELIVERED" ? now : null });
    }
    const inserted = await this.store.insertDeliveries(drafts);
    for (const delivery of inserted.filter((item) => item.channel === "EMAIL" && item.status === "QUEUED")) {
      const recipient = input.recipients.find((item) => (item.userId && item.userId === delivery.recipientUserId) || (item.role && item.role === delivery.recipientRole))!;
      try {
        const to = await this.mailer.addressesFor(recipient);
        if (!to.length) { await this.store.updateDelivery(delivery.id, { status: "NO_ADDRESS" }); continue; }
        const reference = await this.mailer.send(to, `[Zyteron Monitor] ${input.title}`, `${input.body}\n\n${input.href}`, delivery.dedupKey);
        await this.store.updateDelivery(delivery.id, { status: "ACCEPTED", sentAt: new Date().toISOString(), providerReference: reference });
      } catch (error) { await this.store.updateDelivery(delivery.id, { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Error de proveedor" }); }
    }
    return inserted;
  }

  private async ruleFor(scope: AlertScope, severity: IncidentSeverity, eventType: string) {
    const rule = selectRule(await this.store.listAlertRules(), scope, severity);
    return rule && rule.notifyEvents.includes(eventType) ? rule : null;
  }

  async dispatchIncident(trigger: AlertTriggerType | "INCIDENT_ASSIGNED", incident: Incident, monitor: MonitorView | null) {
    const scope: AlertScope = monitor ? scopeFromMonitor(monitor, incident.assignedTo) : await this.projectScope(incident);
    const eventType = trigger === "INCIDENT_REOPENED" || trigger === "INCIDENT_RELAPSED" || trigger === "INCIDENT_ASSIGNED" ? "INCIDENT_CONFIRMED" : trigger;
    const rule = await this.ruleFor(scope, incident.severity, eventType);
    if (!rule) return [];
    const href = `/monitoring/incidents/${incident.id}`;
    const immediate = rule.escalationPolicy.steps.filter((step) => step.afterMinutes <= 0).flatMap((step) => step.targets);
    const critical = incident.severity === "CRITICAL" ? rule.escalationPolicy.criticalImmediateTargets : [];
    const base = { rule, href, severity: incident.severity, incidentId: incident.id, monitorId: incident.monitorId, projectId: incident.projectId };
    switch (trigger) {
      case "INCIDENT_CONFIRMED": return this.deliver({ ...base, recipients: resolveTargets([...immediate, ...critical], scope), stage: `CONFIRMED:${incident.id}`, eventType: "INCIDENT_CONFIRMED", title: `${incident.incidentNumber} · ${incident.title}`, body: `Severidad ${incident.severity}. ${incident.description ?? ""}`.trim() });
      case "INCIDENT_REOPENED": return this.deliver({ ...base, recipients: resolveTargets([...immediate, ...critical], scope), stage: `REOPENED_${incident.reopenedCount}:${incident.id}`, eventType: "INCIDENT_CONFIRMED", title: `${incident.incidentNumber} reabierto · ${scope.endpointName}`, body: "El endpoint volvió a quedar fuera de servicio dentro de la ventana de reapertura." });
      case "INCIDENT_RELAPSED": return this.deliver({ ...base, recipients: resolveTargets(["INCIDENT_ASSIGNEE", ...immediate, ...critical], scope), stage: `RELAPSED_${incident.currentOutageStartedAt}:${incident.id}`, eventType: "INCIDENT_CONFIRMED", title: `${incident.incidentNumber} · nueva falla durante observación`, body: `${scope.endpointName} volvió a fallar tras la recuperación.` });
      case "INCIDENT_ASSIGNED": return this.deliver({ ...base, recipients: incident.assignedTo ? resolveTargets(["INCIDENT_ASSIGNEE"], scope) : [], stage: `ASSIGNED_${incident.assignedAt}:${incident.id}`, eventType: "INCIDENT_CONFIRMED", title: `${incident.incidentNumber} asignado`, body: `Se te asignó el incidente «${incident.title}».` });
      case "ENDPOINT_RECOVERED": return this.deliver({ ...base, recipients: resolveTargets([...rule.recoveryTargets, ...critical], scope), stage: `RECOVERED_${incident.recoveredAt}:${incident.id}`, eventType: "ENDPOINT_RECOVERED", title: `${scope.endpointName} recuperado · ${incident.incidentNumber}`, body: `Downtime acumulado: ${formatDuration(incident.downtimeSeconds)}.`, sound: "DEFAULT" });
      case "INCIDENT_RESOLVED": return this.deliver({ ...base, recipients: resolveTargets([...rule.recoveryTargets, ...critical], scope), stage: `RESOLVED_${incident.resolvedAt}:${incident.id}`, eventType: "INCIDENT_RESOLVED", title: `${incident.incidentNumber} resuelto`, body: incident.resolution ?? "Incidente resuelto.", sound: "DEFAULT" });
      default: return [];
    }
  }

  async dispatchLatency(monitor: MonitorView, latencyMs: number | null, at: string) {
    const scope = scopeFromMonitor(monitor);
    const rule = await this.ruleFor(scope, "LOW", "LATENCY_DEGRADED");
    if (!rule) return [];
    return this.deliver({ rule, recipients: resolveTargets(["ENDPOINT_RESPONSIBLE"], scope), stage: `LATENCY_${at}:${monitor.id}`, eventType: "LATENCY_DEGRADED", title: `${monitor.endpointName}: latencia elevada`, body: `Respuesta en ${latencyMs ?? "?"} ms (umbral crítico ${monitor.criticalLatencyMs} ms).`, href: `/monitoring/endpoints/${monitor.endpointId}`, severity: "LOW", incidentId: null, monitorId: monitor.id, projectId: monitor.projectId, sound: "DEFAULT" });
  }

  async dispatchSsl(monitor: MonitorView, observation: CertificateObservation, threshold: number | null) {
    const scope = scopeFromMonitor(monitor);
    const expired = observation.status === "EXPIRED", invalid = observation.status === "INVALID";
    const severity: IncidentSeverity = expired || invalid ? "HIGH" : (observation.daysRemaining ?? 99) <= 7 ? "HIGH" : (observation.daysRemaining ?? 99) <= 30 ? "MEDIUM" : "LOW";
    const eventType = expired || invalid ? "SSL_EXPIRED" : "SSL_EXPIRING";
    const rule = await this.ruleFor(scope, severity, eventType);
    if (!rule) return [];
    const stage = expired ? `SSL_EXPIRED_${observation.expiresAt}` : invalid ? `SSL_INVALID_${observation.errorType}_${observation.fingerprint ?? "na"}` : `SSL_${threshold}_${observation.expiresAt}`;
    const title = expired ? `${monitor.endpointName}: certificado vencido` : invalid ? `${monitor.endpointName}: certificado inválido (${observation.errorType})` : `${monitor.endpointName}: certificado vence en ${observation.daysRemaining} días`;
    return this.deliver({ rule, recipients: resolveTargets(expired || invalid ? ["ENDPOINT_RESPONSIBLE", "PROJECT_LEAD"] : ["ENDPOINT_RESPONSIBLE"], scope), stage: `${stage}:${monitor.id}`, eventType, title, body: `Host ${observation.hostname}. Emisor: ${observation.issuer ?? "sin dato"}.`, href: "/monitoring/ssl", severity, incidentId: null, monitorId: monitor.id, projectId: monitor.projectId });
  }

  async dispatchMaintenance(window: MaintenanceWindow, eventType: "MAINTENANCE_STARTED" | "MAINTENANCE_COMPLETED") {
    const project = await this.store.getProject(window.projectId);
    if (!project) return [];
    const endpoint = window.endpointId ? await this.store.getEndpoint(window.endpointId) : undefined;
    const scope: AlertScope = { monitorId: null, projectId: window.projectId, clientId: window.clientId, alertRuleId: null, endpointName: endpoint?.name ?? project.name, responsibleUserId: endpoint?.responsibleUserId ?? null, projectLeadId: project.projectLeadId, developmentManagerId: project.developmentManagerId, assignedTo: null };
    const rule = await this.ruleFor(scope, "INFO", eventType);
    if (!rule) return [];
    return this.deliver({ rule, recipients: resolveTargets(["ENDPOINT_RESPONSIBLE", "PROJECT_LEAD"], scope), stage: `${eventType}:${window.id}`, eventType, title: eventType === "MAINTENANCE_STARTED" ? `Mantenimiento iniciado · ${window.title}` : `Mantenimiento finalizado · ${window.title}`, body: `${project.name}${endpoint ? ` · ${endpoint.name}` : ""}`, href: "/monitoring/maintenance", severity: "INFO", incidentId: null, monitorId: null, projectId: window.projectId, maintenanceWindowId: window.id, sound: "SILENT" });
  }

  /** Escalamiento por tiempo sin reconocimiento. Idempotente: el nivel se avanza con guardas en la base. */
  async processEscalations(now = new Date()) {
    let escalated = 0;
    for (const incident of await this.store.incidentsForEscalation()) {
      const monitor = incident.monitorId ? await this.store.getMonitor(incident.monitorId) : undefined;
      const scope = monitor ? scopeFromMonitor(monitor, incident.assignedTo) : await this.projectScope(incident);
      const rule = await this.ruleFor(scope, incident.severity, "INCIDENT_ESCALATED");
      if (!rule) continue;
      const steps = [...rule.escalationPolicy.steps].sort((a, b) => a.afterMinutes - b.afterMinutes);
      const since = incident.lastReopenedAt ?? incident.confirmedAt ?? incident.detectedAt;
      const minutes = (now.getTime() - new Date(since).getTime()) / 60_000;
      const level = steps.reduce((reached, step, index) => index > 0 && step.afterMinutes <= minutes ? index : reached, 0);
      if (level <= incident.escalationLevel) continue;
      const mutated = await this.store.mutateIncident(incident.id, incident.status, { escalation_level: level, last_escalated_at: now.toISOString() },
        [{ eventType: "ESCALATED", actorType: "SYSTEM", message: `Escalado al nivel ${level} tras ${Math.floor(minutes)} min sin reconocimiento.`, metadata: { level, targets: steps[level]!.targets }, occurredAt: now.toISOString() }],
        [{ eventType: "INCIDENT_ESCALATED", tone: "CRITICAL", title: `Incidente {incidentNumber} escalado (nivel ${level}) sin reconocimiento.`, occurredAt: now.toISOString() }],
        [{ eventType: "INCIDENT_ESCALATED", payload: { level } }], { escalationBelow: level, unacknowledged: true });
      if (!mutated) continue;
      escalated += 1;
      for (let index = incident.escalationLevel + 1; index <= level; index++) {
        await this.deliver({ rule, recipients: resolveTargets(steps[index]!.targets, scope), stage: `ESCALATION_${index}_${incident.reopenedCount}:${incident.id}`, eventType: "INCIDENT_ESCALATED", title: `${incident.incidentNumber} escalado · sin reconocimiento`, body: `${incident.title}. ${Math.floor(minutes)} min desde la confirmación.`, href: `/monitoring/incidents/${incident.id}`, severity: incident.severity, incidentId: incident.id, monitorId: incident.monitorId, projectId: incident.projectId });
      }
    }
    return escalated;
  }

  /** Reproduce efectos pendientes del outbox; dedup_key hace segura la reejecución tras una caída. */
  async dispatchOutbox(event: MonitoringOutboxEvent) {
    if (["INCIDENT_CONFIRMED", "ENDPOINT_RECOVERED", "INCIDENT_RESOLVED"].includes(event.eventType)) {
      const incidentId = typeof event.payload.incidentId === "string" ? event.payload.incidentId : event.aggregateType === "INCIDENT" ? event.aggregateId : null;
      if (!incidentId) return;
      const incident = await this.store.getIncident(incidentId); if (!incident) return;
      const monitor = incident.monitorId ? await this.store.getMonitor(incident.monitorId) : null;
      await this.dispatchIncident(event.eventType as "INCIDENT_CONFIRMED" | "ENDPOINT_RECOVERED" | "INCIDENT_RESOLVED", incident, monitor ?? null); return;
    }
    if (event.eventType === "LATENCY_DEGRADED") {
      const monitorId = typeof event.payload.monitorId === "string" ? event.payload.monitorId : event.aggregateId;
      const monitor = await this.store.getMonitor(monitorId); if (monitor) await this.dispatchLatency(monitor, Number(event.payload.latencyMs) || null, event.occurredAt); return;
    }
    if (["MAINTENANCE_STARTED", "MAINTENANCE_COMPLETED"].includes(event.eventType)) {
      const window = await this.store.getMaintenance(event.aggregateId); if (window) await this.dispatchMaintenance(window, event.eventType as "MAINTENANCE_STARTED" | "MAINTENANCE_COMPLETED");
    }
  }

  private async projectScope(incident: Incident): Promise<AlertScope> {
    const project = incident.projectId ? await this.store.getProject(incident.projectId) : undefined;
    return { monitorId: incident.monitorId, projectId: incident.projectId, clientId: incident.clientId, alertRuleId: null, endpointName: incident.endpointName ?? project?.name ?? "Servicio", responsibleUserId: null, projectLeadId: project?.projectLeadId ?? null, developmentManagerId: project?.developmentManagerId ?? null, assignedTo: incident.assignedTo };
  }

  logError(context: string, error: unknown) { this.logger.error(`${context}: ${error instanceof Error ? error.message : String(error)}`); }
}

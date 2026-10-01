import type { IncidentSeverity, IncidentStatus, MonitorStatus, MonitoringSettings, SeverityRule } from "@zyteron/contracts/monitoring";
import type { CheckOutcome, EngineContext, EngineDecision, IncidentAction, IncidentEventDraft, MonitorExecution, MonitoringEventDraft, OutboxDraft, AlertTriggerType } from "./monitoring.types.js";

// Motor de incidentes: lógica pura y determinista. No accede a red ni a base de datos; la persistencia
// atómica ocurre en monitoring_apply_check (SQL) o en el store en memoria con la misma semántica.

export const severityRank: Record<IncidentSeverity, number> = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

/** Transiciones manuales permitidas. RESOLVED/POSTMORTEM_REQUIRED/CLOSED no se alcanzan con change-status. */
export const incidentTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  DETECTED: ["CONFIRMED", "ACKNOWLEDGED", "INVESTIGATING"],
  CONFIRMED: ["ACKNOWLEDGED", "INVESTIGATING", "MITIGATING"],
  ACKNOWLEDGED: ["INVESTIGATING", "MITIGATING", "MONITORING"],
  INVESTIGATING: ["MITIGATING", "MONITORING"],
  MITIGATING: ["INVESTIGATING", "MONITORING"],
  MONITORING: ["INVESTIGATING", "MITIGATING"],
  RESOLVED: ["INVESTIGATING"],
  POSTMORTEM_REQUIRED: [],
  CLOSED: [],
};
export const activeStatuses = new Set<IncidentStatus>(["DETECTED", "CONFIRMED", "ACKNOWLEDGED", "INVESTIGATING", "MITIGATING", "MONITORING"]);

/** "7 min", "1 h 42 min", "2 d 3 h". */
export function formatDuration(totalSeconds: number | null | undefined) {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) return "sin dato";
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60), days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60), rest = minutes % 60;
  if (days) return hours ? `${days} d ${hours} h` : `${days} d`;
  if (hours) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  return `${minutes} min`;
}

/**
 * Severidad configurable: override del monitor > regla más específica (cliente, prioridad, tipo, ambiente) > MEDIUM.
 * Ningún valor queda fijo en código; las reglas por defecto se siembran en la migración y pueden editarse.
 */
export function resolveSeverity(rules: SeverityRule[], monitor: Pick<MonitorExecution, "incidentSeverity" | "endpoint" | "project" | "clientId">): IncidentSeverity {
  if (monitor.incidentSeverity) return monitor.incidentSeverity;
  const matches = rules.filter((rule) => rule.enabled
    && (!rule.environment || rule.environment === monitor.endpoint.environment)
    && (!rule.endpointType || rule.endpointType === monitor.endpoint.endpointType)
    && (!rule.projectPriority || rule.projectPriority === monitor.project.priority)
    && (!rule.clientId || rule.clientId === monitor.clientId));
  const specificity = (rule: SeverityRule) => (rule.clientId ? 8 : 0) + (rule.projectPriority ? 4 : 0) + (rule.endpointType ? 2 : 0) + (rule.environment ? 1 : 0);
  return matches.sort((a, b) => specificity(b) - specificity(a) || severityRank[b.severity] - severityRank[a.severity])[0]?.severity ?? "MEDIUM";
}

export function describeFailure(result: Pick<CheckOutcome, "errorType" | "statusCode" | "errorMessage">) {
  switch (result.errorType) {
    case "HTTP_STATUS": return `HTTP ${result.statusCode}`;
    case "TIMEOUT": return "tiempo de espera agotado";
    case "DNS": return "error DNS";
    case "CONNECTION": return "conexión rechazada o interrumpida";
    case "TLS": return "certificado/TLS inválido";
    case "CONTENT_MISMATCH": return "contenido esperado ausente";
    case "REDIRECT_LIMIT": return "exceso de redirecciones";
    case "REDIRECT_LOOP": return "ciclo de redirecciones";
    case "SSRF_BLOCKED": return "destino bloqueado por política SSRF";
    default: return result.errorMessage ?? "falla no clasificada";
  }
}

function deriveStatus(monitor: MonitorExecution, result: CheckOutcome, failures: number, successes: number, ctx: EngineContext, recovering: boolean): { status: MonitorStatus; reason: string; latencyLevel: "WARNING" | "CRITICAL" | null } {
  if (!monitor.enabled) return { status: "DISABLED", reason: "Monitor deshabilitado", latencyLevel: null };
  if (ctx.maintenance) return { status: "MAINTENANCE", reason: `Ventana de mantenimiento «${ctx.maintenance.title}»${result.success ? "" : ` · última comprobación: ${describeFailure(result)}`}`, latencyLevel: null };
  if (failures >= monitor.failureThreshold) return { status: "OFFLINE", reason: `${failures} fallas consecutivas (${describeFailure(result)})`, latencyLevel: null };
  if (failures > 0) return { status: "DEGRADED", reason: `${failures}/${monitor.failureThreshold} fallas consecutivas · confirmación pendiente (${describeFailure(result)})`, latencyLevel: null };
  const active = ctx.activeIncident;
  if (active && active.status !== "MONITORING" && !recovering && successes < monitor.recoveryThreshold) return { status: "DEGRADED", reason: `Respuesta correcta ${successes}/${monitor.recoveryThreshold} · recuperación por confirmar`, latencyLevel: null };
  const latency = result.latencyMs ?? 0;
  if (monitor.criticalLatencyMs && latency >= monitor.criticalLatencyMs) return { status: "DEGRADED", reason: `Latencia ${latency} ms ≥ umbral crítico ${monitor.criticalLatencyMs} ms`, latencyLevel: "CRITICAL" };
  if (monitor.warningLatencyMs && latency >= monitor.warningLatencyMs) return { status: "DEGRADED", reason: `Latencia ${latency} ms ≥ umbral de advertencia ${monitor.warningLatencyMs} ms`, latencyLevel: "WARNING" };
  if (active?.status === "MONITORING" || recovering) return { status: "ONLINE", reason: "Servicio recuperado · incidente en observación", latencyLevel: null };
  return { status: "ONLINE", reason: `HTTP ${result.statusCode} en ${latency} ms`, latencyLevel: null };
}

export interface EvaluateInput { monitor: MonitorExecution; result: CheckOutcome; context: EngineContext; settings: MonitoringSettings; severity: IncidentSeverity; }

export function evaluateCheck({ monitor, result, context, settings, severity }: EvaluateInput): EngineDecision {
  const at = result.checkedAt;
  const name = monitor.endpoint.name;
  const failures = result.success ? 0 : monitor.consecutiveFailures + 1;
  const successes = result.success ? monitor.consecutiveSuccesses + 1 : 0;
  const streakStart = result.success ? null : monitor.failureStreakStartedAt ?? at;
  const active = context.activeIncident;
  const incidentEvents: IncidentEventDraft[] = [];
  const monitoringEvents: MonitoringEventDraft[] = [];
  const outbox: OutboxDraft[] = [];
  const alerts: AlertTriggerType[] = [];
  let incident: IncidentAction | null = null;
  let recovering = false;

  if (!result.success && failures === 1) {
    monitoringEvents.push({ eventType: "CHECK_FAILED", tone: "WARNING", title: `${name}: falla detectada (${describeFailure(result)}).`, payload: { errorType: result.errorType, statusCode: result.statusCode }, occurredAt: at, attachIncident: false });
    outbox.push({ aggregateType: "MONITOR", eventType: "MONITOR_FAILED", payload: { errorType: result.errorType, statusCode: result.statusCode, consecutiveFailures: failures } });
  }

  if (!result.success && failures >= monitor.failureThreshold) {
    if (active) {
      if (active.status === "MONITORING") {
        const toStatus: IncidentStatus = active.acknowledgedAt ? "INVESTIGATING" : "CONFIRMED";
        incident = { action: "RELAPSE", id: active.id, expectedStatuses: ["MONITORING"], patch: { status: toStatus, recovered_at: null, current_outage_started_at: at } };
        incidentEvents.push({ eventType: "RELAPSED", fromStatus: "MONITORING", toStatus, actorType: "SYSTEM", message: `El endpoint volvió a fallar durante la observación (${describeFailure(result)}).`, occurredAt: at });
        monitoringEvents.push({ eventType: "INCIDENT_RELAPSED", tone: "CRITICAL", title: `Incidente {incidentNumber}: ${name} volvió a fallar durante la observación.`, occurredAt: at, requiresIncident: true });
        outbox.push({ eventType: "INCIDENT_CONFIRMED", payload: { relapse: true, severity: active.severity }, requiresIncident: true });
        alerts.push("INCIDENT_RELAPSED");
      }
    } else if (context.maintenance?.suppressAlerts) {
      if (failures === monitor.failureThreshold) monitoringEvents.push({ eventType: "INCIDENT_SUPPRESSED", tone: "INFO", title: `${name}: falla confirmada durante el mantenimiento «${context.maintenance.title}»; alertas suprimidas.`, maintenanceWindowId: context.maintenance.id, occurredAt: at, attachIncident: false });
    } else if (context.reopenCandidate) {
      const candidate = context.reopenCandidate;
      incident = { action: "REOPEN", id: candidate.id, expectedStatuses: [candidate.status], patch: { status: "CONFIRMED", reopened_count: candidate.reopenedCount + 1, last_reopened_at: at, recovered_at: null, resolved_at: null, resolved_by: null, current_outage_started_at: at, acknowledged_at: null, acknowledged_by: null, escalation_level: 0 } };
      incidentEvents.push({ eventType: "REOPENED", fromStatus: candidate.status, toStatus: "CONFIRMED", actorType: "SYSTEM", message: `Nueva caída dentro de la ventana de reapertura de ${settings.reopenWindowMinutes} min (${describeFailure(result)}).`, occurredAt: at });
      monitoringEvents.push({ eventType: "INCIDENT_REOPENED", tone: "CRITICAL", title: `Incidente {incidentNumber} reabierto: ${name} volvió a quedar fuera de servicio.`, occurredAt: at, requiresIncident: true });
      outbox.push({ eventType: "INCIDENT_CONFIRMED", payload: { reopened: true, severity: candidate.severity }, requiresIncident: true });
      alerts.push("INCIDENT_REOPENED");
    } else {
      const assignedTo = monitor.endpoint.responsibleUserId;
      incident = { action: "CREATE", draft: {
        title: `${name} fuera de servicio`,
        description: `${failures} comprobaciones consecutivas fallaron (umbral ${monitor.failureThreshold}). Última falla: ${describeFailure(result)}.`,
        severity, failureType: result.errorType, detectedAt: streakStart ?? at, confirmedAt: at, assignedTo, postmortemRequired: settings.postmortemSeverities.includes(severity),
      } };
      incidentEvents.push({ eventType: "DETECTED", toStatus: "DETECTED", actorType: "SYSTEM", message: "Primera comprobación fallida de la racha.", occurredAt: streakStart ?? at });
      incidentEvents.push({ eventType: "CONFIRMED", fromStatus: "DETECTED", toStatus: "CONFIRMED", actorType: "SYSTEM", message: `Umbral alcanzado: ${failures}/${monitor.failureThreshold} fallas consecutivas.`, occurredAt: at, metadata: { severity } });
      if (assignedTo) incidentEvents.push({ eventType: "ASSIGNED", actorType: "SYSTEM", message: "Autoasignado al responsable del endpoint.", occurredAt: at, metadata: { assignedTo, automatic: true } });
      monitoringEvents.push({ eventType: "INCIDENT_CONFIRMED", tone: "CRITICAL", title: `Incidente {incidentNumber} confirmado: ${name}.`, payload: { severity }, occurredAt: at, requiresIncident: true });
      outbox.push({ eventType: "INCIDENT_CONFIRMED", payload: { severity, errorType: result.errorType }, requiresIncident: true });
      alerts.push("INCIDENT_CONFIRMED");
    }
  }

  if (result.success && active && active.status !== "MONITORING" && !active.recoveredAt && successes >= monitor.recoveryThreshold && activeStatuses.has(active.status)) {
    recovering = true;
    const outageStart = active.currentOutageStartedAt ?? active.confirmedAt ?? at;
    const downtime = Math.round((active.downtimeSeconds ?? 0) + Math.max(0, (new Date(at).getTime() - new Date(outageStart).getTime()) / 1000));
    const autoResolve = settings.recoveryPolicy === "AUTO_RESOLVE";
    const toStatus: IncidentStatus = autoResolve ? (active.postmortemRequired ? "POSTMORTEM_REQUIRED" : "RESOLVED") : "MONITORING";
    incident = { action: "RECOVER", id: active.id, expectedStatuses: [active.status], patch: { status: toStatus, recovered_at: at, current_outage_started_at: null, downtime_seconds: downtime, ...(autoResolve ? { resolved_at: at } : {}) } };
    incidentEvents.push({ eventType: "RECOVERY_DETECTED", fromStatus: active.status, toStatus, actorType: "SYSTEM", message: `${successes} respuestas correctas consecutivas (umbral ${monitor.recoveryThreshold}). Downtime: ${formatDuration(downtime)}.`, occurredAt: at, metadata: { downtimeSeconds: downtime } });
    monitoringEvents.push({ eventType: "ENDPOINT_RECOVERED", tone: "SUCCESS", title: `${name} se recuperó tras ${formatDuration(downtime)} (incidente {incidentNumber}).`, payload: { downtimeSeconds: downtime }, occurredAt: at, requiresIncident: true });
    outbox.push({ eventType: "ENDPOINT_RECOVERED", payload: { downtimeSeconds: downtime }, requiresIncident: true });
    alerts.push("ENDPOINT_RECOVERED");
    if (autoResolve) {
      incidentEvents.push({ eventType: "RESOLVED", fromStatus: active.status, toStatus, actorType: "SYSTEM", message: "Resuelto automáticamente por política de recuperación.", occurredAt: at });
      monitoringEvents.push({ eventType: "INCIDENT_RESOLVED", tone: "SUCCESS", title: `Incidente {incidentNumber} resuelto automáticamente.`, occurredAt: at, requiresIncident: true });
      outbox.push({ eventType: "INCIDENT_RESOLVED", payload: { automatic: true }, requiresIncident: true });
      alerts.push("INCIDENT_RESOLVED");
    }
  }

  const derived = deriveStatus(monitor, result, failures, successes, context, recovering);
  const statusChanged = derived.status !== monitor.status;
  if (statusChanged) {
    if (derived.status === "OFFLINE") monitoringEvents.push({ eventType: "ENDPOINT_OFFLINE", tone: "CRITICAL", title: `${name} quedó fuera de servicio.`, payload: { reason: derived.reason }, occurredAt: at, attachIncident: Boolean(incident) });
    else if (derived.status === "MAINTENANCE") monitoringEvents.push({ eventType: "ENDPOINT_MAINTENANCE", tone: "INFO", title: `${name} en mantenimiento programado.`, maintenanceWindowId: context.maintenance?.id ?? null, occurredAt: at, attachIncident: false });
    else if (monitor.status === "OFFLINE" || monitor.status === "MAINTENANCE") monitoringEvents.push({ eventType: "ENDPOINT_STATUS_CHANGED", tone: derived.status === "ONLINE" ? "SUCCESS" : "WARNING", title: `${name}: ${monitor.status} → ${derived.status}.`, payload: { reason: derived.reason }, occurredAt: at, attachIncident: false });
  }
  if (derived.latencyLevel === "CRITICAL" && !(monitor.status === "DEGRADED" && monitor.statusReason?.includes("crítico"))) {
    monitoringEvents.push({ eventType: "LATENCY_DEGRADED", tone: "WARNING", title: `${name}: ${derived.reason}.`, payload: { latencyMs: result.latencyMs, criticalLatencyMs: monitor.criticalLatencyMs }, occurredAt: at, attachIncident: false });
    outbox.push({ aggregateType: "MONITOR", eventType: "LATENCY_DEGRADED", payload: { latencyMs: result.latencyMs, criticalLatencyMs: monitor.criticalLatencyMs } });
    alerts.push("LATENCY_DEGRADED");
  }

  return {
    state: { status: derived.status, statusReason: derived.reason, consecutiveFailures: failures, consecutiveSuccesses: successes, failureStreakStartedAt: streakStart, nextCheckAt: new Date(new Date(at).getTime() + monitor.intervalSeconds * 1000).toISOString() },
    previousStatus: monitor.status, statusChanged, incident, incidentEvents, monitoringEvents, outbox, alerts,
  };
}

/** Candidato a reapertura: último incidente resuelto (no cerrado) dentro de la ventana configurada. */
export function isReopenEligible(incident: { status: IncidentStatus; resolvedAt: string | null }, now: Date, windowMinutes: number) {
  if (!windowMinutes || !incident.resolvedAt || !["RESOLVED", "POSTMORTEM_REQUIRED"].includes(incident.status)) return false;
  return now.getTime() - new Date(incident.resolvedAt).getTime() <= windowMinutes * 60_000;
}

import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SeverityRule } from "@zyteron/contracts/monitoring";
import { CertificateProbe, sslAlertThreshold, daysUntil } from "./certificate-probe.js";
import { HostConcurrencyLimiter, HttpChecker } from "./http-checker.js";
import { MonitoringAlerts } from "./monitoring.alerts.js";
import { evaluateCheck, resolveSeverity } from "./monitoring.engine.js";
import { santiagoDate } from "./monitoring.format.js";
import { MONITORING_STORE, MonitoringError, type MonitoringStore } from "./monitoring.store.js";
import type { ApplyCheckResult, EngineDecision, MonitorExecution } from "./monitoring.types.js";
import type { HttpCheckResult } from "./http-checker.js";

export interface ExecutionReport { monitorId: string; result: HttpCheckResult; decision: EngineDecision; applied: ApplyCheckResult }

/** Ejecuta un check real y aplica la decisión del motor. Compartido por el scheduler y CHECK NOW. */
@Injectable()
export class MonitoringRunner {
  private readonly logger = new Logger(MonitoringRunner.name);
  private limiter: HostConcurrencyLimiter | null = null;
  private rulesCache: { at: number; rules: SeverityRule[] } | null = null;
  constructor(
    @Inject(MONITORING_STORE) private readonly store: MonitoringStore,
    private readonly checker: HttpChecker,
    private readonly probe: CertificateProbe,
    private readonly alerts: MonitoringAlerts,
  ) {}

  private async severityRules() {
    if (this.rulesCache && Date.now() - this.rulesCache.at < 60_000) return this.rulesCache.rules;
    this.rulesCache = { at: Date.now(), rules: await this.store.listSeverityRules() };
    return this.rulesCache.rules;
  }

  async execute(execution: MonitorExecution, triggerType: "SCHEDULED" | "MANUAL", workerId: string): Promise<ExecutionReport> {
    const settings = await this.store.getSettings();
    this.limiter ??= new HostConcurrencyLimiter(settings.perHostConcurrency);
    let host = "invalid";
    try { host = new URL(execution.endpoint.url).hostname; } catch { /* la política SSRF lo rechazará con INVALID_URL */ }
    const result = await this.limiter.run(host, () => this.checker.check({
      url: execution.endpoint.url, method: execution.httpMethod, timeoutMs: execution.timeoutMs, expectedStatusMin: execution.expectedStatusMin, expectedStatusMax: execution.expectedStatusMax,
      expectedContent: execution.expectedContent, followRedirects: execution.followRedirects, maxRedirects: execution.maxRedirects, contentInspectBytes: settings.contentInspectBytes,
    }));
    const context = await this.store.engineContext(execution, new Date(result.checkedAt), settings.reopenWindowMinutes);
    const decision = evaluateCheck({ monitor: execution, result, context, settings, severity: resolveSeverity(await this.severityRules(), execution) });
    const applied = await this.store.applyCheck({
      monitorId: execution.id, workerId, expectedVersion: execution.stateVersion, check: { ...result, inMaintenance: Boolean(context.maintenance), triggerType, source: workerId },
      state: decision.state, incident: decision.incident, incidentEvents: decision.incidentEvents, monitoringEvents: decision.monitoringEvents, outbox: decision.outbox,
    });
    await this.notify(execution, decision, applied, result);
    return { monitorId: execution.id, result, decision, applied };
  }

  private async notify(execution: MonitorExecution, decision: EngineDecision, applied: ApplyCheckResult, result: HttpCheckResult) {
    if (!decision.alerts.length) return;
    try {
      const monitor = await this.store.getMonitor(execution.id);
      for (const trigger of decision.alerts) {
        if (trigger === "LATENCY_DEGRADED") { if (monitor) await this.alerts.dispatchLatency(monitor, result.latencyMs, result.checkedAt); continue; }
        if (!applied.incidentApplied || !applied.incidentId) continue;
        const incident = await this.store.getIncident(applied.incidentId);
        if (incident) await this.alerts.dispatchIncident(trigger, incident, monitor ?? null);
      }
    } catch (error) { this.logger.error(`Alertas de ${execution.id}: ${error instanceof Error ? error.message : error}`); }
  }

  /** Probe TLS + eventos/alertas SSL deduplicados por umbral y certificado. */
  async probeCertificates(limit = 5) {
    const settings = await this.store.getSettings();
    let probed = 0;
    for (const monitor of await this.store.dueSslMonitors(limit)) {
      const observation = await this.probe.probe(monitor.url, settings.sslWarningDays);
      const retry = observation.status === "UNKNOWN" ? 30 : settings.sslCheckIntervalMinutes;
      await this.store.recordSsl(monitor.id, observation, new Date(Date.now() + retry * 60_000).toISOString());
      probed += 1;
      const previousThreshold = sslAlertThreshold(monitor.ssl.checkedAt ? daysUntil(monitor.ssl.expiresAt, new Date(monitor.ssl.checkedAt)) : null, settings.sslAlertDays);
      const threshold = sslAlertThreshold(observation.daysRemaining, settings.sslAlertDays);
      const renewed = Boolean(observation.expiresAt && monitor.ssl.expiresAt && observation.expiresAt !== monitor.ssl.expiresAt);
      const context = { projectId: monitor.projectId, clientId: monitor.clientId, endpointId: monitor.endpointId, monitorId: monitor.id, incidentId: null };
      try {
        if (observation.status === "EXPIRED" && monitor.ssl.status !== "EXPIRED") {
          await this.store.publishEvents(context, [{ eventType: "SSL_EXPIRED", tone: "CRITICAL", title: `${monitor.endpointName}: el certificado TLS está vencido.`, payload: { expiresAt: observation.expiresAt, hostname: observation.hostname } }], [{ aggregateType: "MONITOR", eventType: "SSL_EXPIRED", payload: { expiresAt: observation.expiresAt } }]);
          await this.alerts.dispatchSsl(monitor, observation, null);
        } else if (observation.status === "INVALID" && monitor.ssl.status !== "INVALID") {
          await this.store.publishEvents(context, [{ eventType: "SSL_INVALID", tone: "CRITICAL", title: `${monitor.endpointName}: certificado inválido (${observation.errorType}).`, payload: { errorType: observation.errorType } }], [{ aggregateType: "MONITOR", eventType: "SSL_EXPIRED", payload: { invalid: true, errorType: observation.errorType } }]);
          await this.alerts.dispatchSsl(monitor, observation, null);
        } else if (threshold !== null && observation.valid && (renewed || previousThreshold === null || threshold < previousThreshold)) {
          await this.store.publishEvents(context, [{ eventType: "SSL_EXPIRING", tone: threshold <= 7 ? "CRITICAL" : "WARNING", title: `${monitor.endpointName}: el certificado vence en ${observation.daysRemaining} días.`, payload: { threshold, expiresAt: observation.expiresAt } }], [{ aggregateType: "MONITOR", eventType: "SSL_EXPIRING", payload: { threshold, daysRemaining: observation.daysRemaining } }]);
          await this.alerts.dispatchSsl(monitor, observation, threshold);
        } else if (renewed) {
          await this.store.publishEvents(context, [{ eventType: "SSL_RENEWED", tone: "SUCCESS", title: `${monitor.endpointName}: certificado renovado hasta ${santiagoDate(observation.expiresAt)}.`, payload: { expiresAt: observation.expiresAt } }], []);
        }
      } catch (error) { this.logger.error(`SSL ${monitor.id}: ${error instanceof Error ? error.message : error}`); }
    }
    return probed;
  }

  isLeaseLost(error: unknown) { return error instanceof MonitoringError && error.code === "MONITOR_LEASE_LOST"; }
}

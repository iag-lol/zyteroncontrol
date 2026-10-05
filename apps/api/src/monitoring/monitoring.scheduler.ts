import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { MonitoringAlerts } from "./monitoring.alerts.js";
import { MonitoringRunner } from "./monitoring.runner.js";
import { MONITORING_STORE, type MonitoringStore } from "./monitoring.store.js";

// Scheduler distribuido sin dependencias externas: cada instancia reclama monitores vencidos con
// SELECT … FOR UPDATE SKIP LOCKED + lease, por lo que N workers (web service y/o Background Worker de
// Render) pueden convivir sin ejecutar dos veces el mismo check. Las tareas periódicas son idempotentes.

export const LEASE_SECONDS = 120;
const TICK_MS = Math.max(5_000, Number(process.env.MONITORING_TICK_MS) || 15_000);
const MAX_CONCURRENCY = Math.min(32, Math.max(1, Number(process.env.MONITORING_MAX_CONCURRENCY) || 8));
const HOUSEKEEPING_MS = 60_000, ROLLUP_MS = 5 * 60_000, PURGE_MS = 6 * 3_600_000;

export function monitoringWorkerEnabled() {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return false;
  // El despliegue económico de Zyteron usa el mismo proceso del API para ejecutar los checks.
  // Un Background Worker dedicado sigue siendo compatible: en ese caso se configura
  // MONITORING_WORKER_ENABLED=false únicamente en el web service del API. Los leases de
  // Supabase hacen segura una superposición breve durante despliegues o escalado horizontal.
  return process.env.MONITORING_WORKER_ENABLED?.trim().toLowerCase() !== "false";
}

@Injectable()
export class MonitoringScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MonitoringScheduler.name);
  readonly workerId = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private stopping = false;
  private readonly inFlight = new Set<Promise<unknown>>();
  private checksExecuted = 0;
  private lastError: string | null = null;
  private lastHousekeeping = 0;
  private lastRollup = 0;
  private lastPurge = 0;

  constructor(@Inject(MONITORING_STORE) private readonly store: MonitoringStore, private readonly runner: MonitoringRunner, private readonly alerts: MonitoringAlerts) {}

  onApplicationBootstrap() {
    if (!monitoringWorkerEnabled() || this.store.mode === "unavailable") { this.logger.log("Worker de monitoreo deshabilitado en esta instancia."); return; }
    this.logger.log(`Worker de monitoreo ${this.workerId} activo (${this.store.mode}, tick ${TICK_MS} ms, concurrencia ${MAX_CONCURRENCY}).`);
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    void this.tick();
  }

  async onApplicationShutdown() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await Promise.race([Promise.allSettled([...this.inFlight]), new Promise((resolve) => setTimeout(resolve, 10_000))]);
  }

  /** Un ciclo del scheduler. Público para pruebas controladas y para el worker standalone. */
  async tick(now = Date.now()) {
    if (this.ticking || this.stopping) return;
    this.ticking = true;
    try {
      const capacity = MAX_CONCURRENCY - this.inFlight.size;
      if (capacity > 0) {
        for (const execution of await this.store.claimDue(this.workerId, capacity, LEASE_SECONDS)) {
          const task = this.runner.execute(execution, "SCHEDULED", this.workerId)
            .then(() => { this.checksExecuted += 1; })
            .catch(async (error) => {
              if (this.runner.isLeaseLost(error)) return;
              this.lastError = error instanceof Error ? error.message : String(error);
              this.logger.error(`Check ${execution.id} falló: ${this.lastError}`);
              await this.store.releaseLease(execution.id, this.workerId, 60).catch(() => undefined);
            })
            .finally(() => this.inFlight.delete(task));
          this.inFlight.add(task);
        }
      }
      if (now - this.lastHousekeeping >= HOUSEKEEPING_MS) { this.lastHousekeeping = now; await this.housekeeping(new Date(now)); }
      if (now - this.lastRollup >= ROLLUP_MS) { this.lastRollup = now; await this.store.refreshRollups(new Date(now - 2 * 3_600_000).toISOString(), new Date(now + 60_000).toISOString()); }
      if (now - this.lastPurge >= PURGE_MS) { this.lastPurge = now; const purge = await this.store.purge(); if (Number(purge.rawDeleted) > 0) this.logger.log(`Retención aplicada: ${JSON.stringify(purge)}`); }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tick de monitoreo: ${this.lastError}`);
    } finally { this.ticking = false; }
  }

  /** Mantenimiento automático, escalamientos, auto-resolución, SSL y latido del worker. */
  async housekeeping(now = new Date()) {
    const settings = await this.store.getSettings();
    const transitions = await this.store.runMaintenanceTransitions(now);
    for (const window of transitions.started) await this.alerts.dispatchMaintenance(window, "MAINTENANCE_STARTED").catch((error) => this.alerts.logError("Mantenimiento", error));
    for (const window of transitions.completed) await this.alerts.dispatchMaintenance(window, "MAINTENANCE_COMPLETED").catch((error) => this.alerts.logError("Mantenimiento", error));
    await this.alerts.processEscalations(now).catch((error) => this.alerts.logError("Escalamiento", error));
    if (settings.autoResolveAfterMinutes) {
      for (const incident of await this.store.incidentsForAutoResolve(settings.autoResolveAfterMinutes, now)) {
        const monitor = incident.monitorId ? await this.store.getMonitor(incident.monitorId) : undefined;
        if (monitor && monitor.consecutiveFailures > 0) continue;
        const toStatus = incident.postmortemRequired ? "POSTMORTEM_REQUIRED" : "RESOLVED";
        const resolved = await this.store.mutateIncident(incident.id, "MONITORING", { status: toStatus, resolved_at: now.toISOString() },
          [{ eventType: "RESOLVED", fromStatus: "MONITORING", toStatus, actorType: "SYSTEM", message: `Servicio estable ${settings.autoResolveAfterMinutes} min tras la recuperación; resuelto por política.`, occurredAt: now.toISOString() }],
          [{ eventType: "INCIDENT_RESOLVED", tone: "SUCCESS", title: "Incidente {incidentNumber} resuelto tras período de observación estable.", occurredAt: now.toISOString() }],
          [{ eventType: "INCIDENT_RESOLVED", payload: { automatic: true } }]);
        if (resolved) await this.alerts.dispatchIncident("INCIDENT_RESOLVED", resolved, monitor ?? null).catch((error) => this.alerts.logError("Alertas", error));
      }
    }
    await this.runner.probeCertificates(5).catch((error) => this.alerts.logError("SSL", error));
    for (const event of await this.store.claimOutbox(this.workerId, 50, LEASE_SECONDS)) {
      try { await this.alerts.dispatchOutbox(event); await this.store.completeOutbox(event.id, this.workerId, null); }
      catch (error) { const message = error instanceof Error ? error.message : String(error); await this.store.completeOutbox(event.id, this.workerId, message).catch(() => undefined); this.alerts.logError("Outbox", error); }
    }
    await this.store.heartbeat({ workerId: this.workerId, hostname: hostname(), checksExecuted: this.checksExecuted, lastError: this.lastError, releaseSha: process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT_SHA ?? null, persistenceMode: this.store.mode, schedulerActive: true, processRole: process.env.MONITORING_PROCESS_ROLE ?? "unspecified" }).catch(() => undefined);
  }

  /** Espera los checks lanzados por el último tick (pruebas y apagado ordenado). */
  async drain() { await Promise.allSettled([...this.inFlight]); }

  diagnostics() {
    return { active: Boolean(this.timer) && !this.stopping, workerId: this.workerId, checksExecuted: this.checksExecuted, lastError: this.lastError, processRole: process.env.MONITORING_PROCESS_ROLE ?? "unspecified" };
  }
}

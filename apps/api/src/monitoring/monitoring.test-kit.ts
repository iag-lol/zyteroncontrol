import { randomUUID } from "node:crypto";
import { OperationsRepository } from "../operations/operations.repository.js";
import { CertificateProbe, type CertificateObservation } from "./certificate-probe.js";
import type { HttpChecker, HttpCheckRequest, HttpCheckResult } from "./http-checker.js";
import { MonitoringAlerts, MonitoringMailer } from "./monitoring.alerts.js";
import { MemoryMonitoringStore } from "./monitoring.memory-store.js";
import { MonitoringRunner } from "./monitoring.runner.js";
import { MonitoringScheduler } from "./monitoring.scheduler.js";
import { MonitoringService, type MonitoringActor } from "./monitoring.service.js";
import type { Resolver } from "./ssrf-guard.js";

// Kit de pruebas: grafo real (Operaciones + Monitoreo en memoria) con red simulada de forma explícita.
export const ids = { gerente: randomUUID(), jefe: randomUUID(), dev: randomUUID(), otherDev: randomUUID(), lead: randomUUID(), client: randomUUID(), clientB: randomUUID() };
export const actors = {
  gerente: { userId: ids.gerente, role: "GERENTE_GENERAL" } as MonitoringActor,
  jefe: { userId: ids.jefe, role: "JEFE_DESARROLLO" } as MonitoringActor,
  dev: { userId: ids.dev, role: "PROGRAMADOR" } as MonitoringActor,
  otherDev: { userId: ids.otherDev, role: "PROGRAMADOR" } as MonitoringActor,
  ventas: { userId: randomUUID(), role: "EJECUTIVA_VENTAS" } as MonitoringActor,
  sinRol: { userId: randomUUID(), role: "" } as MonitoringActor,
};

export class ScriptedChecker {
  private readonly queue = new Map<string, Array<Partial<HttpCheckResult>>>();
  readonly calls: HttpCheckRequest[] = [];
  script(url: string, ...results: Array<Partial<HttpCheckResult>>) { this.queue.set(url, [...(this.queue.get(url) ?? []), ...results]); }
  async check(request: HttpCheckRequest): Promise<HttpCheckResult> {
    this.calls.push(request);
    const next = this.queue.get(request.url)?.shift() ?? ok();
    return { checkedAt: new Date().toISOString(), success: true, statusCode: 200, latencyMs: 120, errorType: null, errorCode: null, errorMessage: null, redirectCount: 0, contentMatched: null, sslValid: true, sslExpiresAt: null, ...next };
  }
}
export const ok = (latencyMs = 120): Partial<HttpCheckResult> => ({ success: true, statusCode: 200, latencyMs });
export const fail = (statusCode = 500): Partial<HttpCheckResult> => ({ success: false, statusCode, latencyMs: 80, errorType: "HTTP_STATUS", errorCode: String(statusCode), errorMessage: `HTTP ${statusCode} fuera del rango esperado 200-299.` });

export class StubProbe extends CertificateProbe {
  next: CertificateObservation | null = null;
  override async probe(): Promise<CertificateObservation> {
    return this.next ?? { hostname: "www.zyteron.cl", observedAt: new Date().toISOString(), status: "HEALTHY", valid: true, issuer: "R11 · Let's Encrypt", subject: "www.zyteron.cl", notBefore: null, expiresAt: new Date(Date.now() + 200 * 86_400_000).toISOString(), daysRemaining: 200, fingerprint: "AA:BB", errorType: null, errorCode: null };
  }
}

export const publicResolver: Resolver = async () => [{ address: "93.184.216.34", family: 4 }];

export async function createKit() {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const operations = new OperationsRepository();
  const store = new MemoryMonitoringStore(operations);
  const checker = new ScriptedChecker();
  const probe = new StubProbe();
  const alerts = new MonitoringAlerts(store, new MonitoringMailer());
  const runner = new MonitoringRunner(store, checker as unknown as HttpChecker, probe, alerts);
  const service = new MonitoringService(store, runner, alerts, publicResolver);
  const scheduler = new MonitoringScheduler(store, runner, alerts);
  const projectA = await operations.createProject({ workOrderId: randomUUID(), name: "Zyteron Web", scope: "Sitio corporativo", clientId: ids.client, clientName: "Zyteron SpA", priority: "HIGH", projectLeadId: ids.lead, developmentManagerId: ids.jefe });
  const projectB = await operations.createProject({ workOrderId: randomUUID(), name: "Portal B", scope: "Portal", clientId: ids.clientB, clientName: "Cliente B", priority: "NORMAL" });
  await operations.addMember(projectA.id, { userId: ids.dev, projectRole: "DEVELOPER" });
  await operations.addMember(projectB.id, { userId: ids.otherDev, projectRole: "DEVELOPER" });
  /** Ejecuta un ciclo del scheduler sobre el monitor indicado como si estuviera vencido. */
  const tick = async (monitorId: string) => { store.forceDue(monitorId); await scheduler.tick(Date.now()); await scheduler.drain(); };
  return { operations, store, checker, probe, alerts, runner, service, scheduler, projectA, projectB, tick };
}

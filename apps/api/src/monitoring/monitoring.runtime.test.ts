import { afterEach, describe, expect, it, vi } from "vitest";
import { monitoringWorkerEnabled } from "./monitoring.scheduler.js";
import { unavailableMonitoringStore } from "./monitoring.store.js";

describe("runtime productivo de Monitoreo", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ejecuta el scheduler en producción sólo dentro del proceso worker", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("MONITORING_WORKER_ENABLED", "true");
    vi.stubEnv("MONITORING_PROCESS_ROLE", "api");
    expect(monitoringWorkerEnabled()).toBe(false);
    vi.stubEnv("MONITORING_PROCESS_ROLE", "worker");
    expect(monitoringWorkerEnabled()).toBe(true);
  });

  it("la ausencia de Supabase produce 503 explícito y nunca memoria implícita", async () => {
    const store = unavailableMonitoringStore();
    expect(store.mode).toBe("unavailable");
    await expect(store.listMonitors({ projectIds: null })).rejects.toMatchObject({ status: 503 });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { monitoringWorkerEnabled } from "./monitoring.scheduler.js";
import { unavailableMonitoringStore } from "./monitoring.store.js";

describe("runtime productivo de Monitoreo", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("activa el scheduler integrado por defecto en el API productivo", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("MONITORING_WORKER_ENABLED", "");
    vi.stubEnv("MONITORING_PROCESS_ROLE", "api");
    expect(monitoringWorkerEnabled()).toBe(true);
  });

  it("permite desactivar explícitamente el scheduler integrado al usar un worker dedicado", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("MONITORING_PROCESS_ROLE", "api");
    vi.stubEnv("MONITORING_WORKER_ENABLED", "false");
    expect(monitoringWorkerEnabled()).toBe(false);
    vi.stubEnv("MONITORING_PROCESS_ROLE", "worker");
    vi.stubEnv("MONITORING_WORKER_ENABLED", "true");
    expect(monitoringWorkerEnabled()).toBe(true);
  });

  it("la ausencia de Supabase produce 503 explícito y nunca memoria implícita", async () => {
    const store = unavailableMonitoringStore();
    expect(store.mode).toBe("unavailable");
    await expect(store.listMonitors({ projectIds: null })).rejects.toMatchObject({ status: 503 });
  });
});

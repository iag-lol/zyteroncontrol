import { afterEach, describe, expect, it, vi } from "vitest";
import { monitoringApiBase } from "./monitoring-api";

describe("configuración del API de Monitoreo", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("normaliza URLs de Render sin duplicar /api", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://zyteroncontrol-api.onrender.com/");
    expect(monitoringApiBase()).toBe("https://zyteroncontrol-api.onrender.com/api");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://zyteroncontrol-api.onrender.com/api/api");
    expect(monitoringApiBase()).toBe("https://zyteroncontrol-api.onrender.com/api");
  });

  it("en producción no vuelve silenciosamente a localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(() => monitoringApiBase()).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});

import { describe, expect, it } from "vitest";
import { formatDuration, formatMs, formatPercent, observationFreshness, optionalSantiagoIso, santiagoToIso, uptimeBand } from "./monitoring-format";
import { formatDate, formatDateTime } from "./date-time";

describe("Formatos de Monitoreo", () => {
  it("distingue mediciones vigentes, vencidas y endpoints nunca comprobados", () => {
    const now = Date.parse("2026-10-04T12:00:00.000Z");
    expect(observationFreshness({ lastCheckedAt: null, intervalSeconds: 300 }, now)).toBe("NEVER_CHECKED");
    expect(observationFreshness({ lastCheckedAt: "2026-10-04T11:56:00.000Z", intervalSeconds: 300 }, now)).toBe("FRESH");
    expect(observationFreshness({ lastCheckedAt: "2026-10-04T11:49:00.000Z", intervalSeconds: 300 }, now)).toBe("STALE");
  });
  it("duraciones legibles: 7 min, 1 h 42 min", () => {
    expect(formatDuration(420)).toBe("7 min");
    expect(formatDuration(6120)).toBe("1 h 42 min");
    expect(formatDuration(null)).toBe("Sin dato");
  });
  it("DD-MM-AAAA + HH:mm America/Santiago se persiste en UTC y vuelve idéntico", () => {
    const iso = santiagoToIso("01-10-2026", "16:00")!;
    expect(iso).toBe("2026-10-01T19:00:00.000Z");
    expect(formatDateTime(iso)).toBe("01-10-2026 16:00");
    expect(formatDateTime(santiagoToIso("15-01-2027", "23:59")!)).toBe("15-01-2027 23:59");
    expect(santiagoToIso("31-02-2026", "10:00")).toBeNull();
    expect(santiagoToIso("01-10-2026", "24:30")).toBeNull();
    expect(optionalSantiagoIso("", "00:00")).toBeUndefined();
    expect(formatDate("2026-10-02T02:30:00.000Z")).toBe("01-10-2026");
  });
  it("bandas de uptime y valores sin datos explícitos (no se inventan métricas)", () => {
    expect(uptimeBand(99.95)).toBe("good");
    expect(uptimeBand(99.5)).toBe("warning");
    expect(uptimeBand(96)).toBe("serious");
    expect(uptimeBand(80)).toBe("critical");
    expect(uptimeBand(null)).toBe("empty");
    expect(formatPercent(null)).toBe("Sin datos");
    expect(formatMs(null)).toBe("—");
    expect(formatMs(1534)).toBe("1,53 s");
  });
});

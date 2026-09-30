import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime, toIsoDate } from "./date-time";

describe("formato temporal America/Santiago", () => {
  it("muestra fecha DD-MM-AAAA y hora 24h", () => {
    expect(formatDate("2026-09-30T19:45:00.000Z")).toBe("30-09-2026");
    expect(formatTime("2026-09-30T19:45:00.000Z")).toBe("16:45");
    expect(formatDateTime("2026-09-30T19:45:00.000Z")).toBe("30-09-2026 16:45");
  });
  it("convierte entradas válidas y rechaza fechas imposibles", () => {
    expect(toIsoDate("30-09-2026")).toBe("2026-09-30");
    expect(toIsoDate("31-02-2026")).toBeNull();
  });
});


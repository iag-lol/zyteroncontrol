import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime, toIsoDate, todayInChile } from "./date-time";

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
  it("conserva las fechas de trabajo y vencimiento sin restar un día", () => {
    expect(formatDate("2026-10-06")).toBe("06-10-2026");
    expect(formatDate("2026-10-06T00:00:00.000Z")).toBe("05-10-2026");
  });
  it("usa el día de Chile para informar trabajo después de medianoche UTC", () => {
    expect(todayInChile(new Date("2026-10-07T01:30:00.000Z"))).toBe("2026-10-06");
    expect(todayInChile(new Date("2026-10-07T05:00:00.000Z"))).toBe("2026-10-07");
  });
});

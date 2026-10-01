import { describe, expect, it } from "vitest";
import { navigation } from "./finance-nav-fixture";
import { canSeeFinancePath, day, financeSections, financeSectionsFor, label, money, parseDay, tone } from "./finance-format";

describe("Finanzas · formato y acceso", () => {
  it("publica las 22 secciones del módulo sin placeholders y alineadas al menú", () => {
    expect(financeSections).toHaveLength(22);
    expect(new Set(financeSections.map((s) => s.href)).size).toBe(22);
    expect(navigation.map((i) => i.href).sort()).toEqual(financeSections.map((s) => s.href).sort());
  });
  it("filtra secciones por permiso: contabilidad ve el libro, ventas sólo facturación y Desarrollo nada", () => {
    expect(financeSectionsFor("CONTADOR").some((s) => s.key === "journal")).toBe(true);
    expect(financeSectionsFor("CONTADOR").some((s) => s.key === "commissions")).toBe(false);
    expect(financeSectionsFor("JEFE_VENTAS").map((s) => s.key)).toEqual(["invoices", "receivables", "collections", "payments"]);
    expect(financeSectionsFor("PROGRAMADOR")).toHaveLength(0);
    expect(canSeeFinancePath("JEFE_VENTAS", "/finance/journal")).toBe(false);
  });
  it("formatea fechas DD-MM-AAAA y montos CLP exactos", () => {
    expect(day("2026-09-05")).toBe("05-09-2026");
    expect(parseDay("31-02-2026")).toBeNull();
    expect(parseDay("05-09-2026")).toBe("2026-09-05");
    expect(money(1190000)).toBe("$1.190.000");
    expect(money(-500)).toBe("−$500");
  });
  it("traduce estados financieros y su tono", () => {
    expect(label("PENDING_VERIFICATION")).toBe("Por verificar");
    expect(tone("REJECTED")).toBe("bad");
    expect(tone("POSTED")).toBe("good");
  });
});

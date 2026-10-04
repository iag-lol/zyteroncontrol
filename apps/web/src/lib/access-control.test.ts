import { describe, expect, it } from "vitest";
import { canAccessGroup, groupForPath } from "./access-control";

describe("control de acceso por rol", () => {
  it("entrega acceso transversal a Gerencia General", () => {
    expect(canAccessGroup("GERENTE_GENERAL", "finance")).toBe(true);
    expect(canAccessGroup("GERENTE_GENERAL", "settings")).toBe(true);
  });

  it("limita ventas a sus dominios operativos", () => {
    expect(canAccessGroup("EJECUTIVA_VENTAS", "commercial")).toBe(true);
    expect(canAccessGroup("EJECUTIVA_VENTAS", "clients")).toBe(true);
    expect(canAccessGroup("EJECUTIVA_VENTAS", "finance")).toBe(false);
  });

  it("resuelve rutas anidadas al dominio correcto", () => {
    expect(groupForPath("/crm/opportunities/42")).toBe("commercial");
    expect(groupForPath("/monitoring/incidents/active")).toBe("monitoring");
    expect(groupForPath("/finance/invoices")).toBe("finance");
  });

  it("permite a managers abrir Settings y delega el alcance fino al backend", () => {
    expect(canAccessGroup("RRHH", "settings")).toBe(true);
    expect(canAccessGroup("FINANZAS", "settings")).toBe(true);
    expect(canAccessGroup("JEFE_DESARROLLO", "settings")).toBe(true);
  });
});

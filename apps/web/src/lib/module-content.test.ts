import { describe, expect, it } from "vitest";
import { getModuleDescriptor } from "./module-content";

describe("contenido modular", () => {
  it("usa el nombre configurado para una ruta real", () => {
    const descriptor = getModuleDescriptor("/crm/leads");
    expect(descriptor.group).toBe("commercial");
    expect(descriptor.title).toBe("Leads");
    expect(descriptor.emptyMessage).toContain("No existen");
  });

  it("crea un título seguro para rutas profundas", () => {
    const descriptor = getModuleDescriptor("/projects/releases");
    expect(descriptor.group).toBe("operations");
    expect(descriptor.title).toBe("Releases");
  });

  it("resuelve las secciones agregadas de clientes sin tratarlas como clientes individuales", () => {
    expect(getModuleDescriptor("/clients/contacts").title).toBe("Contactos");
    expect(getModuleDescriptor("/clients/contracts").title).toBe("Contratos");
    expect(getModuleDescriptor("/clients/services").title).toBe("Servicios contratados");
    expect(getModuleDescriptor("/clients/renewals").title).toBe("Renovaciones");
  });
});

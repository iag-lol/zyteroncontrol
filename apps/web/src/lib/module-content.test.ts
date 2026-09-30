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
});

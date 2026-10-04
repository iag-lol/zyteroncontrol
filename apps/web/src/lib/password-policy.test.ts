import { describe, expect, it } from "vitest";
import { validateNewPassword } from "./password-policy";

describe("validateNewPassword", () => {
  it("acepta una contraseña empresarial válida", () => {
    expect(validateNewPassword("ZyteronControl2026", "ZyteronControl2026")).toBe("");
  });

  it("rechaza contraseñas cortas o débiles", () => {
    expect(validateNewPassword("Corta1", "Corta1")).toContain("12 caracteres");
    expect(validateNewPassword("zyteroncontrol2026", "zyteroncontrol2026")).toContain("mayúscula");
  });

  it("exige confirmación coincidente", () => {
    expect(validateNewPassword("ZyteronControl2026", "OtraClave2026")).toContain("no coinciden");
  });
});

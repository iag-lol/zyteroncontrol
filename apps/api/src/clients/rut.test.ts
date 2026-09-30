import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { validateCreateClient } from "./clients.dto.js";
import { isValidChileanRut, normalizeRut } from "./rut.js";

describe("RUT chileno", () => {
  it("acepta y normaliza los tres formatos solicitados", () => {
    expect(isValidChileanRut("18.866.264-1")).toBe(true);
    expect(isValidChileanRut("18866264-1")).toBe(true);
    expect(isValidChileanRut("188662641")).toBe(true);
    expect(normalizeRut("18.866.264-1")).toBe("18866264-1");
  });
  it("rechaza un dígito verificador inválido", () => {
    expect(isValidChileanRut("18.866.264-2")).toBe(false);
    expect(() => validateCreateClient({ legalName: "Prueba", rut: "18.866.264-2", country: "Chile" })).toThrow(BadRequestException);
  });
  it("convierte responsables vacíos a valores ausentes", () => {
    const result = validateCreateClient({
      legalName: "Prueba",
      rut: "18.866.264-1",
      country: "Chile",
      accountExecutiveId: " ",
      clientLeadId: "",
    });
    expect(result.accountExecutiveId).toBeUndefined();
    expect(result.clientLeadId).toBeUndefined();
  });
  it("rechaza nombres libres en campos que requieren un usuario", () => {
    expect(() => validateCreateClient({
      legalName: "Prueba",
      rut: "18.866.264-1",
      country: "Chile",
      accountExecutiveId: "Eduardo",
    })).toThrow(BadRequestException);
  });
});

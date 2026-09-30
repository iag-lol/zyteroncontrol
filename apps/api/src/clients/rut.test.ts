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
});


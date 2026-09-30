import { BadRequestException } from "@nestjs/common";
import { clientStatuses, type CreateClientInput } from "@zyteron/contracts";
import { isValidChileanRut, normalizeRut } from "./rut.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateClient(input: CreateClientInput): CreateClientInput {
  const errors: string[] = [];
  if (!input.legalName?.trim()) errors.push("La razón social es obligatoria.");
  if (!isValidChileanRut(input.rut ?? "")) errors.push("El RUT ingresado no es válido.");
  if (!input.country?.trim()) errors.push("El país es obligatorio.");
  if (input.generalEmail && !emailPattern.test(input.generalEmail)) errors.push("El email general no es válido.");
  if (input.dteEmail && !emailPattern.test(input.dteEmail)) errors.push("El email DTE no es válido.");
  if (input.status && !clientStatuses.includes(input.status)) errors.push("El estado del cliente no es válido.");
  if ((input.creditDays ?? 0) < 0) errors.push("Los días de crédito no pueden ser negativos.");
  if (errors.length) throw new BadRequestException({ message: "Revisa los datos del cliente.", errors });
  return {
    ...input,
    legalName: input.legalName.trim(),
    tradeName: input.tradeName?.trim(),
    rut: normalizeRut(input.rut),
    billingRut: input.billingRut ? normalizeRut(input.billingRut) : undefined,
    country: input.country.trim(),
    currency: input.currency ?? "CLP",
    creditDays: input.creditDays ?? 0,
    status: input.status ?? "ONBOARDING",
  };
}

export function parsePagination(pageRaw?: string, pageSizeRaw?: string) {
  const page = Math.max(1, Number(pageRaw) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw) || 25));
  return { page, pageSize };
}


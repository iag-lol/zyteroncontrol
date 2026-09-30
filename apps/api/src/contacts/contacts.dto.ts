import { BadRequestException } from "@nestjs/common";
import { contactTypes, type ClientContact, type ContactType } from "@zyteron/contracts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ContactInput = Omit<ClientContact, "id" | "createdAt" | "updatedAt" | "archivedAt" | "portalStatus">;

export function validateContact(input: ContactInput): ContactInput {
  const errors: string[] = [];
  if (!uuidPattern.test(input.clientId ?? "")) errors.push("Selecciona un cliente válido.");
  if (!input.name?.trim()) errors.push("El nombre es obligatorio.");
  if (!input.email || !emailPattern.test(input.email)) errors.push("El email no es válido.");
  const types = [...new Set((input.contactTypes ?? []).filter((type): type is ContactType => contactTypes.includes(type as ContactType)))];
  if (errors.length) throw new BadRequestException({ message: "Revisa los datos del contacto.", errors });
  return {
    ...input,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    position: input.position?.trim() || null,
    department: input.department?.trim() || null,
    notes: input.notes?.trim() || null,
    contactTypes: types,
    isPrimary: input.isPrimary || types.includes("PRINCIPAL"),
    commercialContact: input.commercialContact || types.includes("COMERCIAL"),
    technicalContact: input.technicalContact || types.includes("TECNICO"),
    billingContact: input.billingContact || types.includes("FACTURACION"),
    portalAccess: input.portalAccess || types.includes("PORTAL"),
    status: input.status ?? "ACTIVE",
  };
}

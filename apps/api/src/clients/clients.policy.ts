import { Injectable } from "@nestjs/common";
import type { Role } from "@zyteron/contracts";

export const clientPermissions = [
  "client.view", "client.create", "client.edit", "client.archive", "client.assign", "client.export",
  "client.contacts.manage", "client.services.manage", "client.finance.view", "client.monitoring.view",
  "client.audits.view", "client.portal.manage",
] as const;

@Injectable()
export class ClientsPolicy {
  canViewFinance(role: Role) { return role === "GERENTE_GENERAL" || role === "FINANZAS"; }
  canManagePortal(role: Role) { return role === "GERENTE_GENERAL"; }
  canManageClient(role: Role) { return ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"].includes(role); }
}

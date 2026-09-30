import { Injectable } from "@nestjs/common";
import type { Role } from "@zyteron/contracts";

export const clientPermissions = [
  "client.view", "client.create", "client.edit", "client.archive", "client.assign", "client.export",
  "client.contacts.view", "client.contacts.manage",
  "client.contracts.view", "client.contracts.create", "client.contracts.edit", "client.contracts.approve", "client.contracts.sign_request",
  "client.services.view", "client.services.manage", "client.services.activate", "client.services.suspend",
  "client.renewals.view", "client.renewals.manage", "client.renewals.convert", "client.renewals.complete",
  "client.finance.view", "client.monitoring.view", "client.audits.view", "client.portal.manage",
] as const;

@Injectable()
export class ClientsPolicy {
  canViewFinance(role: Role) { return role === "GERENTE_GENERAL" || role === "FINANZAS"; }
  canManagePortal(role: Role) { return role === "GERENTE_GENERAL"; }
  canManageClient(role: Role) { return ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"].includes(role); }
}

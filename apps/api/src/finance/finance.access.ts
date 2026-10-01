import { ForbiddenException } from "@nestjs/common";
import type { FinanceScope, Role } from "@zyteron/contracts";
import type { FinanceActor } from "./finance.util.js";

// Matriz RBAC del módulo: espejo exacto de role_permissions sembrado en la migración (verificado por test).
export const financePermissions=["finance.dashboard.view","invoice.view","invoice.create","invoice.edit","invoice.approve","invoice.issue","dte.view","dte.issue","dte.credit_note","dte.debit_note","dte.manage","receivable.view","collection.manage","payment.view","payment.record","payment.refund","payment.allocate","payable.view","payable.approve","payable.pay","expense.view","expense.create","expense.approve","bank.view","bank.import","bank.reconcile","accounting.view","journal.create","journal.review","journal.post","journal.reverse","period.view","period.close","period.reopen","tax.view","tax.review","tax.manage","report.finance.view","report.finance.export","commission.finance.manage","finance.settings.manage"] as const;
export type FinancePermission=(typeof financePermissions)[number];
const accountant:FinancePermission[]=["finance.dashboard.view","invoice.view","dte.view","dte.manage","receivable.view","payment.view","payable.view","expense.view","expense.approve","bank.view","bank.import","bank.reconcile","accounting.view","journal.create","journal.review","journal.post","journal.reverse","period.view","period.close","period.reopen","tax.view","tax.review","tax.manage","report.finance.view","report.finance.export"];
const salesLead:FinancePermission[]=["invoice.view","invoice.create","receivable.view","collection.manage","payment.view"];
export const financeRoleMatrix:Partial<Record<Role,readonly FinancePermission[]>>={
  GERENTE_GENERAL:financePermissions,FINANZAS:financePermissions,CONTADOR:accountant,JEFE_VENTAS:salesLead,COMERCIAL:salesLead,EJECUTIVA_VENTAS:["invoice.view","receivable.view","collection.manage"],
};
export const can=(role:string,permission:FinancePermission)=>Boolean(financeRoleMatrix[role as Role]?.includes(permission));
/** Roles habilitados para un permiso: alimenta @RequireRoles en el controlador (deny by default). */
export const rolesFor=(...permissions:FinancePermission[])=>(Object.keys(financeRoleMatrix) as Role[]).filter((role)=>permissions.some((permission)=>can(role,permission)));
export function assertCan(actor:FinanceActor,permission:FinancePermission){if(!can(actor.role,permission))throw new ForbiddenException(`Tu rol no tiene el permiso ${permission}.`);}
/** Ejecutiva de ventas: sólo sus clientes. Resto de roles con acceso: toda la cartera. Desarrollo: nada. */
export function clientScope(actor:FinanceActor):FinanceScope["clientScope"]{if(actor.role==="EJECUTIVA_VENTAS")return"OWN";return financeRoleMatrix[actor.role as Role]?"ALL":"NONE";}
export const scopeOf=(actor:FinanceActor):FinanceScope=>({role:actor.role,permissions:[...(financeRoleMatrix[actor.role as Role]??[])],clientScope:clientScope(actor)});
/** Márgenes, costos laborales y libro: sólo contabilidad/gerencia (nunca programadores ni ventas). */
export const canSeeMargins=(actor:FinanceActor)=>can(actor.role,"accounting.view");

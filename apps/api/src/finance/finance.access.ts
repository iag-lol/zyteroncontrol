import { ForbiddenException } from "@nestjs/common";
import { financeRoleMatrix, hasFinancePermission, type FinancePermission, type FinanceScope, type Role } from "@zyteron/contracts";
import type { FinanceActor } from "./finance.util.js";

// Matriz RBAC compartida con la web desde @zyteron/contracts (espejo de role_permissions; verificado por test).
export { financePermissions, financeRoleMatrix, type FinancePermission } from "@zyteron/contracts";
export const can=(role:string,permission:FinancePermission)=>hasFinancePermission(role,permission);
/** Roles habilitados para un permiso: alimenta @RequireRoles en el controlador (deny by default). */
export const rolesFor=(...permissions:FinancePermission[])=>(Object.keys(financeRoleMatrix) as Role[]).filter((role)=>permissions.some((permission)=>can(role,permission)));
export function assertCan(actor:FinanceActor,permission:FinancePermission){if(!can(actor.role,permission))throw new ForbiddenException(`Tu rol no tiene el permiso ${permission}.`);}
/** Ejecutiva de ventas: sólo sus clientes. Resto de roles con acceso: toda la cartera. Desarrollo: nada. */
export function clientScope(actor:FinanceActor):FinanceScope["clientScope"]{if(actor.role==="EJECUTIVA_VENTAS")return"OWN";return financeRoleMatrix[actor.role as Role]?"ALL":"NONE";}
export const scopeOf=(actor:FinanceActor):FinanceScope=>({role:actor.role,permissions:[...(financeRoleMatrix[actor.role as Role]??[])],clientScope:clientScope(actor)});
/** Márgenes, costos laborales y libro: sólo contabilidad/gerencia (nunca programadores ni ventas). */
export const canSeeMargins=(actor:FinanceActor)=>can(actor.role,"accounting.view");

import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("security/permissions") class PermissionsController { @Get() @RequireRoles("GERENTE_GENERAL") index() { return emptyDomain("permissions", "Matriz de permisos preparada."); } }
@Module({ controllers: [PermissionsController] }) export class PermissionsModule {}

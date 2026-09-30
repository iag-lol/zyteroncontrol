import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("security/roles") class RolesController { @Get() @RequireRoles("GERENTE_GENERAL") index() { return emptyDomain("roles", "No existen roles personalizados."); } }
@Module({ controllers: [RolesController] }) export class RolesModule {}

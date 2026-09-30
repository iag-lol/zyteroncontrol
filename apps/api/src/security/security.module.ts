import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("security") class SecurityController { @Get() @RequireRoles("GERENTE_GENERAL") index() { return emptyDomain("security", "No existen eventos de seguridad."); } }
@Module({ controllers: [SecurityController] }) export class SecurityModule {}

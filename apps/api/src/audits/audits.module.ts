import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("audits") class AuditsController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR", "DESARROLLO") index() { return emptyDomain("audits", "No existen auditorías registradas."); } }
@Module({ controllers: [AuditsController] }) export class AuditsModule {}

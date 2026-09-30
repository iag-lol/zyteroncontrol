import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("development") class DevelopmentController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR", "DESARROLLO") index() { return emptyDomain("development", "No hay asignaciones técnicas registradas."); } }
@Module({ controllers: [DevelopmentController] }) export class DevelopmentModule {}

import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("projects") class ProjectsController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR", "DESARROLLO", "OPERACIONES") index() { return emptyDomain("projects", "No hay proyectos registrados."); } }
@Module({ controllers: [ProjectsController] }) export class ProjectsModule {}

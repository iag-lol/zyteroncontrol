import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("incidents") class IncidentsController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR", "DESARROLLO", "OPERACIONES") index() { return emptyDomain("incidents", "No hay incidentes activos."); } }
@Module({ controllers: [IncidentsController] }) export class IncidentsModule {}

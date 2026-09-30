import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("reports") class ReportsController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "RRHH", "FINANZAS") index() { return emptyDomain("reports", "No existen informes generados."); } }
@Module({ controllers: [ReportsController] }) export class ReportsModule {}

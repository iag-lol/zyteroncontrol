import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("monitoring") class MonitoringController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR", "DESARROLLO", "OPERACIONES") index() { return emptyDomain("monitoring", "No hay sitios monitoreados."); } }
@Module({ controllers: [MonitoringController] }) export class MonitoringModule {}

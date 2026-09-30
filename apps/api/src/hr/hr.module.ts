import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("hr") class HrController { @Get() @RequireRoles("GERENTE_GENERAL", "RRHH") index() { return emptyDomain("hr", "No existen registros de personal."); } }
@Module({ controllers: [HrController] }) export class HrModule {}

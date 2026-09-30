import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("finance") class FinanceController { @Get() @RequireRoles("GERENTE_GENERAL", "FINANZAS") index() { return emptyDomain("finance", "No existen movimientos financieros."); } }
@Module({ controllers: [FinanceController] }) export class FinanceModule {}

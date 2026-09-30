import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("quotes") class QuotesController { @Get() @RequireRoles("GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL") index() { return emptyDomain("quotes", "No hay cotizaciones registradas."); } }
@Module({ controllers: [QuotesController] }) export class QuotesModule {}

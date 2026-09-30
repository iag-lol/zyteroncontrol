import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("documents") class DocumentsController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "EJECUTIVA_VENTAS", "PROGRAMADOR", "RRHH", "FINANZAS") index() { return emptyDomain("documents", "No existen documentos registrados."); } }
@Module({ controllers: [DocumentsController] }) export class DocumentsModule {}

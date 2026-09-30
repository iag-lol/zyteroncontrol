import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { emptyDomain } from "../domain/domain-response.js";

@Controller("support")
class SupportController {
  @Get()
  @RequireRoles("GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL", "OPERACIONES", "JEFE_DESARROLLO")
  index() { return emptyDomain("support", "No hay tickets registrados."); }
}

@Module({ controllers: [SupportController] })
export class SupportModule {}


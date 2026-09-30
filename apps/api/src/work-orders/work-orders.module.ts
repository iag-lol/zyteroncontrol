import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("work-orders") class WorkOrdersController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "OPERACIONES") index() { return emptyDomain("work-orders", "No hay órdenes de trabajo registradas."); } }
@Module({ controllers: [WorkOrdersController] }) export class WorkOrdersModule {}

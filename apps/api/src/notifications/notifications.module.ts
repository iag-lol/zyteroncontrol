import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("notifications") class NotificationsController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "EJECUTIVA_VENTAS", "PROGRAMADOR", "RRHH", "FINANZAS") index() { return emptyDomain("notifications", "No existen notificaciones registradas."); } }
@Module({ controllers: [NotificationsController] }) export class NotificationsModule {}

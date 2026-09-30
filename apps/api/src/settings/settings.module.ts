import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("settings") class SettingsController { @Get() @RequireRoles("GERENTE_GENERAL") index() { return emptyDomain("settings", "Configuración base disponible."); } }
@Module({ controllers: [SettingsController] }) export class SettingsModule {}

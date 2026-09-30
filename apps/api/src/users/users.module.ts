import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("users") class UsersController { @Get() @RequireRoles("GERENTE_GENERAL") index() { return emptyDomain("users", "No existen usuarios locales registrados."); } }
@Module({ controllers: [UsersController] }) export class UsersModule {}

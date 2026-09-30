import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("tasks") class TasksController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR", "DESARROLLO") index() { return emptyDomain("tasks", "No hay tareas registradas."); } }
@Module({ controllers: [TasksController] }) export class TasksModule {}

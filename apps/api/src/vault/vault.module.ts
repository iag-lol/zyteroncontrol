import { Controller, Get, Module } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js"; import { emptyDomain } from "../domain/domain-response.js";
@Controller("security/vault") class VaultController { @Get() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR") index() { return emptyDomain("vault", "No existen referencias de secretos. Nunca se devuelve plaintext."); } }
@Module({ controllers: [VaultController] }) export class VaultModule {}

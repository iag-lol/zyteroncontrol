import { Module } from "@nestjs/common";
import { SecurityController } from "./security.controller.js";
import { DeferredVaultSecretProvider,SecurityProviderStatus,VaultSecretProvider } from "./security.providers.js";
import { SecurityRepository } from "./security.repository.js";
import { SecurityService } from "./security.service.js";

@Module({controllers:[SecurityController],providers:[SecurityRepository,SecurityService,SecurityProviderStatus,DeferredVaultSecretProvider,{provide:VaultSecretProvider,useExisting:DeferredVaultSecretProvider}],exports:[SecurityService]})
export class SecurityModule{}

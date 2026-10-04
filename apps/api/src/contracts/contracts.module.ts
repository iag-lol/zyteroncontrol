import { Module } from "@nestjs/common";
import { ClientsModule } from "../clients/clients.module.js";
import { DocumentsModule } from "../documents/documents.module.js";
import { ContractDocumentService } from "./contract-document.service.js";
import { ClientContractsController, ContractsController } from "./contracts.controller.js";
import { ContractsRepository } from "./contracts.repository.js";
import { ContractsService } from "./contracts.service.js";

@Module({
  imports: [ClientsModule, DocumentsModule],
  controllers: [ContractsController, ClientContractsController],
  providers: [ContractsRepository, ContractsService, ContractDocumentService],
  exports: [ContractsService],
})
export class ContractsModule {}

import { Module } from "@nestjs/common";
import { ClientsModule } from "../clients/clients.module.js";
import { ClientContractsController, ContractsController } from "./contracts.controller.js";
import { ContractsRepository } from "./contracts.repository.js";
import { ContractsService } from "./contracts.service.js";

@Module({
  imports: [ClientsModule],
  controllers: [ContractsController, ClientContractsController],
  providers: [ContractsRepository, ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}

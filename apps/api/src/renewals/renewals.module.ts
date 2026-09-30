import { Module } from "@nestjs/common";
import { ClientsModule } from "../clients/clients.module.js";
import { ClientRenewalsController, RenewalsController } from "./renewals.controller.js";
import { RenewalsRepository } from "./renewals.repository.js";
import { RenewalsService } from "./renewals.service.js";

@Module({
  imports: [ClientsModule],
  controllers: [RenewalsController, ClientRenewalsController],
  providers: [RenewalsRepository, RenewalsService],
  exports: [RenewalsService],
})
export class RenewalsModule {}

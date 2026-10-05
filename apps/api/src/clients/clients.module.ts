import { Module } from "@nestjs/common";
import { ClientEventsService } from "./client-events.service.js";
import { ClientHealthService } from "./client-health.service.js";
import { ClientIntegrationsService } from "./client-integrations.service.js";
import { ClientsController } from "./clients.controller.js";
import { ClientsPolicy } from "./clients.policy.js";
import { ClientsRepository } from "./clients.repository.js";
import { ClientsService } from "./clients.service.js";
import { AuditsModule } from "../audits/audits.module.js";
import { SupportModule } from "../support/support.module.js";
import { DocumentsModule } from "../documents/documents.module.js";
import { InsightsModule } from "../insights/insights.module.js";

@Module({
  imports: [AuditsModule, SupportModule, DocumentsModule, InsightsModule],
  controllers: [ClientsController],
  providers: [ClientsRepository, ClientsService, ClientsPolicy, ClientEventsService, ClientHealthService, ClientIntegrationsService],
  exports: [ClientsService, ClientsPolicy, ClientEventsService, ClientHealthService, ClientIntegrationsService],
})
export class ClientsModule {}

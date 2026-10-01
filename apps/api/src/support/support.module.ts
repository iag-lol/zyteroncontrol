import { Module } from "@nestjs/common";
import { DevelopmentModule } from "../development/development.module.js";
import { OperationsModule } from "../operations/operations.module.js";
import { DocumentsModule } from "../documents/documents.module.js";
import { ClientSupportController, SupportController, SupportKnowledgeController, SupportRelationsController } from "./support.controller.js";
import { DeferredMailSupportProvider, SupportChannelProvider, SupportCopilotProvider } from "./support.providers.js";
import { SupportRepository } from "./support.repository.js";
import { SupportSlaEngine } from "./support.sla.js";
import { SupportAttachmentService, SupportCatalogService, SupportChannelService, SupportKnowledgeService, SupportReadService, SupportSlaService, SupportTicketService } from "./support.service.js";

@Module({
  imports:[OperationsModule,DevelopmentModule,DocumentsModule],
  controllers:[SupportController,SupportKnowledgeController,ClientSupportController,SupportRelationsController],
  providers:[SupportRepository,SupportSlaEngine,SupportCatalogService,SupportSlaService,SupportTicketService,SupportAttachmentService,SupportKnowledgeService,SupportChannelService,SupportReadService,SupportCopilotProvider,DeferredMailSupportProvider,{provide:SupportChannelProvider,useExisting:DeferredMailSupportProvider}],
  exports:[SupportReadService],
})
export class SupportModule {}

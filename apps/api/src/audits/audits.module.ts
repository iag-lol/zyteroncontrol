import { Module } from "@nestjs/common";
import { DevelopmentModule } from "../development/development.module.js";
import { OperationsModule } from "../operations/operations.module.js";
import { DocumentsModule } from "../documents/documents.module.js";
import { AuditEvidenceController, AuditReportsController, AuditsController, AuditTemplatesController, AuditTemplateVersionsController, FindingsController, ProjectAuditsController } from "./audits.controller.js";
import { AuditAutomationProvider, AuditReportRenderer, DeferredPerformanceAuditProvider, PerformanceAuditProvider, SafeHttpAuditProvider } from "./audits.providers.js";
import { AuditsRepository } from "./audits.repository.js";
import { AuditCatalogService, AuditEvidenceService, AuditExecutionService, AuditFindingService, AuditPlanService, AuditReadService, AuditReportService } from "./audits.service.js";

@Module({
  imports:[OperationsModule,DevelopmentModule,DocumentsModule],
  controllers:[AuditsController,FindingsController,AuditTemplatesController,AuditTemplateVersionsController,AuditEvidenceController,AuditReportsController,ProjectAuditsController],
  providers:[AuditsRepository,AuditCatalogService,AuditPlanService,AuditExecutionService,AuditFindingService,AuditEvidenceService,AuditReportService,AuditReadService,SafeHttpAuditProvider,{provide:AuditAutomationProvider,useExisting:SafeHttpAuditProvider},DeferredPerformanceAuditProvider,{provide:PerformanceAuditProvider,useExisting:DeferredPerformanceAuditProvider},AuditReportRenderer],
  exports:[AuditReadService],
})
export class AuditsModule {}

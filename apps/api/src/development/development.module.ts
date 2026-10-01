import { Module } from "@nestjs/common";
import { OperationsModule } from "../operations/operations.module.js";
import { BugsController, DevelopmentController, DevelopmentWebhooksController, EnvironmentsController, IntegrationsController, ProjectDevelopmentController, QaController, ReleasesController, RepositoriesController, TechnicalDebtController } from "./development.controller.js";
import { GitHubActionsProvider, GitHubSourceControlProvider, RenderDeploymentProvider } from "./development.providers.js";
import { DevelopmentRepository } from "./development.repository.js";
import { DevelopmentManagementService, DevelopmentReadService, IntegrationService, QualityService, ReleaseService } from "./development.service.js";

@Module({
  imports:[OperationsModule],
  controllers:[DevelopmentController,ProjectDevelopmentController,RepositoriesController,QaController,BugsController,ReleasesController,EnvironmentsController,TechnicalDebtController,IntegrationsController,DevelopmentWebhooksController],
  providers:[DevelopmentRepository,DevelopmentReadService,DevelopmentManagementService,QualityService,ReleaseService,IntegrationService,GitHubSourceControlProvider,GitHubActionsProvider,RenderDeploymentProvider],
  exports:[DevelopmentReadService],
})
export class DevelopmentModule {}

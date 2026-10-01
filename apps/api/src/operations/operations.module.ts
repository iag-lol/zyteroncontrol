import { Module } from "@nestjs/common";
import {
  DeliverablesController, DeploymentsController, MilestonesController, OperationsController,
  ProjectsController, TasksController, WorklogsController, WorkOrdersController,
} from "./operations.controller.js";
import { OperationsRepository } from "./operations.repository.js";
import { OperationsService } from "./operations.service.js";

@Module({
  controllers: [OperationsController, WorkOrdersController, ProjectsController, TasksController, MilestonesController, WorklogsController, DeliverablesController, DeploymentsController],
  providers: [OperationsRepository, OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}

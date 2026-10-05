import { Module } from "@nestjs/common";
import { InsightsModule } from "../insights/insights.module.js";
import { ExecutiveController } from "./executive.controller.js";

@Module({ imports:[InsightsModule], controllers:[ExecutiveController] })
export class ExecutiveModule {}

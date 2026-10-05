import { Module } from "@nestjs/common";
import { DomainInsightsService } from "./domain-insights.service.js";

@Module({ providers:[DomainInsightsService], exports:[DomainInsightsService] })
export class InsightsModule {}

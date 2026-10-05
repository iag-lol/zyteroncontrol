import { Controller, Get } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { DomainInsightsService } from "../insights/domain-insights.service.js";

@Controller("executive")
export class ExecutiveController {
  constructor(private readonly insights:DomainInsightsService) {}
  @Get("dashboard") @RequireRoles("GERENTE_GENERAL") dashboard(){ return this.insights.executive(); }
}

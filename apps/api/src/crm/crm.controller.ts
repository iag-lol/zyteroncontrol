import { Body, Controller, Get, Post } from "@nestjs/common";
import type { CreateCommercialRecord } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import { CrmService } from "./crm.service.js";

@Controller("crm")
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get("pipeline")
  @RequireRoles("GERENTE_GENERAL", "COMERCIAL", "OPERACIONES")
  pipeline() {
    return this.crmService.getPipeline();
  }

  @Post("records")
  @RequireRoles("GERENTE_GENERAL", "COMERCIAL")
  create(@Body() input: CreateCommercialRecord) {
    return this.crmService.create(input);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import type { RenewalInput } from "./renewals.dto.js";
import { RenewalsService } from "./renewals.service.js";

const readers = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL", "FINANZAS"] as const;
const managers = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"] as const;

@Controller("renewals")
export class RenewalsController {
  constructor(private readonly service: RenewalsService) {}

  @Get()
  @RequireRoles(...readers)
  list(@Query() query: Record<string, string | undefined>) { return this.service.list(query); }

  @Post()
  @RequireRoles(...managers)
  create(@Body() body: RenewalInput) { return this.service.create(body); }

  @Get(":id")
  @RequireRoles(...readers)
  get(@Param("id") id: string) { return this.service.get(id); }

  @Patch(":id")
  @RequireRoles(...managers)
  update(@Param("id") id: string, @Body() body: Partial<RenewalInput>) { return this.service.update(id, body); }

  @Post(":id/contact")
  @RequireRoles(...managers)
  contact(@Param("id") id: string) { return this.service.contact(id); }

  @Post(":id/create-opportunity")
  @RequireRoles(...managers)
  opportunity(@Param("id") id: string) { return this.service.opportunity(id); }

  @Post(":id/renew")
  @RequireRoles(...managers)
  renew(@Param("id") id: string, @Body() body: { nextRenewalDate: string; notes?: string }) { return this.service.renew(id, body); }

  @Post(":id/decline")
  @RequireRoles(...managers)
  decline(@Param("id") id: string, @Body() body: { notes?: string }) { return this.service.decline(id, body); }
}

@Controller("clients/:clientId/renewals")
export class ClientRenewalsController {
  constructor(private readonly service: RenewalsService) {}

  @Get()
  @RequireRoles(...readers)
  list(@Param("clientId") clientId: string, @Query() query: Record<string, string | undefined>) {
    return this.service.list({ ...query, clientId });
  }
}

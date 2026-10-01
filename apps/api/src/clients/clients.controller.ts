import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { CreateClientInput } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import { ClientsService } from "./clients.service.js";

const clientReaders = ["GERENTE_GENERAL", "JEFE_VENTAS", "EJECUTIVA_VENTAS", "COMERCIAL", "JEFE_DESARROLLO", "PROGRAMADOR", "FINANZAS"] as const;
const clientManagers = ["GERENTE_GENERAL", "JEFE_VENTAS", "EJECUTIVA_VENTAS", "COMERCIAL"] as const;

@Controller("clients")
export class ClientsController {
  constructor(private readonly service: ClientsService) {}
  @Get() @RequireRoles(...clientReaders) list(@Query() query: Record<string, string | undefined>) { return this.service.list(query); }
  @Post("audit-export") @RequireRoles(...clientReaders) auditExport(@Body() body:{domain:string}) { return this.service.auditExport(body.domain); }
  @Post() @RequireRoles(...clientManagers) create(@Body() body: CreateClientInput) { return this.service.create(body); }
  @Get(":id") @RequireRoles(...clientReaders) get(@Param("id") id: string) { return this.service.get(id); }
  @Patch(":id") @RequireRoles(...clientManagers) update(@Param("id") id: string, @Body() body: Record<string, unknown>) { return this.service.update(id, body); }
  @Post(":id/archive") @RequireRoles("GERENTE_GENERAL") archive(@Param("id") id: string) { return this.service.archive(id); }
  @Get(":id/summary") @RequireRoles(...clientReaders) summary(@Param("id") id: string) { return this.service.summary(id); }
  @Get(":id/contacts") @RequireRoles(...clientReaders) contacts(@Param("id") id: string) { return this.service.contacts(id); }
  @Post(":id/contacts") @RequireRoles(...clientManagers) addContact(@Param("id") id: string, @Body() body: NonNullable<CreateClientInput["primaryContact"]>) { return this.service.addContact(id, body); }
  @Get(":id/services") @RequireRoles(...clientReaders) services(@Param("id") id: string) { return this.service.services(id); }
  @Post(":id/services") @RequireRoles(...clientManagers) addService(@Param("id") id: string, @Body() body: NonNullable<CreateClientInput["initialServices"]>[number]) { return this.service.addService(id, body); }
  @Get(":id/activity") @RequireRoles(...clientReaders) activity(@Param("id") id: string) { return this.service.activity(id); }
  @Get(":id/projects") @RequireRoles(...clientReaders) projects(@Param("id") id: string) { return this.service.related(id, "projects"); }
  @Get(":id/quotes") @RequireRoles(...clientReaders) quotes(@Param("id") id: string) { return this.service.related(id, "quotes"); }
  @Get(":id/work-orders") @RequireRoles(...clientReaders) workOrders(@Param("id") id: string) { return this.service.related(id, "work-orders"); }
  @Get(":id/documents") @RequireRoles(...clientReaders) documents(@Param("id") id: string) { return this.service.related(id, "documents"); }
  @Get(":id/finance-summary") @RequireRoles("GERENTE_GENERAL", "FINANZAS") finance(@Param("id") id: string) { return this.service.unavailableSummary(id, "Finance"); }
  @Get(":id/support-summary") @RequireRoles(...clientReaders) support(@Param("id") id: string) { return this.service.unavailableSummary(id, "Support"); }
  @Get(":id/monitoring-summary") @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR") monitoring(@Param("id") id: string) { return this.service.unavailableSummary(id, "Monitoring"); }
  @Get(":id/audits") @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "PROGRAMADOR") audits(@Param("id") id: string) { return this.service.related(id, "audits"); }
  @Get(":id/portal") @RequireRoles("GERENTE_GENERAL") portal(@Param("id") id: string) { return this.service.portal(id); }
  @Patch(":id/portal") @RequireRoles("GERENTE_GENERAL") updatePortal(@Param("id") id: string, @Body() body: Parameters<ClientsService["updatePortal"]>[1]) { return this.service.updatePortal(id, body); }
}

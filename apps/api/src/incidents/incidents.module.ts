import { Controller, Get, Headers, Module, Query } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { MonitoringModule } from "../monitoring/monitoring.module.js";
import { rolesWith } from "../monitoring/monitoring.rbac.js";
import { monitoringActor, MonitoringService } from "../monitoring/monitoring.service.js";
// Alias histórico: los incidentes operacionales viven en Monitoreo (/monitoring/incidents).
@Controller("incidents") class IncidentsController { constructor(private readonly monitoring: MonitoringService) {} @Get() @RequireRoles(...rolesWith("incident.view")) index(@Query() q: Record<string, string | undefined>, @Headers() h: Record<string, string | undefined>) { return this.monitoring.listIncidents(monitoringActor(h), q); } }
@Module({ imports: [MonitoringModule], controllers: [IncidentsController] }) export class IncidentsModule {}

import { Body, Controller, Get, Header, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { RequirePermissions, RequireRoles } from "../auth/roles.decorator.js";
import { rolesWith } from "./monitoring.rbac.js";
import { monitoringActor, MonitoringService } from "./monitoring.service.js";

type HeadersMap = Record<string, string | undefined>;
type Q = Record<string, string | undefined>;
type B = Record<string, unknown>;
const a = monitoringActor;

// El RoleGuard global filtra por rol; el servicio vuelve a validar permiso fino y alcance de proyecto (anti-IDOR).
@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Get() @RequireRoles(...rolesWith("monitoring.dashboard.view")) @RequirePermissions("monitoring.dashboard.view") index(@Headers() h: HeadersMap) { return this.service.dashboard(a(h)); }
  @Get("me") @RequireRoles(...rolesWith("monitoring.dashboard.view", "monitoring.summary.view")) me(@Headers() h: HeadersMap) { return this.service.me(a(h)); }
  @Get("dashboard") @RequireRoles(...rolesWith("monitoring.dashboard.view")) @RequirePermissions("monitoring.dashboard.view") dashboard(@Headers() h: HeadersMap) { return this.service.dashboard(a(h)); }

  @Get("monitors") @RequireRoles(...rolesWith("monitor.view")) @RequirePermissions("monitor.view") monitors(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.listMonitors(a(h), q); }
  @Post("monitors") @RequireRoles(...rolesWith("monitor.create")) @RequirePermissions("monitor.create") createMonitor(@Body() b: B, @Headers() h: HeadersMap) { return this.service.createMonitor(a(h), b ?? {}); }
  @Get("monitors/:id") @RequireRoles(...rolesWith("monitor.view")) @RequirePermissions("monitor.view") monitor(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.getMonitor(a(h), id); }
  @Patch("monitors/:id") @RequireRoles(...rolesWith("monitor.edit")) @RequirePermissions("monitor.edit") updateMonitor(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.updateMonitor(a(h), id, b ?? {}); }
  @Post("monitors/:id/enable") @RequireRoles(...rolesWith("monitor.disable")) @RequirePermissions("monitor.disable") enable(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.setEnabled(a(h), id, true); }
  @Post("monitors/:id/disable") @RequireRoles(...rolesWith("monitor.disable")) @RequirePermissions("monitor.disable") disable(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.setEnabled(a(h), id, false); }
  @Post("monitors/:id/check-now") @RequireRoles(...rolesWith("monitor.view")) checkNow(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.checkNow(a(h), id); }
  @Get("monitors/:id/checks") @RequireRoles(...rolesWith("monitor.view")) checks(@Param("id") id: string, @Query() q: Q, @Headers() h: HeadersMap) { return this.service.listChecks(a(h), id, q); }
  @Get("monitors/:id/stats") @RequireRoles(...rolesWith("monitor.view")) stats(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.stats(a(h), id); }

  @Get("endpoints/:id") @RequireRoles(...rolesWith("endpoint.view")) endpoint(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.endpointDetail(a(h), id); }

  @Get("incidents") @RequireRoles(...rolesWith("incident.view")) @RequirePermissions("incident.view") incidents(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.listIncidents(a(h), q); }
  @Get("incidents/:id") @RequireRoles(...rolesWith("incident.view")) incident(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.getIncident(a(h), id); }
  @Post("incidents/:id/acknowledge") @RequireRoles(...rolesWith("incident.acknowledge")) @RequirePermissions("incident.acknowledge") acknowledge(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.acknowledge(a(h), id); }
  @Post("incidents/:id/assign") @RequireRoles(...rolesWith("incident.assign")) @RequirePermissions("incident.assign") assign(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.assign(a(h), id, b ?? {}); }
  @Post("incidents/:id/change-status") @RequireRoles(...rolesWith("incident.manage")) changeStatus(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.changeStatus(a(h), id, b ?? {}); }
  @Post("incidents/:id/resolve") @RequireRoles(...rolesWith("incident.resolve")) @RequirePermissions("incident.resolve") resolve(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.resolve(a(h), id, b ?? {}); }
  @Post("incidents/:id/close") @RequireRoles(...rolesWith("incident.resolve")) close(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.close(a(h), id); }
  @Patch("incidents/:id/postmortem") @RequireRoles(...rolesWith("incident.manage")) postmortem(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.updatePostmortem(a(h), id, b ?? {}); }
  @Post("incidents/:id/comments") @RequireRoles(...rolesWith("incident.acknowledge", "incident.manage")) comment(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.comment(a(h), id, b ?? {}); }
  @Post("incidents/:id/visibility") @RequireRoles(...rolesWith("incident.assign")) visibility(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.setVisibility(a(h), id, b ?? {}); }
  @Post("incidents/:id/create-task") @RequireRoles(...rolesWith("incident.manage")) createTask(@Param("id") id: string, @Body() b: B, @Headers("idempotency-key") key: string | undefined, @Headers() h: HeadersMap) { return this.service.createTask(a(h), id, b ?? {}, key); }
  @Post("incidents/:id/link-bug") @RequireRoles(...rolesWith("incident.manage")) linkBug(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.linkBug(a(h), id, b ?? {}); }

  @Get("maintenance") @RequireRoles(...rolesWith("maintenance.view")) maintenance(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.listMaintenance(a(h), q); }
  @Post("maintenance") @RequireRoles(...rolesWith("maintenance.create")) @RequirePermissions("maintenance.create") createMaintenance(@Body() b: B, @Headers() h: HeadersMap) { return this.service.createMaintenance(a(h), b ?? {}); }
  @Patch("maintenance/:id") @RequireRoles(...rolesWith("maintenance.create", "maintenance.manage")) updateMaintenance(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.updateMaintenance(a(h), id, b ?? {}); }
  @Post("maintenance/:id/cancel") @RequireRoles(...rolesWith("maintenance.create", "maintenance.manage")) cancelMaintenance(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.cancelMaintenance(a(h), id); }

  @Get("status") @RequireRoles(...rolesWith("monitoring.dashboard.view")) status(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.statusBoard(a(h), q); }
  @Get("status/projects/:projectId") @RequireRoles(...rolesWith("monitor.view")) projectStatus(@Param("projectId") id: string, @Headers() h: HeadersMap) { return this.service.projectStatus(a(h), id); }
  @Get("status/clients/:clientId") @RequireRoles(...rolesWith("monitor.view", "monitoring.summary.view")) clientStatus(@Param("clientId") id: string, @Headers() h: HeadersMap) { return this.service.clientStatus(a(h), id); }
  @Get("uptime") @RequireRoles(...rolesWith("monitor.view")) uptime(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.uptime(a(h), q); }
  @Get("performance") @RequireRoles(...rolesWith("monitor.view")) performance(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.performance(a(h), q); }
  @Get("ssl") @RequireRoles(...rolesWith("ssl.view")) ssl(@Headers() h: HeadersMap) { return this.service.ssl(a(h)); }
  @Get("history") @RequireRoles(...rolesWith("monitor.view")) history(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.history(a(h), q); }

  @Get("alert-rules") @RequireRoles(...rolesWith("alert_rule.view")) alertRules(@Headers() h: HeadersMap) { return this.service.listAlertRules(a(h)); }
  @Post("alert-rules") @RequireRoles(...rolesWith("alert_rule.manage")) @RequirePermissions("alert_rule.manage") createAlertRule(@Body() b: B, @Headers() h: HeadersMap) { return this.service.createAlertRule(a(h), b ?? {}); }
  @Patch("alert-rules/:id") @RequireRoles(...rolesWith("alert_rule.manage")) @RequirePermissions("alert_rule.manage") updateAlertRule(@Param("id") id: string, @Body() b: B, @Headers() h: HeadersMap) { return this.service.updateAlertRule(a(h), id, b ?? {}); }
  @Get("alerts") @RequireRoles(...rolesWith("monitoring.dashboard.view")) alerts(@Headers() h: HeadersMap) { return this.service.myAlerts(a(h)); }
  @Post("alerts/:id/read") @RequireRoles(...rolesWith("monitoring.dashboard.view")) readAlert(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.readAlert(a(h), id); }

  @Get("settings") @RequireRoles(...rolesWith("monitor.view")) settings(@Headers() h: HeadersMap) { return this.service.settings(a(h)); }
  @Patch("settings") @RequireRoles(...rolesWith("monitoring.settings.manage")) @RequirePermissions("monitoring.settings.manage") updateSettings(@Body() b: B, @Headers() h: HeadersMap) { return this.service.updateSettings(a(h), b ?? {}); }
  @Get("workers") @RequireRoles(...rolesWith("monitoring.dashboard.view")) workers(@Headers() h: HeadersMap) { return this.service.workers(a(h)); }
  @Get("diagnostics") @RequireRoles(...rolesWith("monitoring.dashboard.view")) diagnostics(@Headers() h: HeadersMap) { return this.service.diagnostics(a(h)); }
  @Get("reports/monthly") @RequireRoles(...rolesWith("monitoring.export")) monthly(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.monthlyReport(a(h), q); }
  @Get("exports/uptime.csv") @RequireRoles(...rolesWith("monitoring.export")) @Header("content-type", "text/csv; charset=utf-8") @Header("content-disposition", "attachment; filename=\"zyteron-uptime.csv\"") exportUptime(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.exportCsv(a(h), "uptime", q); }
  @Get("exports/incidents.csv") @RequireRoles(...rolesWith("monitoring.export")) @Header("content-type", "text/csv; charset=utf-8") @Header("content-disposition", "attachment; filename=\"zyteron-incidentes.csv\"") exportIncidents(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.exportCsv(a(h), "incidents", q); }
  @Get("exports/ssl.csv") @RequireRoles(...rolesWith("monitoring.export")) @Header("content-type", "text/csv; charset=utf-8") @Header("content-disposition", "attachment; filename=\"zyteron-ssl.csv\"") exportSsl(@Query() q: Q, @Headers() h: HeadersMap) { return this.service.exportCsv(a(h), "ssl", q); }
}

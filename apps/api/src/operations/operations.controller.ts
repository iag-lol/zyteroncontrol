import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import type { OperationsProject, OperationsTask, WorkOrder } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import { actorFromHeaders, operationsPage, OperationsService } from "./operations.service.js";

const readRoles = ["GERENTE_GENERAL", "JEFE_DESARROLLO", "TECH_LEAD", "PROGRAMADOR", "QA", "SOPORTE_TECNICO", "DESARROLLO", "OPERACIONES", "JEFE_VENTAS", "EJECUTIVA_VENTAS", "COMERCIAL"] as const;
const deliveryRoles = ["GERENTE_GENERAL", "JEFE_DESARROLLO", "TECH_LEAD", "PROGRAMADOR", "QA", "SOPORTE_TECNICO", "DESARROLLO", "OPERACIONES"] as const;
const managerRoles = ["GERENTE_GENERAL", "JEFE_DESARROLLO", "OPERACIONES"] as const;
type HeadersMap = Record<string, string | undefined>;

@Controller("operations")
export class OperationsController {
  constructor(private readonly service: OperationsService) {}
  @Get("summary") @RequireRoles(...readRoles) summary() { return this.service.summary(); }
  @Get("priorities") @RequireRoles(...readRoles) priorities(@Headers() h: HeadersMap) { return this.service.priorities(actorFromHeaders(h)); }
  @Get("activity") @RequireRoles(...readRoles) activity(@Query("projectId") projectId?: string) { return this.service.activity(projectId); }
  @Get("search") @RequireRoles(...readRoles) search(@Query("q") q: string, @Headers() h: HeadersMap) { return this.service.search(q || "", actorFromHeaders(h)); }
}

@Controller("work-orders")
export class WorkOrdersController {
  constructor(private readonly service: OperationsService) {}
  @Get() @RequireRoles(...readRoles) list(@Query() q: Record<string, string | undefined>, @Headers() h: HeadersMap) { return this.service.listWorkOrders(operationsPage(q), actorFromHeaders(h)); }
  @Post() @RequireRoles("GERENTE_GENERAL", "JEFE_DESARROLLO", "OPERACIONES", "JEFE_VENTAS", "EJECUTIVA_VENTAS", "COMERCIAL") create(@Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createWorkOrder(b, actorFromHeaders(h)); }
  @Get(":id") @RequireRoles(...readRoles) get(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.getWorkOrder(id, actorFromHeaders(h)); }
  @Patch(":id") @RequireRoles(...managerRoles) update(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.updateWorkOrder(id, b, actorFromHeaders(h)); }
  @Post(":id/status") @RequireRoles(...managerRoles) status(@Param("id") id: string, @Body() b: { status: WorkOrder["status"]; reason?: string; override?: boolean }, @Headers() h: HeadersMap) { return this.service.workOrderStatus(id, b.status, b.reason || null, actorFromHeaders(h), Boolean(b.override)); }
  @Post(":id/accept-handoff") @RequireRoles(...managerRoles) accept(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.acceptHandoff(id, actorFromHeaders(h)); }
  @Post(":id/request-information") @RequireRoles(...managerRoles) information(@Param("id") id: string, @Body() b: { reason: string }, @Headers() h: HeadersMap) { return this.service.requestInformation(id, b.reason, actorFromHeaders(h)); }
  @Post(":id/plan") @RequireRoles(...managerRoles) plan(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.planWorkOrder(id, b, actorFromHeaders(h)); }
  @Post(":id/assign") @RequireRoles(...managerRoles) assign(@Param("id") id: string, @Body() b: { userId: string }, @Headers() h: HeadersMap) { return this.service.assignWorkOrder(id, b.userId, actorFromHeaders(h)); }
  @Post(":id/convert-to-project") @RequireRoles(...managerRoles) convert(@Param("id") id: string, @Body() b: unknown, @Headers("idempotency-key") key: string, @Headers() h: HeadersMap) { return this.service.convertWorkOrder(id, b, key, actorFromHeaders(h)); }
}

@Controller("projects")
export class ProjectsController {
  constructor(private readonly service: OperationsService) {}
  @Get() @RequireRoles(...readRoles) list(@Query() q: Record<string, string | undefined>, @Headers() h: HeadersMap) { return this.service.listProjects(operationsPage(q), actorFromHeaders(h)); }
  @Post() @RequireRoles(...managerRoles) create(@Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createProject(b, actorFromHeaders(h)); }
  @Get(":id/summary") @RequireRoles(...readRoles) summary(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.projectSummary(id, actorFromHeaders(h)); }
  @Get(":id/activity") @RequireRoles(...readRoles) activity(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.getProject(id, actorFromHeaders(h)).then(() => this.service.activity(id)); }
  @Get(":id/members") @RequireRoles(...readRoles) members(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.listMembers(id, actorFromHeaders(h)); }
  @Post(":id/members") @RequireRoles(...managerRoles) addMember(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.addMember(id, b, actorFromHeaders(h)); }
  @Patch(":id/members/:memberId") @RequireRoles(...managerRoles) updateMember(@Param("id") id: string, @Param("memberId") memberId: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.updateMember(id, memberId, b, actorFromHeaders(h)); }
  @Delete(":id/members/:memberId") @RequireRoles(...managerRoles) removeMember(@Param("id") id: string, @Param("memberId") memberId: string, @Headers() h: HeadersMap) { return this.service.removeMember(id, memberId, actorFromHeaders(h)); }
  @Get(":id/milestones") @RequireRoles(...readRoles) milestones(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.milestones(id, actorFromHeaders(h)); }
  @Post(":id/milestones") @RequireRoles(...managerRoles) createMilestone(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createMilestone(id, b, actorFromHeaders(h)); }
  @Get(":id/endpoints") @RequireRoles(...deliveryRoles) endpoints(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.endpoints(id, actorFromHeaders(h)); }
  @Post(":id/endpoints") @RequireRoles(...managerRoles) endpoint(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createEndpoint(id, b, actorFromHeaders(h)); }
  @Get(":id/risks") @RequireRoles(...deliveryRoles) risks(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.risks(id, actorFromHeaders(h)); }
  @Post(":id/risks") @RequireRoles(...deliveryRoles) risk(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createRisk(id, b, actorFromHeaders(h)); }
  @Get(":id/change-requests") @RequireRoles(...deliveryRoles) changes(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.changes(id, actorFromHeaders(h)); }
  @Post(":id/change-requests") @RequireRoles(...deliveryRoles) change(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createChange(id, b, actorFromHeaders(h)); }
  @Get(":id") @RequireRoles(...readRoles) get(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.getProject(id, actorFromHeaders(h)); }
  @Patch(":id") @RequireRoles(...managerRoles) update(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.updateProject(id, b, actorFromHeaders(h)); }
  @Post(":id/status") @RequireRoles(...managerRoles) status(@Param("id") id: string, @Body() b: { status: OperationsProject["status"]; reason?: string; override?: boolean }, @Headers() h: HeadersMap) { return this.service.projectStatus(id, b.status, b.reason || null, actorFromHeaders(h), Boolean(b.override)); }
}

@Controller("tasks")
export class TasksController {
  constructor(private readonly service: OperationsService) {}
  @Get() @RequireRoles(...deliveryRoles) list(@Query() q: Record<string, string | undefined>, @Headers() h: HeadersMap) { return this.service.listTasks(operationsPage(q), actorFromHeaders(h)); }
  @Post() @RequireRoles(...deliveryRoles) create(@Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createTask(b, actorFromHeaders(h)); }
  @Get(":id") @RequireRoles(...deliveryRoles) get(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.getTask(id, actorFromHeaders(h)); }
  @Patch(":id") @RequireRoles(...deliveryRoles) update(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.updateTask(id, b, actorFromHeaders(h)); }
  @Post(":id/status") @RequireRoles(...deliveryRoles) status(@Param("id") id: string, @Body() b: { status: OperationsTask["status"]; reason?: string; type?: string }, @Headers() h: HeadersMap) { return this.service.taskStatus(id, b.status, b.reason || null, b.type || null, actorFromHeaders(h)); }
  @Post(":id/dependencies") @RequireRoles(...deliveryRoles) dependency(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.dependency(id, b, actorFromHeaders(h)); }
}

@Controller("milestones")
export class MilestonesController {
  constructor(private readonly service: OperationsService) {}
  @Get() @RequireRoles(...deliveryRoles) list(@Query("projectId") projectId: string | undefined, @Headers() h: HeadersMap) { return this.service.milestones(projectId, actorFromHeaders(h)); }
  @Patch(":id") @RequireRoles(...managerRoles) update(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.updateMilestone(id, b, actorFromHeaders(h)); }
  @Post(":id/complete") @RequireRoles(...deliveryRoles) complete(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.completeMilestone(id, actorFromHeaders(h)); }
}

@Controller("worklogs")
export class WorklogsController {
  constructor(private readonly service: OperationsService) {}
  @Get() @RequireRoles(...deliveryRoles) list(@Query() q: Record<string, string | undefined>, @Headers() h: HeadersMap) { return this.service.listWorklogs(operationsPage(q), actorFromHeaders(h)); }
  @Post() @RequireRoles(...deliveryRoles) create(@Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createWorklog(b, actorFromHeaders(h)); }
  @Patch(":id") @RequireRoles(...deliveryRoles) update(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.updateWorklog(id, b, actorFromHeaders(h)); }
  @Delete(":id") @RequireRoles(...managerRoles) remove(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.deleteWorklog(id, actorFromHeaders(h)); }
}

@Controller("deliverables")
export class DeliverablesController {
  constructor(private readonly service: OperationsService) {}
  @Get() @RequireRoles(...deliveryRoles) list(@Query() q: Record<string, string | undefined>, @Headers() h: HeadersMap) { return this.service.listDeliverables(operationsPage(q), actorFromHeaders(h)); }
  @Post() @RequireRoles(...deliveryRoles) create(@Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createDeliverable(b, actorFromHeaders(h)); }
  @Post(":id/submit") @RequireRoles(...deliveryRoles) submit(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.deliverableAction(id, "submit", b, actorFromHeaders(h)); }
  @Post(":id/approve") @RequireRoles(...managerRoles) approve(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.deliverableAction(id, "approve", b, actorFromHeaders(h)); }
  @Post(":id/request-changes") @RequireRoles(...managerRoles) changes(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.deliverableAction(id, "changes", b, actorFromHeaders(h)); }
}

@Controller("deployments")
export class DeploymentsController {
  constructor(private readonly service: OperationsService) {}
  @Get() @RequireRoles(...deliveryRoles) list(@Query() q: Record<string, string | undefined>, @Headers() h: HeadersMap) { return this.service.listDeployments(operationsPage(q), actorFromHeaders(h)); }
  @Post() @RequireRoles(...deliveryRoles) create(@Body() b: unknown, @Headers() h: HeadersMap) { return this.service.createDeployment(b, actorFromHeaders(h)); }
  @Get(":id") @RequireRoles(...deliveryRoles) get(@Param("id") id: string, @Headers() h: HeadersMap) { return this.service.getDeployment(id, actorFromHeaders(h)); }
  @Patch(":id") @RequireRoles(...deliveryRoles) update(@Param("id") id: string, @Body() b: unknown, @Headers() h: HeadersMap) { return this.service.updateDeployment(id, b, actorFromHeaders(h)); }
}

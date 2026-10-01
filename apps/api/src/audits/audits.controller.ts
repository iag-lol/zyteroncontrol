import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { actorFromHeaders } from "../operations/operations.service.js";
import { AuditCatalogService, AuditEvidenceService, AuditExecutionService, AuditFindingService, AuditPlanService, AuditReadService, AuditReportService, auditPage } from "./audits.service.js";
import { AuditsRepository } from "./audits.repository.js";

type HeaderMap=Record<string,string|undefined>;
const readRoles=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","QA","PROGRAMADOR","DESARROLLO","OPERACIONES","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"] as const;
const executeRoles=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","QA"] as const;
const managerRoles=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD"] as const;

@Controller("audits")
export class AuditsController {
  constructor(private readonly read:AuditReadService,private readonly execution:AuditExecutionService,private readonly plans:AuditPlanService,private readonly findings:AuditFindingService,private readonly evidenceService:AuditEvidenceService,private readonly reports:AuditReportService,private readonly repository:AuditsRepository){}
  @Get("summary") @RequireRoles(...readRoles) summary(){return this.read.summary();}
  @Get("attention") @RequireRoles(...readRoles) attention(){return this.read.attention();}
  @Get("workspace") @RequireRoles(...readRoles) workspace(){return this.read.workspace();}
  @Get("activity") @RequireRoles(...readRoles) activity(){return this.read.activity();}
  @Get("search") @RequireRoles(...readRoles) search(@Query("q") q:string){return this.read.search(q||"");}
  @Get("plans") @RequireRoles(...readRoles) listPlans(@Query() q:Record<string,string|undefined>){return this.plans.list(auditPage(q));}
  @Post("plans") @RequireRoles(...managerRoles) createPlan(@Body() b:unknown,@Headers() h:HeaderMap){return this.plans.create(b,actorFromHeaders(h));}
  @Get("plans/:id") @RequireRoles(...readRoles) plan(@Param("id") id:string){return this.plans.get(id);}
  @Patch("plans/:id") @RequireRoles(...managerRoles) updatePlan(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.plans.update(id,b,actorFromHeaders(h));}
  @Post("plans/:id/enable") @RequireRoles(...managerRoles) enable(@Param("id") id:string,@Headers() h:HeaderMap){return this.plans.toggle(id,true,actorFromHeaders(h));}
  @Post("plans/:id/disable") @RequireRoles(...managerRoles) disable(@Param("id") id:string,@Headers() h:HeaderMap){return this.plans.toggle(id,false,actorFromHeaders(h));}
  @Post("plans/:id/run-now") @RequireRoles(...managerRoles) runNow(@Param("id") id:string,@Headers("idempotency-key") key:string|undefined,@Headers() h:HeaderMap){return this.plans.runNow(id,actorFromHeaders(h),key);}
  @Post("scheduler/run-due") @RequireRoles("GERENTE_GENERAL") runDue(@Headers() h:HeaderMap){return this.plans.runDue(actorFromHeaders(h));}
  @Get() @RequireRoles(...readRoles) list(@Query() q:Record<string,string|undefined>){return this.execution.list(auditPage(q));}
  @Post() @RequireRoles(...managerRoles) async create(@Body() b:any,@Headers() h:HeaderMap){const actor=actorFromHeaders(h);const plan=await this.plans.create({...b,frequency:"ONE_TIME",startDate:b.startDate||new Date().toISOString().slice(0,10)},actor);return this.plans.runNow(plan.id,actor,h["idempotency-key"]);}
  @Get(":id/checks") @RequireRoles(...readRoles) checks(@Param("id") id:string){return this.execution.checks(id);}
  @Patch(":id/checks/:checkId") @RequireRoles(...executeRoles) check(@Param("id") id:string,@Param("checkId") checkId:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.execution.updateCheck(id,checkId,b,actorFromHeaders(h));}
  @Post(":id/checks/:checkId/automate") @RequireRoles(...executeRoles) automate(@Param("id") id:string,@Param("checkId") checkId:string,@Body() b:{endpointId:string},@Headers() h:HeaderMap){return this.execution.automate(id,checkId,b.endpointId,actorFromHeaders(h));}
  @Post(":id/checks/:checkId/evidence") @RequireRoles(...executeRoles) evidenceCheck(@Param("id") id:string,@Param("checkId") checkId:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.evidenceService.add(id,checkId,b,actorFromHeaders(h));}
  @Post(":id/evidence") @RequireRoles(...executeRoles) evidence(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.evidenceService.add(id,null,b,actorFromHeaders(h));}
  @Post(":id/checks/:checkId/create-finding") @RequireRoles(...executeRoles) async checkFinding(@Param("id") id:string,@Param("checkId") checkId:string,@Body() b:any,@Headers() h:HeaderMap){const result=await this.repository.get<any>("audit_check_results",checkId);const definition=result?await this.repository.get<any>("audit_template_checks",result.checkId):null;return this.findings.create({auditId:id,checkResultId:checkId,category:result?.sectionCode||"AUDIT",title:b.title||definition?.title||"Hallazgo de auditoría",description:b.description||result?.notes||definition?.description||"El check no cumplió el criterio definido.",severity:b.severity||result?.severityOnFailure||"MEDIUM",...b},actorFromHeaders(h));}
  @Post(":id/report/generate") @RequireRoles(...executeRoles) generate(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.reports.generate(id,b,actorFromHeaders(h));}
  @Get(":id/report") @RequireRoles(...readRoles) report(@Param("id") id:string){return this.reports.reports(id);}
  @Post(":id/report/approve") @RequireRoles(...managerRoles) approve(@Param("id") id:string,@Headers() h:HeaderMap){return this.reports.approve(id,actorFromHeaders(h));}
  @Post(":id/report/publish") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") publish(@Param("id") id:string,@Headers() h:HeaderMap){return this.reports.publish(id,actorFromHeaders(h));}
  @Get(":id") @RequireRoles(...readRoles) get(@Param("id") id:string){return this.execution.detail(id);}
  @Patch(":id") @RequireRoles(...managerRoles) update(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.execution.update(id,b,actorFromHeaders(h));}
  @Post(":id/start") @RequireRoles(...executeRoles) start(@Param("id") id:string,@Headers() h:HeaderMap){return this.execution.start(id,actorFromHeaders(h));}
  @Post(":id/submit-review") @RequireRoles(...executeRoles) submit(@Param("id") id:string,@Headers() h:HeaderMap){return this.execution.submitReview(id,actorFromHeaders(h));}
  @Post(":id/complete") @RequireRoles(...managerRoles) complete(@Param("id") id:string,@Headers() h:HeaderMap){return this.execution.complete(id,actorFromHeaders(h));}
}

@Controller("findings")
export class FindingsController {
  constructor(private readonly findings:AuditFindingService){}
  @Get() @RequireRoles(...readRoles) list(@Query() q:Record<string,string|undefined>){return this.findings.list(auditPage(q));}
  @Post() @RequireRoles(...executeRoles) create(@Body() b:unknown,@Headers() h:HeaderMap){return this.findings.create(b,actorFromHeaders(h));}
  @Get(":id/retests") @RequireRoles(...readRoles) retests(@Param("id") id:string){return this.findings.retests(id);}
  @Post(":id/retests") @RequireRoles(...executeRoles) retest(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.findings.retest(id,b,actorFromHeaders(h));}
  @Get(":id") @RequireRoles(...readRoles) get(@Param("id") id:string){return this.findings.get(id);}
  @Patch(":id") @RequireRoles(...executeRoles) update(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.findings.update(id,b,actorFromHeaders(h));}
  @Post(":id/assign") @RequireRoles(...managerRoles) assign(@Param("id") id:string,@Body() b:{userId:string},@Headers() h:HeaderMap){return this.findings.assign(id,b.userId,actorFromHeaders(h));}
  @Post(":id/remediation") @RequireRoles(...executeRoles) remediation(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.findings.remediation(id,b,actorFromHeaders(h));}
  @Post(":id/create-task") @RequireRoles(...executeRoles) task(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.findings.createTask(id,b,actorFromHeaders(h));}
  @Post(":id/create-bug") @RequireRoles(...executeRoles) bug(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.findings.createBug(id,b,actorFromHeaders(h));}
  @Post(":id/ready-for-retest") @RequireRoles(...executeRoles) ready(@Param("id") id:string,@Headers() h:HeaderMap){return this.findings.ready(id,actorFromHeaders(h));}
  @Post(":id/accept-risk") @RequireRoles(...managerRoles) risk(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.findings.acceptRisk(id,b,actorFromHeaders(h));}
  @Post(":id/close") @RequireRoles(...managerRoles) close(@Param("id") id:string,@Headers() h:HeaderMap){return this.findings.close(id,actorFromHeaders(h));}
}

@Controller("audit-templates")
export class AuditTemplatesController {
  constructor(private readonly catalog:AuditCatalogService){}
  @Get() @RequireRoles(...readRoles) list(){return this.catalog.templates();}
  @Post() @RequireRoles(...managerRoles) create(@Body() b:unknown,@Headers() h:HeaderMap){return this.catalog.create(b,actorFromHeaders(h));}
  @Get(":id") @RequireRoles(...readRoles) get(@Param("id") id:string){return this.catalog.template(id);}
  @Post(":id/version") @RequireRoles(...managerRoles) version(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.catalog.version(id,b,actorFromHeaders(h));}
}

@Controller("audit-template-versions")
export class AuditTemplateVersionsController { constructor(private readonly catalog:AuditCatalogService){} @Patch(":id") @RequireRoles(...managerRoles) update(@Param("id") id:string,@Body() b:unknown){return this.catalog.updateVersion(id,b);} }
@Controller("audit-evidence")
export class AuditEvidenceController { constructor(private readonly evidence:AuditEvidenceService){} @Get() @RequireRoles(...readRoles) list(){return this.evidence.list();} }
@Controller("audit-reports")
export class AuditReportsController { constructor(private readonly reports:AuditReportService){} @Get() @RequireRoles(...readRoles) list(){return this.reports.list();} }

@Controller("projects")
export class ProjectAuditsController { constructor(private readonly read:AuditReadService){} @Get(":id/audits") @RequireRoles(...readRoles) snapshot(@Param("id") id:string){return this.read.related({projectId:id});} }

import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import type { BugStatus, QaRunStatus } from "@zyteron/contracts";
import { Public, RequireRoles } from "../auth/roles.decorator.js";
import { actorFromHeaders, OperationsService } from "../operations/operations.service.js";
import { DevelopmentManagementService, DevelopmentReadService, IntegrationService, QualityService, ReleaseService } from "./development.service.js";
import { DevelopmentRepository } from "./development.repository.js";
import { GitHubSourceControlProvider } from "./development.providers.js";

type HeaderMap=Record<string,string|undefined>;
const readRoles=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","PROGRAMADOR","QA","SOPORTE_TECNICO","DESARROLLO"] as const;
const leadRoles=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD"] as const;
const qaRoles=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","QA"] as const;

@Controller("development")
export class DevelopmentController {
  constructor(private readonly read:DevelopmentReadService,private readonly management:DevelopmentManagementService,private readonly quality:QualityService,private readonly releases:ReleaseService,private readonly integrations:IntegrationService){}
  @Get("summary") @RequireRoles(...readRoles) summary(@Headers() h:HeaderMap){return this.read.summary(actorFromHeaders(h));}
  @Get("attention") @RequireRoles(...readRoles) attention(@Headers() h:HeaderMap){return this.read.attention(actorFromHeaders(h));}
  @Get("assignments") @RequireRoles(...leadRoles) assignments(@Headers() h:HeaderMap){return this.read.assignments(actorFromHeaders(h));}
  @Get("team") @RequireRoles(...readRoles) team(@Headers() h:HeaderMap){return this.read.team(actorFromHeaders(h));}
  @Get("workload") @RequireRoles(...readRoles) workload(@Headers() h:HeaderMap){return this.read.team(actorFromHeaders(h));}
  @Get("my-projects") @RequireRoles(...readRoles) mine(@Headers() h:HeaderMap){return this.read.myProjects(actorFromHeaders(h));}
  @Get("repositories") @RequireRoles(...readRoles) repositories(@Headers() h:HeaderMap){return this.read.repositories(actorFromHeaders(h));}
  @Get("pull-requests") @RequireRoles(...readRoles) pullRequests(@Headers() h:HeaderMap){return this.read.pullRequests(actorFromHeaders(h));}
  @Get("environments") @RequireRoles(...readRoles) environments(@Headers() h:HeaderMap){return this.read.environments(actorFromHeaders(h));}
  @Get("technologies") @RequireRoles(...readRoles) technologies(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.read.technologies(actorFromHeaders(h),projectId);}
  @Get("skills") @RequireRoles(...readRoles) skills(){return this.read.skills();}
  @Post("skills") @RequireRoles(...readRoles) skill(@Body() b:unknown,@Headers() h:HeaderMap){return this.management.addSkill(b,actorFromHeaders(h));}
  @Get("qa") @RequireRoles(...readRoles) qa(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.quality.qaRuns(actorFromHeaders(h),projectId);}
  @Get("bugs") @RequireRoles(...readRoles) bugs(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.quality.bugs(actorFromHeaders(h),projectId);}
  @Get("releases") @RequireRoles(...readRoles) releasesList(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.releases.releases(actorFromHeaders(h),projectId);}
  @Get("technical-debt") @RequireRoles(...readRoles) debt(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.releases.debt(actorFromHeaders(h),projectId);}
  @Get("activity") @RequireRoles(...readRoles) activity(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.read.activity(actorFromHeaders(h),projectId);}
}

@Controller("projects")
export class ProjectDevelopmentController {
  constructor(private readonly read:DevelopmentReadService,private readonly management:DevelopmentManagementService){}
  @Get(":id/development") @RequireRoles(...readRoles) snapshot(@Param("id") id:string,@Headers() h:HeaderMap){return this.read.snapshot(id,actorFromHeaders(h));}
  @Post(":id/development/assign") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") assign(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.management.assign(id,b,actorFromHeaders(h));}
  @Post(":id/repositories") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") repository(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.management.connectRepository(id,b,actorFromHeaders(h));}
  @Post(":id/environments") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") environment(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.management.createEnvironment(id,b,actorFromHeaders(h));}
  @Post(":id/technologies") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") technology(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.management.addTechnology(id,b,actorFromHeaders(h));}
}

@Controller("repositories")
export class RepositoriesController {
  constructor(private readonly repository:DevelopmentRepository,private readonly management:DevelopmentManagementService,private readonly github:GitHubSourceControlProvider,private readonly operations:OperationsService){}
  @Get(":id") @RequireRoles(...readRoles) async get(@Param("id") id:string,@Headers() h:HeaderMap){const repo=await this.repository.get<any>("project_repositories",id);if(repo)await this.operations.getProject(repo.projectId,actorFromHeaders(h));return repo;}
  @Delete(":id") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") remove(@Param("id") id:string,@Headers() h:HeaderMap){return this.management.disconnectRepository(id,actorFromHeaders(h));}
  @Get(":id/branches") @RequireRoles(...readRoles) async branches(@Param("id") id:string,@Headers() h:HeaderMap){const repo=await this.repository.get<any>("project_repositories",id);if(repo)await this.operations.getProject(repo.projectId,actorFromHeaders(h));return repo&&this.github.configured()?this.github.listBranches(repo.repositoryUrl):[];}
  @Get(":id/commits") @RequireRoles(...readRoles) async commits(@Param("id") id:string,@Headers() h:HeaderMap){const repo=await this.repository.get<any>("project_repositories",id);if(repo)await this.operations.getProject(repo.projectId,actorFromHeaders(h));return repo&&this.github.configured()?this.github.listCommits(repo.repositoryUrl):[];}
  @Get(":id/pull-requests") @RequireRoles(...readRoles) async pullRequests(@Param("id") id:string,@Headers() h:HeaderMap){const repo=await this.repository.get<any>("project_repositories",id);if(repo)await this.operations.getProject(repo.projectId,actorFromHeaders(h));return this.repository.list("pull_requests",{repositoryId:id});}
}

@Controller("qa")
export class QaController {
  constructor(private readonly quality:QualityService){}
  @Get("runs") @RequireRoles(...readRoles) runs(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.quality.qaRuns(actorFromHeaders(h),projectId);}
  @Post("runs") @RequireRoles(...qaRoles) create(@Body() b:unknown,@Headers() h:HeaderMap){return this.quality.createQa(b,actorFromHeaders(h));}
  @Get("runs/:id") @RequireRoles(...readRoles) get(@Param("id") id:string,@Headers() h:HeaderMap){return this.quality.qa(id,actorFromHeaders(h));}
  @Post("runs/:id/start") @RequireRoles(...qaRoles) start(@Param("id") id:string,@Headers() h:HeaderMap){return this.quality.startQa(id,actorFromHeaders(h));}
  @Post("runs/:id/results") @RequireRoles(...qaRoles) result(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.quality.addResult(id,b,actorFromHeaders(h));}
  @Post("runs/:id/complete") @RequireRoles(...qaRoles) complete(@Param("id") id:string,@Body() b:{status?:QaRunStatus},@Headers() h:HeaderMap){return this.quality.completeQa(id,b,actorFromHeaders(h));}
  @Get("test-cases") @RequireRoles(...readRoles) cases(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.quality.testCases(actorFromHeaders(h),projectId);}
  @Post("test-cases") @RequireRoles(...qaRoles) createCase(@Body() b:unknown,@Headers() h:HeaderMap){return this.quality.createTestCase(b,actorFromHeaders(h));}
}

@Controller("bugs")
export class BugsController {
  constructor(private readonly quality:QualityService){}
  @Get() @RequireRoles(...readRoles) list(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.quality.bugs(actorFromHeaders(h),projectId);}
  @Post() @RequireRoles(...readRoles) create(@Body() b:unknown,@Headers() h:HeaderMap){return this.quality.createBug(b,actorFromHeaders(h));}
  @Get(":id") @RequireRoles(...readRoles) get(@Param("id") id:string,@Headers() h:HeaderMap){return this.quality.bug(id,actorFromHeaders(h));}
  @Patch(":id") @RequireRoles(...readRoles) update(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.quality.changeBug(id,b,actorFromHeaders(h));}
  @Post(":id/assign") @RequireRoles(...leadRoles) assign(@Param("id") id:string,@Body() b:{assignedTo:string},@Headers() h:HeaderMap){return this.quality.changeBug(id,{assignedTo:b.assignedTo,status:"ASSIGNED"},actorFromHeaders(h));}
  @Post(":id/change-status") @RequireRoles(...readRoles) status(@Param("id") id:string,@Body() b:{status:BugStatus;reason?:string},@Headers() h:HeaderMap){return this.quality.changeBug(id,b,actorFromHeaders(h));}
  @Post(":id/reopen") @RequireRoles(...qaRoles) reopen(@Param("id") id:string,@Body() b:{reason?:string},@Headers() h:HeaderMap){return this.quality.changeBug(id,{...b,status:"REOPENED"},actorFromHeaders(h));}
  @Post(":id/resolve") @RequireRoles(...readRoles) resolve(@Param("id") id:string,@Body() b:{reason?:string},@Headers() h:HeaderMap){return this.quality.changeBug(id,{...b,status:"RESOLVED"},actorFromHeaders(h));}
}

@Controller("releases")
export class ReleasesController {
  constructor(private readonly releases:ReleaseService){}
  @Get() @RequireRoles(...readRoles) list(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.releases.releases(actorFromHeaders(h),projectId);}
  @Post() @RequireRoles(...leadRoles) create(@Body() b:unknown,@Headers() h:HeaderMap){return this.releases.createRelease(b,actorFromHeaders(h));}
  @Get(":id") @RequireRoles(...readRoles) get(@Param("id") id:string,@Headers() h:HeaderMap){return this.releases.release(id,actorFromHeaders(h));}
  @Patch(":id") @RequireRoles(...leadRoles) update(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.releases.updateRelease(id,b,actorFromHeaders(h));}
  @Post(":id/approve") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") approve(@Param("id") id:string,@Headers() h:HeaderMap){return this.releases.approve(id,actorFromHeaders(h));}
  @Post(":id/deploy") @RequireRoles(...leadRoles) deploy(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.releases.deploy(id,b,actorFromHeaders(h));}
  @Post(":id/rollback") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") rollback(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.releases.rollback(id,b,actorFromHeaders(h));}
}

@Controller("environments")
export class EnvironmentsController {
  constructor(private readonly management:DevelopmentManagementService){}
  @Patch(":id") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") update(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.management.updateEnvironment(id,b,actorFromHeaders(h));}
}

@Controller("technical-debt")
export class TechnicalDebtController {
  constructor(private readonly releases:ReleaseService){}
  @Get() @RequireRoles(...readRoles) list(@Headers() h:HeaderMap,@Query("projectId") projectId?:string){return this.releases.debt(actorFromHeaders(h),projectId);}
  @Post() @RequireRoles(...leadRoles) create(@Body() b:unknown,@Headers() h:HeaderMap){return this.releases.createDebt(b,actorFromHeaders(h));}
  @Patch(":id") @RequireRoles(...leadRoles) update(@Param("id") id:string,@Body() b:unknown,@Headers() h:HeaderMap){return this.releases.updateDebt(id,b,actorFromHeaders(h));}
}

@Controller("development/integrations")
export class IntegrationsController {
  constructor(private readonly repository:DevelopmentRepository,private readonly integrations:IntegrationService){}
  @Get() @RequireRoles(...readRoles) list(){return this.integrations.health();}
  @Post("github/connect") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") github(){return{connected:false,message:"Configure GitHub App en el backend antes de conectar repositorios."};}
  @Post("render/connect") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") render(){return{connected:false,message:"Configure RENDER_API_KEY en el backend antes de conectar Render."};}
  @Delete(":id") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") remove(@Param("id") id:string){return this.repository.remove("integration_connections",id).then(()=>({deleted:true}));}
  @Get(":id/health") @RequireRoles(...readRoles) health(@Param("id") id:string){return this.repository.get("integration_connections",id);}
}

@Controller("webhooks")
export class DevelopmentWebhooksController {
  constructor(private readonly github:GitHubSourceControlProvider,private readonly integrations:IntegrationService){}
  @Public() @Post("github") githubWebhook(@Req() request:{rawBody?:Buffer},@Body() body:Record<string,unknown>,@Headers("x-hub-signature-256") signature:string|undefined,@Headers("x-github-event") event:string|undefined,@Headers("x-github-delivery") delivery:string|undefined){const payload=request.rawBody??Buffer.from(JSON.stringify(body));if(!this.github.verifyWebhook(payload,signature))throw new UnauthorizedException("Firma GitHub inválida.");return this.integrations.recordExternalEvent("GITHUB",event||"unknown",delivery||"unknown",null);}
}

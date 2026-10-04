import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import type { SupportTicketStatus } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import type { SupportInboundMessage } from "./support.providers.js";
import { SupportRepository } from "./support.repository.js";
import { SupportAttachmentService, SupportCatalogService, SupportChannelService, SupportKnowledgeService, SupportReadService, SupportSlaService, SupportTicketService, supportPage,type SupportActor } from "./support.service.js";

type HeaderMap=Record<string,string|string[]|undefined>;
const header=(h:HeaderMap,key:string)=>{const value=h[key];return Array.isArray(value)?value[0]:value;};
const actor=(h:HeaderMap):SupportActor=>({userId:header(h,"x-zyteron-user-id")??null,role:header(h,"x-zyteron-role")??"",clientId:header(h,"x-zyteron-client-id")??null,contactId:header(h,"x-zyteron-contact-id")??null});
const readers=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","QA","SOPORTE_TECNICO","OPERACIONES","PROGRAMADOR","DESARROLLO","FINANZAS","RRHH","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"] as const;
const agents=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","QA","SOPORTE_TECNICO","OPERACIONES"] as const;
const managers=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","SOPORTE_TECNICO"] as const;

@Controller("support")
export class SupportController{
  constructor(private readonly read:SupportReadService,private readonly tickets:SupportTicketService,private readonly catalog:SupportCatalogService,private readonly slaService:SupportSlaService){}
  @Get("summary") @RequireRoles(...readers) summary(){return this.read.summary();}
  @Get("attention") @RequireRoles(...readers) attention(){return this.read.attention();}
  @Get("workspace") @RequireRoles(...readers) workspace(){return this.read.workspace();}
  @Get("search") @RequireRoles(...readers) search(@Query("q") q=""){return this.read.search(q);}
  @Get("tickets") @RequireRoles(...readers) list(@Query() q:Record<string,string|undefined>){return this.tickets.list(supportPage(q));}
  @Post("tickets") @RequireRoles(...readers) create(@Body() b:any,@Headers() h:HeaderMap){return this.tickets.create(b,actor(h));}
  @Get("tickets/:id") @RequireRoles(...readers) detail(@Param("id") id:string,@Headers() h:HeaderMap){return this.tickets.detail(id,actor(h));}
  @Patch("tickets/:id") @RequireRoles(...agents) update(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.update(id,b,actor(h));}
  @Post("tickets/:id/assign") @RequireRoles(...agents) assign(@Param("id") id:string,@Body("userId") userId:string,@Headers() h:HeaderMap){return this.tickets.assign(id,userId,actor(h));}
  @Post("tickets/:id/change-priority") @RequireRoles(...agents) priority(@Param("id") id:string,@Body("priority") priority:string,@Headers() h:HeaderMap){return this.tickets.priority(id,priority,actor(h));}
  @Post("tickets/:id/change-status") @RequireRoles(...agents) status(@Param("id") id:string,@Body() b:{status:SupportTicketStatus;reason?:string},@Headers() h:HeaderMap){return this.tickets.transition(id,b.status,b.reason??null,actor(h));}
  @Post("tickets/:id/reply") @RequireRoles(...agents) reply(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.message(id,b,actor(h),"PUBLIC_REPLY");}
  @Post("tickets/:id/internal-note") @RequireRoles(...agents) note(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.message(id,b,actor(h),"INTERNAL_NOTE");}
  @Post("tickets/:id/resolve") @RequireRoles(...agents) resolve(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.resolve(id,b,actor(h));}
  @Post("tickets/:id/close") @RequireRoles(...agents) close(@Param("id") id:string,@Headers() h:HeaderMap){return this.tickets.close(id,actor(h));}
  @Post("tickets/:id/reopen") @RequireRoles(...readers) reopen(@Param("id") id:string,@Body("reason") reason:string,@Headers() h:HeaderMap){return this.tickets.reopen(id,reason,actor(h));}
  @Post("tickets/:id/merge") @RequireRoles(...managers) merge(@Param("id") id:string,@Body("mergedTicketId") mergedId:string,@Headers() h:HeaderMap){return this.tickets.merge(id,mergedId,actor(h));}
  @Post("tickets/:id/split") @RequireRoles(...agents) split(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.split(id,b,actor(h));}
  @Post("tickets/:id/create-task") @RequireRoles(...agents) task(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.createTask(id,b,actor(h));}
  @Post("tickets/:id/create-bug") @RequireRoles(...agents) bug(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.createBug(id,b,actor(h));}
  @Post("tickets/:id/link-incident") @RequireRoles(...agents) incident(@Param("id") id:string,@Body("incidentId") relatedId:string,@Headers() h:HeaderMap){return this.tickets.relation(id,"INCIDENT",relatedId,{},actor(h));}
  @Post("tickets/:id/create-change-request") @RequireRoles(...agents) change(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.tickets.createChange(id,b,actor(h));}
  @Post("tickets/:id/link-finance-record") @RequireRoles("GERENTE_GENERAL","FINANZAS","SOPORTE_TECNICO") finance(@Param("id") id:string,@Body() b:{recordId:string;recordType:string},@Headers() h:HeaderMap){return this.tickets.relation(id,"FINANCE",b.recordId,{recordType:b.recordType},actor(h));}
  @Get("tickets/:id/sla") @RequireRoles(...readers) async sla(@Param("id") id:string,@Headers() h:HeaderMap){return(await this.tickets.detail(id,actor(h))).sla;}
  @Post("tickets/:id/copilot") @RequireRoles(...agents) copilot(@Param("id") id:string,@Headers() h:HeaderMap){return this.tickets.copilotDraft(id,actor(h));}
  @Post("tickets/:id/csat") @RequireRoles(...readers) csat(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.read.submitCsat(id,b,actor(h));}
  @Get("queues") @RequireRoles(...readers) queues(){return this.catalog.queues();}
  @Post("queues") @RequireRoles(...managers) createQueue(@Body() b:any){return this.catalog.createQueue(b);}
  @Patch("queues/:id") @RequireRoles(...managers) updateQueue(@Param("id") id:string,@Body() b:any){return this.catalog.updateQueue(id,b);}
  @Get("queues/:id/tickets") @RequireRoles(...readers) queueTickets(@Param("id") id:string,@Query() q:Record<string,string|undefined>){return this.tickets.list({...supportPage(q),queueId:id});}
  @Get("sla/policies") @RequireRoles(...readers) policies(){return this.catalog.policies();}
  @Post("sla/policies") @RequireRoles(...managers) createPolicy(@Body() b:any){return this.catalog.createPolicy(b);}
  @Patch("sla/policies/:id") @RequireRoles(...managers) updatePolicy(@Param("id") id:string,@Body() b:any){return this.catalog.updatePolicy(id,b);}
  @Post("sla/evaluate") @RequireRoles(...managers) evaluateSla(){return this.slaService.evaluate();}
  @Get("categories") @RequireRoles(...readers) categories(){return this.catalog.categories();}
  @Get("macros") @RequireRoles(...readers) macros(){return this.catalog.macros();}
  @Post("macros") @RequireRoles(...managers) createMacro(@Body() b:any){return this.catalog.createMacro(b);}
}

@Controller("support")
export class SupportKnowledgeController{
  constructor(private readonly knowledge:SupportKnowledgeService,private readonly attachments:SupportAttachmentService,private readonly channels:SupportChannelService){}
  @Get("knowledge") @RequireRoles(...readers) list(){return this.knowledge.list();}
  @Post("knowledge") @RequireRoles(...managers) create(@Body() b:any,@Headers() h:HeaderMap){return this.knowledge.create(b,actor(h));}
  @Get("knowledge/:id") @RequireRoles(...readers) get(@Param("id") id:string){return this.knowledge.get(id);}
  @Patch("knowledge/:id") @RequireRoles(...managers) version(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.knowledge.version(id,b,actor(h));}
  @Post("knowledge/:id/publish") @RequireRoles(...managers) publish(@Param("id") id:string,@Headers() h:HeaderMap){return this.knowledge.publish(id,actor(h));}
  @Post("tickets/:id/attachments") @RequireRoles(...readers) attachment(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.attachments.add(id,b,actor(h));}
  @Get("tickets/:id/attachments/:attachmentId/url") @RequireRoles(...readers) signed(@Param("id") id:string,@Param("attachmentId") attachmentId:string,@Headers() h:HeaderMap){return this.attachments.signed(id,attachmentId,actor(h));}
  @Post("channels/email/inbound") @RequireRoles("GERENTE_GENERAL","SOPORTE_TECNICO") inbound(@Body() b:SupportInboundMessage,@Headers() h:HeaderMap){return this.channels.inbound(b,actor(h));}
}

@Controller("client/support")
export class ClientSupportController{
  constructor(private readonly tickets:SupportTicketService,private readonly read:SupportReadService,private readonly attachments:SupportAttachmentService,private readonly repository:SupportRepository){}
  private async portal(h:HeaderMap){const value=actor(h);if(!value.clientId&&value.userId){const identity=await this.repository.portalIdentity(value.userId);if(identity){value.clientId=identity.clientId;value.contactId=identity.contactId;}}if(!value.clientId)throw new ForbiddenException("Identidad de Portal Cliente no vinculada.");return value;}
  @Get("tickets") @RequireRoles("PORTAL_CLIENT") async list(@Query() q:Record<string,string|undefined>,@Headers() h:HeaderMap){const a=await this.portal(h);return this.tickets.list({...supportPage(q),clientId:a.clientId!,clientVisibility:"CLIENT_VISIBLE"});}
  @Post("tickets") @RequireRoles("PORTAL_CLIENT") async create(@Body() b:any,@Headers() h:HeaderMap){const a=await this.portal(h);return this.tickets.create({...b,requesterType:"PORTAL",clientId:a.clientId,clientContactId:a.contactId,channel:"PORTAL",clientVisibility:"CLIENT_VISIBLE"},a);}
  @Get("tickets/:id") @RequireRoles("PORTAL_CLIENT") async detail(@Param("id") id:string,@Headers() h:HeaderMap){return this.tickets.detail(id,await this.portal(h));}
  @Post("tickets/:id/messages") @RequireRoles("PORTAL_CLIENT") async message(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){const a=await this.portal(h);return this.tickets.message(id,b,a,"PUBLIC_REPLY");}
  @Post("tickets/:id/attachments") @RequireRoles("PORTAL_CLIENT") async attachment(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){const a=await this.portal(h);return this.attachments.add(id,{...b,visibility:"CLIENT_VISIBLE"},a);}
  @Get("tickets/:id/attachments/:attachmentId/url") @RequireRoles("PORTAL_CLIENT") async signed(@Param("id") id:string,@Param("attachmentId") attachmentId:string,@Headers() h:HeaderMap){return this.attachments.signed(id,attachmentId,await this.portal(h));}
  @Post("tickets/:id/reopen") @RequireRoles("PORTAL_CLIENT") async reopen(@Param("id") id:string,@Body("reason") reason:string,@Headers() h:HeaderMap){return this.tickets.reopen(id,reason,await this.portal(h));}
  @Post("tickets/:id/accept-resolution") @RequireRoles("PORTAL_CLIENT") async accept(@Param("id") id:string,@Headers() h:HeaderMap){return this.tickets.close(id,await this.portal(h));}
  @Post("tickets/:id/csat") @RequireRoles("PORTAL_CLIENT") async csat(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.read.submitCsat(id,b,await this.portal(h));}
  @Get("knowledge") @RequireRoles("PORTAL_CLIENT") async knowledge(@Headers() h:HeaderMap){await this.portal(h);return(await this.repository.list<any>("knowledge_articles",{status:"PUBLISHED"})).filter(item=>["CLIENT","PUBLIC"].includes(item.visibility));}
}

@Controller()
export class SupportRelationsController{
  constructor(private readonly read:SupportReadService){}
  @Get("clients/:id/support") @RequireRoles(...readers) client(@Param("id") id:string){return this.read.related({clientId:id});}
  @Get("projects/:id/support") @RequireRoles(...readers) project(@Param("id") id:string){return this.read.related({projectId:id});}
  @Get("client-services/:id/support") @RequireRoles(...readers) service(@Param("id") id:string){return this.read.related({serviceId:id});}
}

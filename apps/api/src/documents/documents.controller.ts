import { Body,Controller,Delete,Get,Headers,Param,Patch,Post,Query } from "@nestjs/common";
import { Public,RequireRoles } from "../auth/roles.decorator.js";
import { DocumentReadService,DocumentService,DocumentSharingService,DocumentSignatureService,DocumentTemplateService,DocumentWorkflowService,type DocumentActor } from "./documents.service.js";
type HeaderMap=Record<string,string|string[]|undefined>;const header=(h:HeaderMap,key:string)=>{const value=h[key];return Array.isArray(value)?value[0]:value;};const actor=(h:HeaderMap):DocumentActor=>({userId:header(h,"x-zyteron-user-id")??null,role:header(h,"x-zyteron-role")??"",clientId:header(h,"x-zyteron-client-id")??null,contactId:header(h,"x-zyteron-contact-id")??null});
const readers=["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD","QA","SOPORTE_TECNICO","OPERACIONES","PROGRAMADOR","DESARROLLO","FINANZAS","RRHH","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"] as const;
const writers=readers;

@Controller("documents") export class DocumentsController{
 constructor(private readonly documents:DocumentService,private readonly read:DocumentReadService,private readonly reviews:DocumentWorkflowService,private readonly signatures:DocumentSignatureService,private readonly sharing:DocumentSharingService){}
 @Get("workspace") @RequireRoles(...readers) workspace(@Headers() h:HeaderMap){return this.read.workspace(actor(h));}
 @Get("search") @RequireRoles(...readers) search(@Query() q:Record<string,string|undefined>,@Headers() h:HeaderMap){return this.documents.list(q,actor(h));}
 @Get() @RequireRoles(...readers) list(@Query() q:Record<string,string|undefined>,@Headers() h:HeaderMap){return this.documents.list(q,actor(h));}
 @Post() @RequireRoles(...writers) create(@Body() b:any,@Headers() h:HeaderMap){return this.documents.create(b,actor(h));}
 @Get(":id") @RequireRoles(...readers) get(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.detail(id,actor(h));}
 @Patch(":id") @RequireRoles(...writers) update(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.documents.update(id,b,actor(h));}
 @Get(":id/versions") @RequireRoles(...readers) async versions(@Param("id") id:string,@Headers() h:HeaderMap){return(await this.documents.detail(id,actor(h))).versions;}
 @Post(":id/versions") @RequireRoles(...writers) version(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.documents.addVersion(id,b,actor(h));}
 @Post(":id/attachments") @RequireRoles(...writers) attachment(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.documents.addVersion(id,b,actor(h));}
 @Get(":id/download") @RequireRoles(...readers) download(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.download(id,actor(h));}
 @Post(":id/verify-hash") @RequireRoles(...readers) verify(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.verify(id,actor(h));}
 @Post(":id/links") @RequireRoles(...writers) link(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.documents.link(id,b,actor(h));}
 @Post(":id/comments") @RequireRoles(...writers) comment(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.documents.comment(id,b,actor(h));}
 @Get(":id/activity") @RequireRoles(...readers) activity(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.activity(id,actor(h));}
 @Post(":id/archive") @RequireRoles(...writers) archive(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.archive(id,actor(h));}
 @Post(":id/restore") @RequireRoles(...writers) restore(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.restore(id,actor(h));}
 @Post(":id/trash") @RequireRoles(...writers) trash(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.trash(id,actor(h));}
 @Delete(":id/purge") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO") purge(@Param("id") id:string,@Headers() h:HeaderMap){return this.documents.purge(id,actor(h));}
 @Post(":id/reviews") @RequireRoles(...writers) review(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.reviews.request(id,b,actor(h));}
 @Post(":id/signatures") @RequireRoles(...writers) signature(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.signatures.request(id,b,actor(h));}
 @Get(":id/signatures") @RequireRoles(...readers) signatureList(@Param("id") id:string,@Headers() h:HeaderMap){return this.signatures.list(id,actor(h));}
 @Post(":id/share/client") @RequireRoles(...writers) shareClient(@Param("id") id:string,@Headers() h:HeaderMap){return this.sharing.client(id,true,actor(h));}
 @Post(":id/unshare/client") @RequireRoles(...writers) unshareClient(@Param("id") id:string,@Headers() h:HeaderMap){return this.sharing.client(id,false,actor(h));}
 @Post(":id/share-link") @RequireRoles(...writers) shareLink(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.sharing.link(id,b,actor(h));}
}
@Controller("document-reviews") export class DocumentReviewsController{constructor(private readonly reviews:DocumentWorkflowService){}@Post(":id/approve") @RequireRoles(...readers) approve(@Param("id") id:string,@Body("comment") comment:string|null,@Headers() h:HeaderMap){return this.reviews.decide(id,"APPROVED",comment,actor(h));}@Post(":id/request-changes") @RequireRoles(...readers) changes(@Param("id") id:string,@Body("comment") comment:string,@Headers() h:HeaderMap){return this.reviews.decide(id,"CHANGES_REQUESTED",comment,actor(h));}@Post(":id/reject") @RequireRoles(...readers) reject(@Param("id") id:string,@Body("comment") comment:string,@Headers() h:HeaderMap){return this.reviews.decide(id,"REJECTED",comment,actor(h));}}
@Controller("signature-requests") export class SignatureRequestsController{constructor(private readonly signatures:DocumentSignatureService){}@Get(":id/status") @RequireRoles(...readers) status(@Param("id") id:string,@Headers() h:HeaderMap){return this.signatures.status(id,actor(h));}@Post(":id/cancel") @RequireRoles(...writers) cancel(@Param("id") id:string,@Headers() h:HeaderMap){return this.signatures.cancel(id,actor(h));}}
@Controller("document-share-links") export class DocumentShareLinksController{constructor(private readonly sharing:DocumentSharingService){}@Delete(":id") @RequireRoles(...writers) revoke(@Param("id") id:string,@Headers() h:HeaderMap){return this.sharing.revoke(id,actor(h));}}
@Controller("document-templates") export class DocumentTemplatesController{constructor(private readonly templates:DocumentTemplateService){}@Get() @RequireRoles(...readers) list(){return this.templates.list();}@Post() @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD") create(@Body() b:any,@Headers() h:HeaderMap){return this.templates.create(b,actor(h));}@Get(":id") @RequireRoles(...readers) get(@Param("id") id:string){return this.templates.get(id);}@Post(":id/versions") @RequireRoles("GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD") version(@Param("id") id:string,@Body() b:any,@Headers() h:HeaderMap){return this.templates.version(id,b,actor(h));}@Post(":id/render-preview") @RequireRoles(...readers) preview(@Param("id") id:string,@Body("variables") variables:Record<string,unknown>={}){return this.templates.preview(id,variables);}}
@Controller("client/documents") export class ClientDocumentsController{constructor(private readonly documents:DocumentService){}@Get() @RequireRoles("PORTAL_CLIENT") list(@Headers() h:HeaderMap){return this.documents.portal(actor(h));}}
@Controller("shared/documents") export class SharedDocumentsController{constructor(private readonly sharing:DocumentSharingService){}@Get(":token") @Public() resolve(@Param("token") token:string){return this.sharing.resolve(token);}}
@Controller("webhooks/signature") export class SignatureWebhookController{constructor(private readonly signatures:DocumentSignatureService){}@Post(":provider") @Public() webhook(@Param("provider") provider:string,@Headers() h:Record<string,string|undefined>,@Body() b:any){return this.signatures.webhook(provider,h,b);}}

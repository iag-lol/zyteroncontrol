import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
interface Request {headers:Record<string,string|undefined>;rawBody?:Buffer}
interface Response {setHeader(name:string,value:string):unknown;send(body:Buffer):unknown}
import { Public, RequireAal2, RequireRoles } from '../auth/roles.decorator.js';
import { FlowFinanceService } from './flow.service.js';
import { FlowSubscriptionService, type BillingActor } from './flow.subscriptions.js';
import { FlowWorker } from './flow.worker.js';
import { FlowSiteModeService } from './flow.site-mode.js';
import type { FinanceActor } from './finance.util.js';
import { requiredUuid } from './finance.util.js';
function strict(body:unknown,keys:string[]):Record<string,unknown>{if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k)))throw new BadRequestException('Solicitud inválida.');return body as Record<string,unknown>;}
function string(body:Record<string,unknown>,name:string,max=200){const v=body[name];if(typeof v!=='string'||!v||v.length>max)throw new BadRequestException('Solicitud inválida.');return v;}
function headers(h:Record<string,string|undefined>):FinanceActor{return{userId:h['x-zyteron-user-id']??null,role:h['x-zyteron-role']??''};}
function billingActor(h:Record<string,string|undefined>):BillingActor{return{userId:requiredUuid(h['x-zyteron-user-id'],'Identidad'),sessionId:requiredUuid(h['x-zyteron-session-id'],'Sesión')};}
@Controller('finance/flow') @RequireRoles('GERENTE_GENERAL','FINANZAS')
export class FlowInternalController{
 constructor(private readonly payments:FlowFinanceService,private readonly subscriptions:FlowSubscriptionService,private readonly worker:FlowWorker,private readonly sites:FlowSiteModeService){}
 @Post('invoices/:id/link')createLink(@Param('id')id:string,@Headers()h:Record<string,string|undefined>){return this.payments.createLink(requiredUuid(id,'Documento'),headers(h));}
 @Post('subscription-offers')offer(@Body()body:unknown,@Headers()h:Record<string,string|undefined>){const b=strict(body,['scheduleId','termsVersion','maintenanceResourceId','maintenancePolicyVersion']);const maintenance=b.maintenanceResourceId?{resourceId:string(b,'maintenanceResourceId',100),policyVersion:string(b,'maintenancePolicyVersion',40)}:undefined;if(maintenance)this.sites.binding(maintenance.resourceId,undefined,undefined,maintenance.policyVersion);return this.subscriptions.offer(requiredUuid(b.scheduleId,'Programación'),string(b,'termsVersion',40),headers(h),maintenance);}
 @Post('run-due') @RequireRoles('GERENTE_GENERAL')run(){return this.worker.runDue();}
}
@Controller('client/flow/subscriptions') @RequireRoles('PORTAL_CLIENT')
export class FlowClientSubscriptionsController{
 constructor(private readonly subscriptions:FlowSubscriptionService){}
 @Get()list(@Query('clientId')clientId:string,@Headers()h:Record<string,string|undefined>){return this.subscriptions.list(requiredUuid(clientId,'Empresa'),billingActor(h));}
 @Post(':id/enroll') @RequireAal2()enroll(@Param('id')id:string,@Body()body:unknown,@Headers()h:Record<string,string|undefined>){const b=strict(body,['termsSha256','accepted']);return this.subscriptions.enroll(requiredUuid(id,'Suscripción'),string(b,'termsSha256',64),b.accepted===true,billingActor(h));}
 @Post(':id/cancel') @RequireAal2()cancel(@Param('id')id:string,@Body()body:unknown,@Headers()h:Record<string,string|undefined>){strict(body,[]);return this.subscriptions.cancel(requiredUuid(id,'Suscripción'),billingActor(h));}
}
/** Existing Finance payment-link capability. No general client/admin endpoint is made public. */
@Controller('public/flow')
export class FlowCapabilityController{
 constructor(private readonly payments:FlowFinanceService,private readonly subscriptions:FlowSubscriptionService){}
 @Post('open') @Public()open(@Body()body:unknown){const b=strict(body,['linkToken']);return this.payments.open(string(b,'linkToken',64));}
 @Post('view') @Public()view(@Body()body:unknown){const b=strict(body,['grantToken']);return this.payments.view(string(b,'grantToken',43));}
 @Post('start') @Public()start(@Body()body:unknown){const b=strict(body,['grantToken','idempotencyKey']);return this.payments.start(string(b,'grantToken',43),string(b,'idempotencyKey',80));}
 @Post('refresh') @Public()refresh(@Body()body:unknown){const b=strict(body,['grantToken']);return this.payments.refresh(string(b,'grantToken',43));}
 @Post('return') @Public()paymentReturn(@Body()body:unknown){const b=strict(body,['token']);return this.payments.returnAccess(string(b,'token'));}
 @Post('registration-return') @Public()registrationReturn(@Body()body:unknown){const b=strict(body,['token']);return this.subscriptions.registrationReturn(string(b,'token'));}
 @Post('receipt') @Public()async receipt(@Body()body:unknown,@Res()response:Response){const b=strict(body,['grantToken']);const bytes=await this.payments.receipt(string(b,'grantToken',43));response.setHeader('cache-control','private, no-store');response.setHeader('content-type','application/pdf');response.setHeader('content-disposition','attachment; filename="comprobante-zyteron.pdf"');response.send(bytes);}
}
@Controller('webhooks/payments/flow')
export class FlowCallbackController{
 constructor(private readonly payments:FlowFinanceService){}
 @Post() @Public() @HttpCode(200)callback(@Body()body:unknown,@Req()request:Request&{rawBody?:Buffer}){if(!request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')||(request.rawBody?.length??0)>2048)throw new BadRequestException('Confirmación inválida.');const b=strict(body,['token']);return this.payments.callback(string(b,'token'));}
}
@Controller('site-mode')
export class FlowSiteModeController{
 constructor(private readonly sites:FlowSiteModeService){}
 @Get(':resource') @Public()read(@Param('resource')resource:string,@Headers()h:Record<string,string|undefined>){return this.sites.read(resource,h);}
 @Post(':resource/ack') @Public()ack(@Param('resource')resource:string,@Body()body:unknown,@Req()request:Request&{rawBody?:Buffer},@Headers()h:Record<string,string|undefined>){const b=strict(body,['mode','generation']);return this.sites.acknowledge(resource,h,request.rawBody?.toString('utf8')??'',b);}
}

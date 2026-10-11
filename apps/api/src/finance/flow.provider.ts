import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { PaymentProvider, type ProviderPayment } from './finance.payments.js';
import type { Row } from './finance.util.js';

export type FlowEnvironment = 'sandbox' | 'production';
export type FlowState = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
export interface FlowVerifiedPayment {
  order: string; commerceOrder: string; amount: string; currency: 'CLP'; state: FlowState;
  fee: string | null; paidAt: string | null; method: string | null; errorCode: string | null;
  merchantId: string | null; accountFingerprint: string; environment: FlowEnvironment;
}
export interface FlowSubscription {
  id: string; customerId: string; planId: string; state: 'INACTIVE' | 'ACTIVE' | 'TRIAL' | 'CANCELLED';
  cancelAtPeriodEnd: boolean; periodEnd: string | null; nextInvoiceDate: string | null; invoiceIds: string[];
}
export const flowStates: Record<number, FlowState> = {1:'PENDING',2:'CONFIRMED',3:'REJECTED',4:'CANCELLED'};
const rejectReasons: Record<string,string> = {'-1':'La tarjeta no es válida.','-2':'El medio de pago informó un problema de conexión.','-3':'Se excedió el monto permitido.','-4':'La fecha de expiración no es válida.','-5':'El banco no pudo completar la autenticación.','-6':'El medio de pago rechazó la operación.','-7':'La tarjeta está bloqueada.','-8':'La tarjeta está vencida.','-9':'El medio no permite esta transacción.','-10':'El medio de pago informó un problema en la operación.','-11':'Se alcanzó el límite de intentos del medio de pago.'};
export function flowReason(code:string|null){return code&&rejectReasons[code]||'La pasarela informó que el pago no fue aprobado. No se registró un abono.';}
export function clp(value:unknown):string {
  const s=typeof value==='number'?String(value):typeof value==='string'?value:'';
  if(!/^(0|[1-9]\d{0,11})(?:\.0{1,2})?$/.test(s))throw new BadRequestException('Importe CLP inválido.');
  return s.split('.')[0]!;
}
export function flowFee(value:unknown):string{const raw=typeof value==='number'?String(value):typeof value==='string'?value:'';if(!/^(0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(raw))throw new BadRequestException('Comisión inválida.');return raw;}
function cents(value:string){const [whole,fraction='']=value.split('.');return BigInt(whole!)*BigInt(100)+BigInt(fraction.padEnd(2,'0'));}
export function flowInstant(value:unknown):string|null {
  if(value===null||value===undefined)return null;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))throw new BadRequestException('Fecha Flow inválida.');
  // Flow returns Chilean wall-clock times. Reject ambiguous/gap times instead of guessing an offset.
  return Temporal.PlainDateTime.from(value.replace(' ','T')).toZonedDateTime('America/Santiago',{disambiguation:'reject'}).toInstant().toString();
}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ServiceUnavailableException('Respuesta Flow inválida.');return value as Record<string,unknown>;}
function text(value:unknown,max=200):string{if(typeof value!=='string'||!value||value.length>max)throw new ServiceUnavailableException('Respuesta Flow inválida.');return value;}
function id(value:unknown):string{if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)return String(value);return text(value);}
export function signFlow(params:Record<string,string>,secret:string){return createHmac('sha256',secret).update(Object.keys(params).filter(k=>k!=='s').sort().map(k=>k+params[k]).join('')).digest('hex');}

/** Hosted Flow integration. No card inputs, secret keys or provider tokens in client bundles. */
@Injectable()
export class FlowPaymentProvider extends PaymentProvider {
  readonly name='FLOW' as const;
  private settings(){
    const environment=process.env.FLOW_ENVIRONMENT;
    if(environment!=='sandbox'&&environment!=='production')throw new ServiceUnavailableException('Define el entorno de Flow explícitamente.');
    const apiKey=process.env.FLOW_API_KEY?.trim(),secret=process.env.FLOW_SECRET_KEY?.trim();
    if(!apiKey||!secret)throw new ServiceUnavailableException('Flow aún no está configurado.');
    if(environment==='production'&&process.env.FLOW_LIVE_PAYMENTS_ENABLED!=='true')throw new ServiceUnavailableException('Los cobros productivos de Flow están deshabilitados.');
    return {environment:environment as FlowEnvironment,apiKey,secret,base:environment==='sandbox'?'https://sandbox.flow.cl/api':'https://www.flow.cl/api'};
  }
  configured(){const missing=['FLOW_ENVIRONMENT','FLOW_API_KEY','FLOW_SECRET_KEY','FLOW_CONFIRMATION_URL','FLOW_RETURN_URL','FLOW_TOKEN_ENCRYPTION_KEY'].filter(k=>!process.env[k]?.trim());if(process.env.FLOW_ENVIRONMENT==='production'&&process.env.FLOW_LIVE_PAYMENTS_ENABLED!=='true')missing.push('FLOW_LIVE_PAYMENTS_ENABLED');return{ok:missing.length===0,missing};}
  account(){const c=this.settings();return{environment:c.environment,fingerprint:createHash('sha256').update(c.apiKey).digest('hex')};}
  private callback(name:string){const raw=process.env[name];if(!raw)throw new ServiceUnavailableException('Las URLs HTTPS de retorno/confirmación no están configuradas.');const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||['localhost','127.0.0.1','::1'].includes(u.hostname))throw new ServiceUnavailableException('El callback de Flow debe ser HTTPS público y fijo.');return u.toString();}
  private async call(method:'GET'|'POST',path:string,params:Record<string,string>){
    const config=this.settings(),body={...params,apiKey:config.apiKey};const encoded=new URLSearchParams({...body,s:signFlow(body,config.secret)});
    let response:Response;
    try {response=await fetch(config.base+path+(method==='GET'?'?'+encoded.toString():''),{method,headers:method==='POST'?{'content-type':'application/x-www-form-urlencoded'}:undefined,body:method==='POST'?encoded.toString():undefined,redirect:'error',signal:AbortSignal.timeout(8000)});}catch{throw new ServiceUnavailableException('No se pudo verificar la operación con Flow.');}
    // Never echo provider bodies, URLs, keys, tokens or payer data in errors/logs.
    if(!response.ok)throw new ServiceUnavailableException('Flow no pudo completar la operación.');
    const bytes=await response.text();if(bytes.length>262144)throw new ServiceUnavailableException('Respuesta Flow fuera de límites.');
    try{return object(JSON.parse(bytes));}catch{throw new ServiceUnavailableException('Respuesta Flow inválida.');}
  }
  private checkout(data:Record<string,unknown>){const token=text(data.token,200);if(!/^[A-Za-z0-9_-]{12,200}$/.test(token))throw new ServiceUnavailableException('Token Flow inválido.');const url=new URL(text(data.url,1000));const environment=this.settings().environment;const allowed=environment==='sandbox'?['sandbox.flow.cl']:['www.flow.cl','api.flow.cl'];if(url.protocol!=='https:'||!allowed.includes(url.hostname)||url.port||url.username||url.password||url.hash||url.search)throw new ServiceUnavailableException('URL de checkout Flow no autorizada.');url.searchParams.set('token',token);return{url:url.toString(),token};}
  async createOrder(input:{amount:string;commerceOrder:string;subject:string;email:string}){
    const amount=clp(input.amount);if(amount==='0'||!/^zyt_[a-f0-9-]{36}$/.test(input.commerceOrder)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))throw new BadRequestException('Orden de cobro inválida.');
    const data=await this.call('POST','/payment/create',{commerceOrder:input.commerceOrder,subject:input.subject.slice(0,200),currency:'CLP',amount,email:input.email,urlConfirmation:this.callback('FLOW_CONFIRMATION_URL'),urlReturn:this.callback('FLOW_RETURN_URL')});
    return{...this.checkout(data),order:id(data.flowOrder),...this.account()};
  }
  async verifiedPayment(token:string):Promise<FlowVerifiedPayment>{
    if(!/^[A-Za-z0-9_-]{12,200}$/.test(token))throw new BadRequestException('Token inválido.');
    const data=await this.call('GET','/payment/getStatusExtended',{token});return this.parsePayment(data);
  }
  async verifiedPaymentByOrder(order:string){if(!/^\d{1,20}$/.test(order))throw new BadRequestException('Orden Flow inválida.');return this.parsePayment(await this.call('GET','/payment/getStatusByFlowOrderExtended',{flowOrder:order}));}
  private parsePayment(data:Record<string,unknown>):FlowVerifiedPayment{
    const state=typeof data.status==='number'?flowStates[data.status]:undefined;if(!state)throw new ServiceUnavailableException('Flow informó un estado desconocido.');
    if(data.currency!=='CLP')throw new ServiceUnavailableException('Moneda no soportada para este cobro.');
    const payment=data.paymentData?object(data.paymentData):null;const error=data.lastError?object(data.lastError):null;
    const amount=clp(data.amount);let fee:string|null=null,paidAt:string|null=null;
    if(state==='CONFIRMED'){
      if(!payment||payment.currency!=='CLP'||clp(payment.amount)!==amount)throw new ServiceUnavailableException('Pago Flow sin evidencia consistente.');
      fee=flowFee(payment.fee);if(cents(fee)>cents(amount))throw new ServiceUnavailableException('Comisión Flow inconsistente.');paidAt=flowInstant(payment.date);if(!paidAt)throw new ServiceUnavailableException('Pago Flow sin fecha verificable.');
    }
    const merchantId=typeof data.merchantId==='string'?data.merchantId:null;if(process.env.FLOW_MERCHANT_ID&&merchantId!==process.env.FLOW_MERCHANT_ID)throw new ServiceUnavailableException('Comercio Flow inconsistente.');
    return{order:id(data.flowOrder),commerceOrder:text(data.commerceOrder),amount,currency:'CLP',state,fee,paidAt,method:payment&&typeof payment.media==='string'?payment.media.slice(0,40):null,errorCode:error&&['string','number'].includes(typeof error.code)?String(error.code).slice(0,10):null,merchantId,accountFingerprint:this.account().fingerprint,environment:this.account().environment};
  }
  async getSubscription(subscriptionId:string):Promise<FlowSubscription>{const data=await this.call('GET','/subscription/get',{subscriptionId});const states:Record<number,FlowSubscription['state']>={0:'INACTIVE',1:'ACTIVE',2:'TRIAL',4:'CANCELLED'};const state=typeof data.status==='number'?states[data.status]:undefined;if(!state)throw new ServiceUnavailableException('Estado de suscripción desconocido.');return{id:text(data.subscriptionId),customerId:text(data.customerId),planId:text(data.planId),state,cancelAtPeriodEnd:data.cancel_at_period_end===1,periodEnd:flowInstant(data.period_end),nextInvoiceDate:flowInstant(data.next_invoice_date),invoiceIds:Array.isArray(data.invoices)?data.invoices.map(v=>id(object(v).id)).slice(0,100):[]};}
  async cancelSubscription(subscriptionId:string,atPeriodEnd=true){await this.call('POST','/subscription/cancel',{subscriptionId,at_period_end:atPeriodEnd?'1':'0'});return this.getSubscription(subscriptionId);}
  async getPlan(planId:string){return this.call('GET','/plans/get',{planId});}
  async createMonthlyPlan(input:{planId:string;name:string;gross:string;periods:number}){return this.call('POST','/plans/create',{planId:input.planId,name:input.name.slice(0,100),currency:'CLP',amount:clp(input.gross),interval:'3',interval_count:'1',trial_period_days:'0',periods_number:String(input.periods),urlCallback:this.callback('FLOW_CONFIRMATION_URL')});}
  async createCustomer(input:{email:string;name:string;externalId:string}){const result=await this.call('POST','/customer/create',input);return text(result.customerId);}
  async registerCard(customerId:string){return this.checkout(await this.call('POST','/customer/register',{customerId,url_return:this.callback('FLOW_REGISTRATION_RETURN_URL')}));}
  async registrationStatus(token:string){const data=await this.call('GET','/customer/getRegisterStatus',{token});return{customerId:text(data.customerId),registered:data.status==='1'||data.status===1};}
  async createSubscription(planId:string,customerId:string,start:string,periods:number){const data=await this.call('POST','/subscription/create',{planId,customerId,subscription_start:start,periods_number:String(periods),trial_period_days:'0'});return this.getSubscription(text(data.subscriptionId));}
  async subscriptionInvoice(invoiceId:string){return this.call('GET','/invoice/get',{invoiceId});}
  async createPaymentIntent(_input:{amount:number;currency:string;description:string;externalReference:string;idempotencyKey:string;form:Row;payerEmail:string|null}):Promise<ProviderPayment>{throw new BadRequestException('Flow utiliza su checkout alojado. No se reciben datos de tarjeta.');}
  async createCheckout(_input:{amount:number;currency:string;description:string;externalReference:string;returnUrl:string}):Promise<{checkoutUrl:string;preferenceId:string}>{throw new BadRequestException('Flow requiere una orden reservada y autorizada antes de crear el checkout.');}
  async getPayment(token:string):Promise<ProviderPayment>{const p=await this.verifiedPayment(token);return{id:p.order,status:{PENDING:'pending',CONFIRMED:'approved',REJECTED:'rejected',CANCELLED:'cancelled'}[p.state],statusDetail:p.errorCode,amount:Number(p.amount),currency:p.currency,fee:Number(p.fee??0),netReceived:p.fee===null?null:Number(p.amount)-Number(p.fee),moneyReleaseDate:null,externalReference:p.commerceOrder,dateApproved:p.paidAt,refunds:[]};}
  async refund(_id:string,_amount:number,_key:string):Promise<{id:string;status:string;amount:number}>{throw new BadRequestException('La devolución Flow requiere su workflow verificado.');}
  async cancel(_id:string):Promise<ProviderPayment>{throw new BadRequestException('Una orden de pago no se anula desde el navegador.');}
  verifyWebhook(_headers:Record<string,string|undefined>,_dataId:string){return false;}
  override async handleWebhook(_headers:Record<string,string|undefined>,token:string){return this.getPayment(token);}
}

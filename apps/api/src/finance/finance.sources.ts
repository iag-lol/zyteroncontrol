import { Injectable, Optional } from "@nestjs/common";
import { ClientServicesService } from "../client-services/client-services.service.js";
import { ClientsService } from "../clients/clients.service.js";
import { QuotesService } from "../commercial/quotes.service.js";
import { SalesService } from "../commercial/sales.service.js";
import { ContractsService } from "../contracts/contracts.service.js";
import { createServerSupabase } from "../domain/server-supabase.js";
import { OperationsService } from "../operations/operations.service.js";
import type { Row } from "./finance.util.js";

// Adaptador de lectura hacia los dominios existentes. Finanzas nunca duplica clientes, servicios, contratos,
// ventas ni proyectos: los consulta. En Supabase lee las tablas con service role; en memoria delega en los servicios.
export interface SourceClient { id:string; legalName:string; tradeName:string|null; rut:string; businessActivity:string|null; billingLegalName:string|null; billingRut:string|null; billingActivity:string|null; billingAddress:string|null; address:string|null; commune:string|null; region:string|null; dteEmail:string|null; generalEmail:string|null; creditDays:number; currency:string; accountExecutiveId:string|null; }
export interface SourceClientService { id:string; clientId:string; serviceName:string; contractId:string|null; projectId:string|null; catalogServiceId:string|null; billingFrequency:string|null; agreedPrice:number|null; currency:string; status:string; startDate:string|null; endDate:string|null; }
export interface SourceContract { id:string; clientId:string; contractNumber:string; name:string; status:string; billingFrequency:string|null; currency:string; subtotal:number; tax:number; total:number; startDate:string|null; endDate:string|null; }
export interface SourceSale { id:string; quoteId:string; clientId:string|null; amount:number; currency:string; closedAt:string; contractId:string|null; status:string; ownerId:string|null; }
export interface SourceQuoteItem { description:string; quantity:number; unitPrice:number; discountPercent:number; taxable:boolean; catalogServiceId:string|null; }
export interface SourceCommission { id:string; saleId:string; userId:string; amount:number; currency:string; status:string; }
export interface SourceProject { id:string; name:string; projectNumber:string|null; clientId:string|null; contractId:string|null; quoteId:string|null; status:string; }
export interface SourceWorklog { projectId:string; userId:string; workDate:string; durationMinutes:number; billable:boolean; }
export interface SourceQuote { id:string; quoteNumber:string; companyName:string; clientId:string|null; ownerId:string|null; status:string; currency:string; totalAmount:number; acceptedAt:string|null; }
export interface SourceChangeRequest { id:string; projectId:string; description:string; costImpact:number|null; currency:string; status:string; approvedAt:string|null; }

const system={userId:null,role:"GERENTE_GENERAL"} as const;
const num=(value:unknown)=>value===null||value===undefined?0:Number(value);
const mapClient=(c:Row):SourceClient=>({id:c.id,legalName:c.legal_name??c.legalName,tradeName:c.trade_name??c.tradeName??null,rut:c.rut,businessActivity:c.business_activity??c.businessActivity??null,billingLegalName:c.billing_legal_name??c.billingLegalName??null,billingRut:c.billing_rut??c.billingRut??null,billingActivity:c.billing_activity??c.billingActivity??null,billingAddress:c.billing_address??c.billingAddress??null,address:c.address??null,commune:c.commune??null,region:c.region??null,dteEmail:c.dte_email??c.dteEmail??null,generalEmail:c.general_email??c.generalEmail??null,creditDays:num(c.credit_days??c.creditDays),currency:c.currency??"CLP",accountExecutiveId:c.account_executive_id??c.accountExecutiveId??null});
const mapService=(s:Row):SourceClientService=>({id:s.id,clientId:s.client_id??s.clientId,serviceName:s.service_name??s.serviceName,contractId:s.contract_id??s.contractId??null,projectId:s.project_id??s.projectId??null,catalogServiceId:s.catalog_service_id??s.catalogServiceId??null,billingFrequency:s.billing_frequency??s.billingFrequency??s.billing_type??null,agreedPrice:s.agreed_price??s.agreedPrice??s.price??null,currency:s.currency??"CLP",status:s.status,startDate:s.start_date??s.startDate??null,endDate:s.end_date??s.endDate??null});
const mapContract=(c:Row):SourceContract=>({id:c.id,clientId:c.client_id??c.clientId,contractNumber:c.contract_number??c.contractNumber,name:c.name,status:c.status,billingFrequency:c.billing_frequency??c.billingFrequency??null,currency:c.currency??"CLP",subtotal:num(c.subtotal),tax:num(c.tax),total:num(c.total),startDate:c.start_date??c.startDate??null,endDate:c.end_date??c.endDate??null});
const mapSale=(s:Row):SourceSale=>({id:s.id,quoteId:s.quote_id??s.quoteId,clientId:s.client_id??s.clientId??null,amount:num(s.amount),currency:s.currency,closedAt:s.closed_at??s.closedAt,contractId:s.contract_id??s.contractId??null,status:s.status,ownerId:s.owner_id??s.ownerId??null});
const mapQuote=(q:Row):SourceQuote=>({id:q.id,quoteNumber:q.quote_number??q.quoteNumber,companyName:q.company_name??q.companyName,clientId:q.client_id??q.clientId??null,ownerId:q.owner_id??q.ownerId??null,status:q.status,currency:q.currency??"CLP",totalAmount:num(q.total_amount??q.totalAmount),acceptedAt:q.accepted_at??q.acceptedAt??null});
const quoteColumns="id,quote_number,company_name,client_id,owner_id,status,currency,total_amount,accepted_at";
const mapProject=(p:Row):SourceProject=>({id:p.id,name:p.name,projectNumber:p.project_number??p.projectNumber??null,clientId:p.client_id??p.clientId??null,contractId:p.contract_id??p.contractId??null,quoteId:p.quote_id??p.quoteId??null,status:p.status});

@Injectable()
export class FinanceSources {
  private readonly supabase=createServerSupabase();
  /** Fixtures del modo memoria (tests y demo local sin Supabase). Tienen prioridad sobre los servicios. */
  readonly fixtures={clients:new Map<string,SourceClient>(),services:new Map<string,SourceClientService>(),contracts:new Map<string,SourceContract>(),sales:new Map<string,SourceSale>(),quoteItems:new Map<string,SourceQuoteItem[]>(),commissions:new Map<string,SourceCommission>(),projects:new Map<string,SourceProject>(),worklogs:[] as SourceWorklog[],changeRequests:new Map<string,SourceChangeRequest>(),assignments:new Map<string,Set<string>>(),quotes:new Map<string,SourceQuote>(),portalUsers:new Map<string,string>()};
  constructor(@Optional() private readonly clientsService?:ClientsService,@Optional() private readonly servicesService?:ClientServicesService,@Optional() private readonly contractsService?:ContractsService,@Optional() private readonly salesService?:SalesService,@Optional() private readonly quotesService?:QuotesService,@Optional() private readonly operations?:OperationsService){}

  private async rows(table:string,select:string,apply:(q:any)=>any=(q)=>q):Promise<Row[]>{const out:Row[]=[];for(let from=0;;from+=1000){const{data,error}=await apply((this.supabase!.from(table) as any).select(select)).range(from,from+999);if(error)throw error;out.push(...(data??[]));if((data??[]).length<1000)break;}return out;}
  private async safe<T>(work:()=>Promise<T>,fallback:T):Promise<T>{try{return await work();}catch{return fallback;}}

  async client(id:string):Promise<SourceClient|null>{
    if(this.supabase){const{data}=await this.supabase.from("clients").select("*").eq("id",id).maybeSingle();return data?mapClient(data):null;}
    return this.fixtures.clients.get(id)??await this.safe(async()=>this.clientsService?mapClient(await this.clientsService.get(id) as unknown as Row):null,null);
  }
  async clientNames(ids:Array<string|null|undefined>):Promise<Map<string,string>>{
    const unique=[...new Set(ids.filter((id):id is string=>Boolean(id)))];const names=new Map<string,string>();if(!unique.length)return names;
    if(this.supabase){for(let i=0;i<unique.length;i+=200){const{data}=await this.supabase.from("clients").select("id,legal_name,trade_name").in("id",unique.slice(i,i+200));for(const row of data??[])names.set(row.id,row.trade_name||row.legal_name);}return names;}
    for(const id of unique){const client=await this.client(id);if(client)names.set(id,client.tradeName||client.legalName);}return names;
  }
  async clientsList():Promise<SourceClient[]>{
    if(this.supabase)return(await this.rows("clients","*",(q)=>q.neq("status","ARCHIVED"))).map(mapClient);
    if(this.fixtures.clients.size)return[...this.fixtures.clients.values()];
    return this.safe(async()=>((await this.clientsService?.list({page:"1",pageSize:"100"}))?.items??[]).map((c)=>mapClient(c as unknown as Row)),[]);
  }
  /** Clientes visibles para una ejecutiva: propios (account executive) o asignados activamente. */
  async ownClientIds(userId:string|null):Promise<Set<string>>{
    if(!userId)return new Set();
    if(this.supabase){const[own,assigned]=await Promise.all([this.supabase.from("clients").select("id").eq("account_executive_id",userId),this.supabase.from("client_assignments").select("client_id").eq("user_id",userId).eq("active",true)]);return new Set([...(own.data??[]).map((r:Row)=>r.id),...(assigned.data??[]).map((r:Row)=>r.client_id)]);}
    const ids=new Set(this.fixtures.assignments.get(userId)??[]);for(const client of await this.clientsList())if(client.accountExecutiveId===userId)ids.add(client.id);return ids;
  }
  async clientService(id:string):Promise<SourceClientService|null>{
    if(this.supabase){const{data}=await this.supabase.from("client_services").select("*").eq("id",id).maybeSingle();return data?mapService(data):null;}
    return this.fixtures.services.get(id)??await this.safe(async()=>this.servicesService?mapService(await this.servicesService.get(id) as unknown as Row):null,null);
  }
  async activeRecurringServices():Promise<SourceClientService[]>{
    const recurring=(s:SourceClientService)=>s.status==="ACTIVE"&&Boolean(s.billingFrequency)&&s.billingFrequency!=="ONE_TIME"&&Number(s.agreedPrice)>0;
    if(this.supabase)return(await this.rows("client_services","*",(q)=>q.eq("status","ACTIVE"))).map(mapService).filter(recurring);
    if(this.fixtures.services.size)return[...this.fixtures.services.values()].filter(recurring);
    return this.safe(async()=>((await this.servicesService?.list({page:"1",pageSize:"100",status:"ACTIVE"}))?.items??[]).map((s)=>mapService(s as unknown as Row)).filter(recurring),[]);
  }
  async contract(id:string):Promise<SourceContract|null>{
    if(this.supabase){const{data}=await this.supabase.from("client_contracts").select("*").eq("id",id).maybeSingle();return data?mapContract(data):null;}
    return this.fixtures.contracts.get(id)??await this.safe(async()=>this.contractsService?mapContract(await this.contractsService.get(id) as unknown as Row):null,null);
  }
  async sale(id:string):Promise<SourceSale|null>{
    if(this.supabase){const{data}=await this.supabase.from("sales").select("*").eq("id",id).maybeSingle();return data?mapSale(data):null;}
    return this.fixtures.sales.get(id)??await this.safe(async()=>this.salesService?mapSale(await this.salesService.get(id) as unknown as Row):null,null);
  }
  async wonSales():Promise<SourceSale[]>{
    if(this.supabase)return(await this.rows("sales","*",(q)=>q.eq("status","WON"))).map(mapSale);
    if(this.fixtures.sales.size)return[...this.fixtures.sales.values()].filter((s)=>s.status==="WON");
    return this.safe(async()=>((await this.salesService?.list({page:1,pageSize:100}))?.items??[]).map((s:Row)=>mapSale(s)).filter((s:SourceSale)=>s.status==="WON"),[]);
  }
  async quoteItems(quoteId:string):Promise<SourceQuoteItem[]>{
    const map=(i:Row):SourceQuoteItem=>({description:i.description,quantity:num(i.quantity),unitPrice:num(i.unit_price??i.unitPrice),discountPercent:num(i.discount_percent??i.discountPercent),taxable:Boolean(i.taxable),catalogServiceId:i.catalog_service_id??i.catalogServiceId??null});
    if(this.supabase){const{data}=await this.supabase.from("quote_items").select("*").eq("quote_id",quoteId).order("position");return(data??[]).map(map);}
    return this.fixtures.quoteItems.get(quoteId)??await this.safe(async()=>(((await this.quotesService?.get(quoteId)) as unknown as Row)?.items??[]).map(map),[]);
  }
  async quote(id:string):Promise<SourceQuote|null>{
    if(this.supabase){const{data}=await this.supabase.from("quotes").select(quoteColumns).eq("id",id).maybeSingle();return data?mapQuote(data):null;}
    return this.fixtures.quotes.get(id)??await this.safe(async()=>this.quotesService?mapQuote(await this.quotesService.get(id) as unknown as Row):null,null);
  }
  async quotes(ids:Array<string|null|undefined>):Promise<Map<string,SourceQuote>>{
    const unique=[...new Set(ids.filter((id):id is string=>Boolean(id)))];const out=new Map<string,SourceQuote>();if(!unique.length)return out;
    if(this.supabase){for(let i=0;i<unique.length;i+=200){const{data}=await this.supabase.from("quotes").select(quoteColumns).in("id",unique.slice(i,i+200));for(const row of data??[])out.set(row.id,mapQuote(row));}return out;}
    for(const id of unique){const quote=await this.quote(id);if(quote)out.set(id,quote);}return out;
  }
  /** Cotizaciones aceptadas o convertidas en venta: las únicas que pueden tener calendario de pagos. */
  async acceptedQuotes():Promise<SourceQuote[]>{
    if(this.supabase)return(await this.rows("quotes",quoteColumns,(q)=>q.in("status",["ACCEPTED","CONVERTED"]).order("accepted_at",{ascending:false}))).map(mapQuote);
    return[...this.fixtures.quotes.values()].filter((q)=>["ACCEPTED","CONVERTED"].includes(q.status));
  }
  /** Cliente del usuario del portal: acceso ACTIVO, portal habilitado y facturas visibles (espejo de private.portal_quote_client). */
  async portalClientId(userId:string|null):Promise<string|null>{
    if(!userId)return null;
    if(this.supabase){const{data}=await this.supabase.from("client_portal_users").select("client_id").eq("auth_user_id",userId).eq("status","ACTIVE").limit(1).maybeSingle();if(!data)return null;const{data:settings}=await this.supabase.from("client_portal_settings").select("enabled,invoices_visible").eq("client_id",data.client_id).maybeSingle();return settings?.enabled&&settings?.invoices_visible?data.client_id:null;}
    return this.fixtures.portalUsers.get(userId)??null;
  }
  async commissions():Promise<SourceCommission[]>{
    const map=(c:Row):SourceCommission=>({id:c.id,saleId:c.sale_id??c.saleId,userId:c.user_id??c.userId,amount:num(c.amount),currency:c.currency,status:c.status});
    if(this.supabase)return(await this.rows("commissions","*")).map(map);
    if(this.fixtures.commissions.size)return[...this.fixtures.commissions.values()];
    return this.safe(async()=>((await this.salesService?.commissions())??[]).map((c)=>map(c as unknown as Row)),[]);
  }
  /** Finanzas sólo avanza estados financieros (PAYABLE/PAID/CANCELLED) de la comisión comercial existente. */
  async transitionCommission(id:string,status:"ELIGIBLE"|"PAYABLE"|"PAID"|"CANCELLED"){
    if(this.supabase){const patch:Row={status,updated_at:new Date().toISOString()};if(status==="PAID")patch.paid_at=new Date().toISOString();const{error}=await this.supabase.from("commissions").update(patch).eq("id",id);if(error)throw error;return;}
    const fixture=this.fixtures.commissions.get(id);if(fixture){fixture.status=status;return;}await this.salesService?.transitionCommission(id,status);
  }
  async project(id:string):Promise<SourceProject|null>{
    if(this.supabase){const{data}=await this.supabase.from("projects").select("id,name,project_number,client_id,contract_id,quote_id,status").eq("id",id).maybeSingle();return data?mapProject(data):null;}
    return this.fixtures.projects.get(id)??await this.safe(async()=>this.operations?mapProject(await this.operations.getProject(id,system as never) as unknown as Row):null,null);
  }
  async projects():Promise<SourceProject[]>{
    if(this.supabase)return(await this.rows("projects","id,name,project_number,client_id,contract_id,quote_id,status")).map(mapProject);
    if(this.fixtures.projects.size)return[...this.fixtures.projects.values()];
    return this.safe(async()=>((await this.operations?.listProjects({page:1,pageSize:100} as never,system as never))?.items??[]).map((p:Row)=>mapProject(p)),[]);
  }
  async worklogs(filter:{projectId?:string;from?:string;to?:string}={}):Promise<SourceWorklog[]>{
    const map=(w:Row):SourceWorklog=>({projectId:w.project_id??w.projectId,userId:w.user_id??w.userId,workDate:w.work_date??w.workDate,durationMinutes:num(w.duration_minutes??w.durationMinutes),billable:Boolean(w.billable)});
    const inRange=(w:SourceWorklog)=>(!filter.projectId||w.projectId===filter.projectId)&&(!filter.from||w.workDate>=filter.from)&&(!filter.to||w.workDate<=filter.to);
    if(this.supabase)return(await this.rows("work_logs","project_id,user_id,work_date,duration_minutes,billable",(q)=>{let x=q;if(filter.projectId)x=x.eq("project_id",filter.projectId);if(filter.from)x=x.gte("work_date",filter.from);if(filter.to)x=x.lte("work_date",filter.to);return x;})).map(map);
    if(this.fixtures.worklogs.length)return this.fixtures.worklogs.filter(inRange);
    return this.safe(async()=>((await this.operations?.listWorklogs({page:1,pageSize:100,projectId:filter.projectId} as never,system as never))?.items??[]).map((w:Row)=>map(w)).filter(inRange),[]);
  }
  async approvedChangeRequests():Promise<SourceChangeRequest[]>{
    const map=(c:Row):SourceChangeRequest=>({id:c.id,projectId:c.project_id??c.projectId,description:c.description,costImpact:c.cost_impact??c.costImpact??null,currency:c.currency??"CLP",status:c.status,approvedAt:c.approved_at??c.approvedAt??null});
    if(this.supabase)return(await this.rows("change_requests","id,project_id,description,cost_impact,currency,status,approved_at",(q)=>q.in("status",["APPROVED","IMPLEMENTING","COMPLETED"]))).map(map);
    return[...this.fixtures.changeRequests.values()].filter((c)=>["APPROVED","IMPLEMENTING","COMPLETED"].includes(c.status));
  }
}

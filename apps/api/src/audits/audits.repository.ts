import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { AuditEvent } from "@zyteron/contracts";
import { createServerSupabase, pageBounds } from "../domain/server-supabase.js";

type Row = Record<string, any>;
type Filters = Record<string, string | number | boolean | null | undefined>;
export interface AuditPage { page:number; pageSize:number; search?:string; status?:string; clientId?:string; projectId?:string; responsibleUserId?:string; auditType?:string; severity?:string; overdue?:boolean; }
const stamp=()=>new Date().toISOString();
const snake=(key:string)=>key.replace(/[A-Z]/g,(letter)=>`_${letter.toLowerCase()}`);
const camel=(key:string)=>key.replace(/_([a-z])/g,(_,letter:string)=>letter.toUpperCase());
const excluded=new Set(["clientName","projectName","auditNumber","sectionCode","sectionTitle","checkCode","checkTitle"]);
const toRow=(value:Row)=>Object.fromEntries(Object.entries(value).filter(([key,item])=>!excluded.has(key)&&item!==undefined).map(([key,item])=>[snake(key),item]));
const relationValue=(value:unknown,key:string)=>{const item=Array.isArray(value)?value[0]:value;return item&&typeof item==="object"?String((item as Row)[key]??"")||null:null;};
const fromRow=<T>(value:Row):T=>{const result:Row={};for(const[key,item]of Object.entries(value)){if(key==="clients")result.clientName=relationValue(item,"legal_name");else if(key==="projects")result.projectName=relationValue(item,"name");else if(key==="audit_runs")result.auditNumber=relationValue(item,"audit_number");else if(key==="audit_template_checks"){result.checkCode=relationValue(item,"code");result.checkTitle=relationValue(item,"title");}else if(key==="audit_template_sections"){result.sectionCode=relationValue(item,"code");result.sectionTitle=relationValue(item,"title");}else result[camel(key)]=item;}return result as T;};

const selectFor=(table:string)=>{
  if(table==="audit_plans"||table==="audit_runs")return "*,clients(legal_name),projects(name)";
  if(table==="audit_findings")return "*,clients(legal_name),projects(name),audit_runs(audit_number)";
  if(table==="audit_check_results")return "*,audit_template_checks(code,title),audit_template_sections(code,title)";
  return "*";
};

@Injectable()
export class AuditsRepository {
  private readonly supabase=createServerSupabase();
  private readonly memory=new Map<string,Map<string,Row>>();
  private readonly idempotency=new Map<string,string>();
  private auditSequence=0;
  private findingSequence=0;

  private store(table:string){let value=this.memory.get(table);if(!value){value=new Map();this.memory.set(table,value);}return value;}
  configured(){return Boolean(this.supabase);}

  async list<T>(table:string,filters:Filters={},order="created_at",ascending=false):Promise<T[]> {
    if(!this.supabase)return [...this.store(table).values()].filter((row)=>Object.entries(filters).every(([key,value])=>value===undefined||row[key]===value)).sort((a,b)=>String(ascending?a[camel(order)]??"":b[camel(order)]??"").localeCompare(String(ascending?b[camel(order)]??"":a[camel(order)]??""))) as T[];
    let query=(this.supabase.from(table) as any).select(selectFor(table));
    for(const[key,value]of Object.entries(filters))if(value!==undefined)query=value===null?query.is(snake(key),null):query.eq(snake(key),value);
    const{data,error}=await query.order(order,{ascending});if(error)throw error;return(data??[]).map((item:Row)=>fromRow<T>(item));
  }

  async page<T>(table:string,q:AuditPage):Promise<{items:T[];page:number;pageSize:number;total:number;totalPages:number}> {
    if(!this.supabase){let items=[...this.store(table).values()];const search=q.search?.toLowerCase();items=items.filter((item)=>(!q.status||item.status===q.status)&&(!q.clientId||item.clientId===q.clientId)&&(!q.projectId||item.projectId===q.projectId)&&(!q.responsibleUserId||item.responsibleUserId===q.responsibleUserId)&&(!q.auditType||item.auditType===q.auditType)&&(!q.severity||item.severity===q.severity)&&(!q.overdue||Boolean(item.dueDate&&item.dueDate<stamp().slice(0,10)))&&(!search||Object.values(item).some((value)=>typeof value==="string"&&value.toLowerCase().includes(search))));items.sort((a,b)=>String(b.updatedAt??b.createdAt??"").localeCompare(String(a.updatedAt??a.createdAt??"")));const start=(q.page-1)*q.pageSize;return{items:items.slice(start,start+q.pageSize) as T[],page:q.page,pageSize:q.pageSize,total:items.length,totalPages:Math.ceil(items.length/q.pageSize)};}
    const{from,to}=pageBounds(q.page,q.pageSize);let query=(this.supabase.from(table) as any).select(selectFor(table),{count:"exact"});
    const columns=table==="audit_findings"?["finding_number","title","description","category"]:table==="audit_runs"?["audit_number"]:["name"];
    if(q.search)query=query.or(columns.map((column)=>`${column}.ilike.%${q.search!.replace(/[,()]/g," ")}%`).join(","));
    for(const[key,value]of Object.entries({status:q.status,clientId:q.clientId,projectId:q.projectId,responsibleUserId:q.responsibleUserId,auditType:q.auditType,severity:q.severity}))if(value)query=query.eq(snake(key),value);
    if(q.overdue&&table==="audit_findings")query=query.lt("due_date",stamp().slice(0,10)).not("status","in","(RESOLVED,CLOSED,ACCEPTED_RISK,NOT_APPLICABLE)");
    const{data,error,count}=await query.order("updated_at",{ascending:false}).range(from,to);if(error)throw error;return{items:(data??[]).map((item:Row)=>fromRow<T>(item)),page:q.page,pageSize:q.pageSize,total:count??0,totalPages:Math.ceil((count??0)/q.pageSize)};
  }

  async get<T>(table:string,id:string):Promise<T|undefined>{if(!this.supabase)return this.store(table).get(id) as T|undefined;const{data,error}=await(this.supabase.from(table) as any).select(selectFor(table)).eq("id",id).maybeSingle();if(error)throw error;return data?fromRow<T>(data as Row):undefined;}
  async create<T extends Row>(table:string,input:T):Promise<T>{const now=stamp();const item={id:randomUUID(),...input,createdAt:input.createdAt??now,updatedAt:input.updatedAt??now} as T;if(!this.supabase){this.store(table).set(String(item.id),item);return item;}const{data,error}=await(this.supabase.from(table) as any).insert(toRow(item)).select(selectFor(table)).single();if(error)throw error;return fromRow<T>(data as Row);}
  async update<T extends Row>(table:string,id:string,patch:Partial<T>):Promise<T>{if(!this.supabase){const current=this.store(table).get(id);if(!current)throw new NotFoundException("Registro de auditoría no encontrado.");const next={...current,...patch,updatedAt:stamp()} as unknown as T;this.store(table).set(id,next);return next;}const{data,error}=await(this.supabase.from(table) as any).update(toRow({...patch,updatedAt:stamp()})).eq("id",id).select(selectFor(table)).single();if(error)throw error;return fromRow<T>(data as Row);}

  async nextAuditNumber(){if(!this.supabase)return`AUD-${new Date().getUTCFullYear()}-${String(++this.auditSequence).padStart(6,"0")}`;const{data,error}=await this.supabase.rpc("next_audit_number");if(error)throw error;return String(data);}
  async nextFindingNumber(){if(!this.supabase)return`FND-${new Date().getUTCFullYear()}-${String(++this.findingSequence).padStart(6,"0")}`;const{data,error}=await this.supabase.rpc("next_finding_number");if(error)throw error;return String(data);}
  async claimIdempotency(key:string,operation:string,resourceId:string){const token=`${operation}:${key}`;if(!this.supabase){const current=this.idempotency.get(token);if(current)return current;this.idempotency.set(token,resourceId);return null;}const{data}=await this.supabase.from("audit_idempotency_keys").select("resource_id").eq("idempotency_key",key).eq("operation",operation).maybeSingle();if(data)return String(data.resource_id);const{error}=await this.supabase.from("audit_idempotency_keys").insert({idempotency_key:key,operation,resource_id:resourceId});if(error?.code==="23505"){const existing=await this.supabase.from("audit_idempotency_keys").select("resource_id").eq("idempotency_key",key).eq("operation",operation).single();if(existing.error)throw existing.error;return String(existing.data.resource_id);}if(error)throw error;return null;}

  async publish(auditId:string|null,findingId:string|null,aggregateType:string,aggregateId:string,eventType:string,actorId:string|null,payload:Row={}) {const event:AuditEvent={id:randomUUID(),auditId,findingId,aggregateType,aggregateId,eventType,actorId,payload,occurredAt:stamp()};if(!this.supabase){this.store("audit_events").set(event.id,event as unknown as Row);return event;}const{error}=await this.supabase.from("audit_events").insert(toRow(event as unknown as Row));if(error)throw error;return event;}
  async authorizedEndpoint(projectId:string,endpointId:string){if(!this.supabase)return this.store("project_endpoints").get(endpointId);const{data,error}=await this.supabase.from("project_endpoints").select("id,project_id,url,name,active").eq("id",endpointId).eq("project_id",projectId).eq("active",true).maybeSingle();if(error)throw error;return data?fromRow<Row>(data):undefined;}
  async saveFile(bucket:string,path:string,bytes:Buffer,mime:string){if(!this.supabase)return null;const{error}=await this.supabase.storage.from(bucket).upload(path,bytes,{contentType:mime,upsert:false});if(error)throw error;return path;}
}

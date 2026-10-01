import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { DevelopmentEvent } from "@zyteron/contracts";
import { createServerSupabase } from "../domain/server-supabase.js";

type Row = Record<string, unknown>;
type Filter = Record<string, string | number | boolean | null | undefined>;
const now = () => new Date().toISOString();
const snake = (key:string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const camel = (key:string) => key.replace(/_([a-z])/g, (_, letter:string) => letter.toUpperCase());
const toRow = (value:Row) => Object.fromEntries(Object.entries(value).filter(([key,v]) => key!=="projectName"&&v!==undefined).map(([key,v]) => [snake(key),v]));
const fromRow = <T>(value:Row):T => {
  const result:Row={};
  for(const[key,v]of Object.entries(value)){
    if(key==="projects"){
      const project=Array.isArray(v)?v[0]:v;
      result.projectName=project&&typeof project==="object"?String((project as Row).name??"")||null:null;
    }else result[camel(key)]=v;
  }
  return result as T;
};
const projectTables=new Set(["project_technologies","project_repositories","pull_requests","project_environments","build_runs","qa_runs","qa_test_cases","bugs","releases","technical_debt_items","project_external_services"]);

@Injectable()
export class DevelopmentRepository {
  private readonly supabase=createServerSupabase();
  private readonly memory=new Map<string,Map<string,Row>>();

  private store(table:string){let value=this.memory.get(table);if(!value){value=new Map();this.memory.set(table,value);}return value;}

  async list<T>(table:string,filter:Filter={},order="updated_at",ascending=false):Promise<T[]>{
    if(!this.supabase)return[...this.store(table).values()].filter(row=>Object.entries(filter).every(([key,value])=>value===undefined||row[key]===value)).sort((a,b)=>String(b[camel(order)]??"").localeCompare(String(a[camel(order)]??""))) as T[];
    let query=(this.supabase.from(table) as any).select(projectTables.has(table)?"*,projects(name)":"*");
    for(const[key,value]of Object.entries(filter))if(value!==undefined)query=value===null?query.is(snake(key),null):query.eq(snake(key),value);
    const{data,error}=await query.order(order,{ascending});if(error)throw error;return(data??[]).map((row:Row)=>fromRow<T>(row));
  }
  async get<T>(table:string,id:string):Promise<T|undefined>{
    if(!this.supabase)return this.store(table).get(id) as T|undefined;
    const select=projectTables.has(table)?"*,projects(name)":"*";
    const{data,error}=await (this.supabase.from(table) as any).select(select).eq("id",id).maybeSingle();if(error)throw error;return data?fromRow<T>(data as Row):undefined;
  }
  async create<T extends Row>(table:string,input:T):Promise<T>{
    const stamp=now();const item={id:randomUUID(),...input,createdAt:input.createdAt??stamp,updatedAt:input.updatedAt??stamp} as T;
    if(!this.supabase){this.store(table).set(String(item.id),item);return item;}
    const select=projectTables.has(table)?"*,projects(name)":"*";
    const{data,error}=await (this.supabase.from(table) as any).insert(toRow(item)).select(select).single();if(error)throw error;return fromRow<T>(data as Row);
  }
  async update<T extends Row>(table:string,id:string,patch:Partial<T>):Promise<T>{
    if(!this.supabase){const current=this.store(table).get(id);if(!current)throw new NotFoundException("Registro no encontrado.");const next={...current,...patch,updatedAt:now()} as unknown as T;this.store(table).set(id,next);return next;}
    const select=projectTables.has(table)?"*,projects(name)":"*";
    const{data,error}=await (this.supabase.from(table) as any).update(toRow({...patch,updatedAt:now()} as Row)).eq("id",id).select(select).single();if(error)throw error;return fromRow<T>(data as Row);
  }
  async remove(table:string,id:string){if(!this.supabase){const found=this.store(table).delete(id);if(!found)throw new NotFoundException("Registro no encontrado.");return;}const{error}=await this.supabase.from(table).delete().eq("id",id);if(error)throw error;}
  async publish(projectId:string|null,aggregateType:string,aggregateId:string,eventType:string,actorId:string|null,payload:Row={}){
    const event:DevelopmentEvent={id:randomUUID(),projectId,aggregateType,aggregateId,eventType,actorId,payload,occurredAt:now()};
    if(!this.supabase){this.store("development_events").set(event.id,event as unknown as Row);return event;}
    const{error}=await this.supabase.from("development_events").insert({id:event.id,project_id:projectId,aggregate_type:aggregateType,aggregate_id:aggregateId,event_type:eventType,actor_id:actorId,payload,occurred_at:event.occurredAt});if(error)throw error;
    const outbox=await this.supabase.from("business_event_outbox").insert({aggregate_type:aggregateType,aggregate_id:aggregateId,event_type:eventType,payload:{projectId,...payload}});if(outbox.error)throw outbox.error;
    return event;
  }
  async activity(projectId?:string){return this.list<DevelopmentEvent>("development_events",projectId?{projectId}:{},"occurred_at");}
}

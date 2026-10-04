import { ConflictException,Injectable,NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createServerSupabase } from "../domain/server-supabase.js";

type Row=Record<string,any>;
const now=()=>new Date().toISOString();
const snake=(key:string)=>key.replace(/[A-Z]/g,letter=>`_${letter.toLowerCase()}`);
const camel=(key:string)=>key.replace(/_([a-z])/g,(_,letter:string)=>letter.toUpperCase());
const toRow=(value:Row)=>Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).map(([key,item])=>[snake(key),item]));
const fromRow=<T>(value:Row):T=>Object.fromEntries(Object.entries(value).map(([key,item])=>[camel(key),item]))as T;

@Injectable()
export class SettingsRepository{
  readonly supabase=createServerSupabase();
  private readonly memory=new Map<string,Map<string,Row>>();
  private store(table:string){let value=this.memory.get(table);if(!value){value=new Map();this.memory.set(table,value);}return value;}
  configured(){return Boolean(this.supabase);}
  async list<T>(table:string,filters:Row={},order="created_at",ascending=false):Promise<T[]>{
    if(!this.supabase)return[...this.store(table).values()].filter(row=>Object.entries(filters).every(([key,value])=>value===undefined||row[key]===value)).sort((a,b)=>String(ascending?a[camel(order)]??"":b[camel(order)]??"").localeCompare(String(ascending?b[camel(order)]??"":a[camel(order)]??"")))as T[];
    let query=(this.supabase.from(table)as any).select("*");
    for(const[key,value]of Object.entries(filters))if(value!==undefined)query=value===null?query.is(snake(key),null):query.eq(snake(key),value);
    const{data,error}=await query.order(order,{ascending});if(error)throw error;
    return(data??[]).map((item:Row)=>fromRow<T>(item));
  }
  async get<T>(table:string,id:string):Promise<T>{
    if(!this.supabase){const item=this.store(table).get(id);if(!item)throw new NotFoundException("Registro de configuración no encontrado.");return item as T;}
    const{data,error}=await(this.supabase.from(table)as any).select("*").eq("id",id).maybeSingle();if(error)throw error;if(!data)throw new NotFoundException("Registro de configuración no encontrado.");return fromRow<T>(data as Row);
  }
  async find<T>(table:string,filters:Row):Promise<T|undefined>{
    if(!this.supabase)return[...this.store(table).values()].find(row=>Object.entries(filters).every(([key,value])=>row[key]===value))as T|undefined;
    let query=(this.supabase.from(table)as any).select("*");for(const[key,value]of Object.entries(filters))query=query.eq(snake(key),value);
    const{data,error}=await query.maybeSingle();if(error)throw error;return data?fromRow<T>(data as Row):undefined;
  }
  async create<T extends Row>(table:string,input:T):Promise<T>{
    const payload={...input}as Row;if(!payload.id)delete payload.id;if(!payload.createdAt)delete payload.createdAt;if(!payload.updatedAt)delete payload.updatedAt;
    if(!this.supabase){const stamp=now(),item={...input,id:input.id||randomUUID(),createdAt:input.createdAt||stamp,updatedAt:input.updatedAt||stamp}as T;this.store(table).set(String(item.id),item);return item;}
    const{data,error}=await(this.supabase.from(table)as any).insert(toRow(payload)).select("*").single();if(error?.code==="23505")throw new ConflictException("El registro ya existe.");if(error)throw error;return fromRow<T>(data as Row);
  }
  async update<T extends Row>(table:string,id:string,patch:Partial<T>):Promise<T>{
    if(!this.supabase){const current=this.store(table).get(id);if(!current)throw new NotFoundException("Registro de configuración no encontrado.");const next={...current,...patch,updatedAt:now()}as unknown as T;this.store(table).set(id,next);return next;}
    const{data,error}=await(this.supabase.from(table)as any).update(toRow({...patch,updatedAt:now()})).eq("id",id).select("*").single();if(error)throw error;return fromRow<T>(data as Row);
  }
  async append(table:string,input:Row){return this.create(table,{id:"",...input});}
}

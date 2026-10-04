"use client";

import { useEffect,useMemo,useState } from "react";
import type { Role } from "@zyteron/contracts";
import { auditsApi } from "@/lib/audits-api";
import { clientsApi } from "@/lib/clients-api";
import { commercialApi } from "@/lib/commercial-api";
import { contractsApi } from "@/lib/client-domain-api";
import { documentsApi } from "@/lib/documents-api";
import { operationsApi } from "@/lib/operations-api";
import { supportApi } from "@/lib/support-api";

export type ReferenceEntityType="CLIENT"|"PROJECT"|"CONTRACT"|"QUOTE"|"WORK_ORDER"|"AUDIT"|"SUPPORT"|"SUPPORT_TICKET"|"DOCUMENT"|"USER"|"FINANCE"|string;
type ReferenceOption={id:string;label:string;search:string};
type Props={type:ReferenceEntityType;value:string;onChange:(value:string)=>void;role:Role;required?:boolean;disabled?:boolean;placeholder?:string};

const cache=new Map<string,ReferenceOption[]>(),pending=new Map<string,Promise<ReferenceOption[]>>();
const text=(value:unknown)=>String(value??"").trim();
const option=(id:unknown,...parts:unknown[]):ReferenceOption=>{const label=parts.map(text).filter(Boolean).join(" · ")||"Registro sin nombre";return{id:text(id),label,search:label.toLocaleLowerCase("es")};};

async function load(type:string,role:Role):Promise<ReferenceOption[]>{
 const normalized=type==="SUPPORT_TICKET"?"SUPPORT":type,key=`${role}:${normalized}`;
 if(cache.has(key))return cache.get(key)!;
 if(pending.has(key))return pending.get(key)!;
 const request=(async()=>{
  if(normalized==="CLIENT"){const result=await clientsApi.list(role,new URLSearchParams({pageSize:"100"}));return result.items.map(item=>option(item.id,item.tradeName||item.legalName,item.rut));}
  if(normalized==="PROJECT"){const result=await operationsApi.projects(role);return result.items.map(item=>option(item.id,item.projectNumber,item.name,item.clientName));}
  if(normalized==="CONTRACT"){const result=await contractsApi.list(role,new URLSearchParams({pageSize:"100"}));return result.items.map(item=>option(item.id,item.contractNumber,item.name,item.clientName));}
  if(normalized==="QUOTE"){const result=await commercialApi.quotes(role);return result.items.map(item=>option(item.id,item.quoteNumber,item.companyName,item.status));}
  if(normalized==="WORK_ORDER"){const result=await operationsApi.workOrders(role);return result.items.map(item=>option(item.id,item.workOrderNumber,item.title,item.clientName));}
  if(normalized==="AUDIT"){const result=await auditsApi.audits(role);return result.items.map(item=>option(item.id,item.auditNumber,item.clientName||item.projectName,item.status));}
  if(normalized==="SUPPORT"){const result=await supportApi.tickets(role,"pageSize=100");return result.items.map(item=>option(item.id,item.ticketNumber,item.subject,item.clientName));}
  if(normalized==="DOCUMENT"){const result=await documentsApi.list(role,"pageSize=100");return result.items.map(item=>option(item.id,item.documentNumber,item.title));}
  if(normalized==="USER"){const result=await documentsApi.users(role);return result.filter(item=>item.active).map(item=>option(item.id,item.name,item.email,item.role));}
  return[];
 })().then(items=>items.filter(item=>item.id).sort((a,b)=>a.label.localeCompare(b.label,"es")).slice(0,200)).then(items=>{cache.set(key,items);return items;}).finally(()=>pending.delete(key));
 pending.set(key,request);return request;
}
export function EntityReferenceSelect({type,value,onChange,role,required=false,disabled=false,placeholder="Seleccionar registro"}:Props){
 const[items,setItems]=useState<ReferenceOption[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let active=true;if(!type){setItems([]);setError("");return()=>{active=false;};}setLoading(true);setError("");void load(type,role).then(result=>{if(active)setItems(result);}).catch(reason=>{if(active){setItems([]);setError(reason instanceof Error?reason.message:"No fue posible cargar el catálogo.");}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[type,role]);
 const selectedIsMissing=useMemo(()=>Boolean(value&&!items.some(item=>item.id===value)),[items,value]);
 return <span className="entityReferenceSelect"><select required={required} disabled={disabled||!type||loading} value={value} onChange={event=>onChange(event.target.value)} aria-label={placeholder}><option value="">{!type?"Selecciona primero el tipo":loading?"Cargando registros…":items.length?placeholder:"No hay registros disponibles"}</option>{selectedIsMissing?<option value={value}>Registro preseleccionado</option>:null}{items.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select>{error?<small role="alert">{error}</small>:null}</span>;
}

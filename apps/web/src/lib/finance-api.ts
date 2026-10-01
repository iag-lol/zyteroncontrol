import type { Role } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base=()=>process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api";
export class FinanceApiError extends Error { constructor(message:string,readonly status:number,readonly details:string[]=[]){super(message);} }
async function request<T>(role:Role,path:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(`${base()}${path}`,{...init,headers:await apiHeaders(role,init.headers),cache:"no-store"});
  if(!response.ok){let message=`Error ${response.status}`;let details:string[]=[];try{const data=await response.json() as{message?:string|string[]|{message?:string;missing?:string[];errors?:string[];blockers?:string[]};missing?:string[];errors?:string[];blockers?:string[]};const inner=typeof data.message==="object"&&!Array.isArray(data.message)?data.message:data;message=Array.isArray(data.message)?data.message.join(" "):typeof data.message==="string"?data.message:(inner as {message?:string}).message??message;details=[...((inner as {missing?:string[]}).missing??[]),...((inner as {errors?:string[]}).errors??[]),...((inner as {blockers?:string[]}).blockers??[])];}catch{/* respuesta sin JSON */}throw new FinanceApiError(message,response.status,details);}
  const type=response.headers.get("content-type")??"";return(type.includes("json")?response.json():response.text()) as Promise<T>;
}
const json=(method:string,value?:unknown,headers?:HeadersInit):RequestInit=>({method,body:value===undefined?undefined:JSON.stringify(value),headers});
export const financeApi={
  get:<T>(role:Role,path:string)=>request<T>(role,`/finance${path}`),
  post:<T>(role:Role,path:string,value:unknown={},headers?:HeadersInit)=>request<T>(role,`/finance${path}`,json("POST",value,headers)),
  patch:<T>(role:Role,path:string,value:unknown)=>request<T>(role,`/finance${path}`,json("PATCH",value)),
  put:<T>(role:Role,path:string,value:unknown)=>request<T>(role,`/finance${path}`,json("PUT",value)),
  del:<T>(role:Role,path:string)=>request<T>(role,`/finance${path}`,{method:"DELETE"}),
  /** Descarga autenticada (exportaciones auditadas, XML/PDF de DTE). */
  async download(role:Role,path:string){const response=await fetch(`${base()}/finance${path}`,{headers:await apiHeaders(role),cache:"no-store"});if(!response.ok){let message=`Error ${response.status}`;try{message=((await response.json()) as {message?:string}).message??message;}catch{/* binario */}throw new FinanceApiError(message,response.status);}const disposition=response.headers.get("content-disposition")??"";const name=decodeURIComponent(/filename="([^"]+)"/.exec(disposition)?.[1]??"zyteron-finanzas");const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);},
};
/** Portal de pago público (sin sesión): sólo token del link. */
export const publicPaymentApi={
  view:async(token:string)=>{const r=await fetch(`${base()}/public/payments/${encodeURIComponent(token)}`,{cache:"no-store"});if(!r.ok)throw new FinanceApiError(((await r.json().catch(()=>({}))) as {message?:string}).message??"Link inválido o vencido.",r.status);return r.json();},
  pay:async(token:string,formData:unknown,idempotencyKey:string)=>{const r=await fetch(`${base()}/public/payments/${encodeURIComponent(token)}/pay`,{method:"POST",headers:{"content-type":"application/json","idempotency-key":idempotencyKey},body:JSON.stringify({formData})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new FinanceApiError((data as {message?:string}).message??"No fue posible procesar el pago.",r.status);return data as {status:string;reference:string;message:string};},
};
export interface UploadedFile { fileName:string; contentBase64:string; mimeType:string; }
export async function fileToUpload(file:File):Promise<UploadedFile>{const buffer=await file.arrayBuffer();let binary="";const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return{fileName:file.name,contentBase64:btoa(binary),mimeType:file.type||"application/octet-stream"};}
export const errorText=(reason:unknown)=>reason instanceof FinanceApiError?[reason.message,...reason.details].join(" · "):reason instanceof Error?reason.message:"La acción no pudo completarse.";

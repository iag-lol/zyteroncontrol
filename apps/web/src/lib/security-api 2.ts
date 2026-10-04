import type { Role,SecurityWorkspace } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base=()=>process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api";
async function request<T>(role:Role,path:string,init:RequestInit={}){const response=await fetch(`${base()}${path}`,{...init,headers:await apiHeaders(role,init.headers),cache:"no-store"});if(!response.ok){let message=`Error ${response.status}`;try{const data=await response.json()as{message?:string|string[]};message=Array.isArray(data.message)?data.message.join(" "):data.message||message;}catch{/* respuesta segura no JSON */}throw new Error(message);}return response.json()as Promise<T>;}
const post=(value:unknown):RequestInit=>({method:"POST",body:JSON.stringify(value)});
export const securityApi={
  workspace:(role:Role)=>request<SecurityWorkspace>(role,"/security/workspace"),
  revokeSession:(role:Role,id:string,reason:string)=>request(role,`/security/sessions/${id}/revoke`,post({reason})),
  device:(role:Role,id:string,action:"trust"|"block"|"revoke",reason:string)=>request(role,`/security/devices/${id}/${action}`,post({reason})),
  decideAccess:(role:Role,id:string,approved:boolean,reason:string)=>request(role,`/security/access-requests/${id}/${approved?"approve":"reject"}`,post({reason})),
  acknowledgeEvent:(role:Role,id:string)=>request(role,`/security/events/${id}/acknowledge`,post({})),
  escalateEvent:(role:Role,id:string,value:unknown)=>request(role,`/security/events/${id}/escalate`,post(value)),
  changeIncident:(role:Role,id:string,status:string,reason:string)=>request(role,`/security/incidents/${id}/change-status`,post({status,reason})),
  evaluateGate:(role:Role,releaseReference:string,reason:string)=>request(role,"/security/gate/evaluate",post({releaseReference,reason})),
  createAccessRequest:(role:Role,value:unknown)=>request(role,"/security/access-requests",post(value)),
  createIncident:(role:Role,value:unknown)=>request(role,"/security/incidents",post(value)),
  createVulnerability:(role:Role,value:unknown)=>request(role,"/security/vulnerabilities",post(value)),
  createDataAsset:(role:Role,value:unknown)=>request(role,"/security/privacy/data-assets",post(value)),
  createSubjectRequest:(role:Role,value:unknown)=>request(role,"/security/privacy/subject-requests",post(value)),
};

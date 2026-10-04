import type { Role,SettingsWorkspace } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base=()=>process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api";
async function request<T>(role:Role,path:string,init:RequestInit={}){const response=await fetch(`${base()}${path}`,{...init,headers:await apiHeaders(role,init.headers),cache:"no-store"});if(!response.ok){let message=`Error ${response.status}`;try{const data=await response.json()as{message?:string|string[]};message=Array.isArray(data.message)?data.message.join(" "):data.message||message;}catch{/* safe non-json */}throw new Error(message);}return response.json()as Promise<T>;}
const body=(value:unknown):RequestInit=>({method:"POST",body:JSON.stringify(value)}),patch=(value:unknown):RequestInit=>({method:"PATCH",body:JSON.stringify(value)});
let cached:{role:Role;expiresAt:number;data:SettingsWorkspace}|null=null,pending:Promise<SettingsWorkspace>|null=null;
async function workspace(role:Role,force=false){if(!force&&cached?.role===role&&cached.expiresAt>Date.now())return cached.data;if(pending)return pending;pending=request<SettingsWorkspace>(role,"/settings/workspace").then(data=>(cached={role,data,expiresAt:Date.now()+10_000},data)).finally(()=>{pending=null;});return pending;}
const invalidate=()=>{cached=null;};
export const settingsApi={workspace,invalidate,
 change:(role:Role,namespace:string,key:string,value:unknown)=>request(role,`/settings/configuration/${namespace}/${key}`,patch(value)),rollback:(role:Role,id:string,value:unknown)=>request(role,`/settings/configuration/${id}/rollback`,body(value)),approve:(role:Role,id:string,value:unknown)=>request(role,`/settings/approvals/${id}/approve`,body(value)),
 createAutomation:(role:Role,value:unknown)=>request(role,"/settings/automations",body(value)),testAutomation:(role:Role,id:string,value:unknown)=>request(role,`/settings/automations/${id}/test`,body(value)),toggleAutomation:(role:Role,id:string,enabled:boolean,reason:string)=>request(role,`/settings/automations/${id}/${enabled?"enable":"disable"}`,body({reason})),
 createAlert:(role:Role,value:unknown)=>request(role,"/settings/alerts",body(value)),testAlert:(role:Role,id:string,value:unknown)=>request(role,`/settings/alerts/${id}/test`,body(value)),toggleAlert:(role:Role,id:string,enabled:boolean,reason:string)=>request(role,`/settings/alerts/${id}/${enabled?"enable":"disable"}`,body({reason})),
 configureIntegration:(role:Role,id:string,value:unknown)=>request(role,`/settings/integrations/${id}/configure`,body(value)),testIntegration:(role:Role,id:string)=>request(role,`/settings/integrations/${id}/test`,body({})),toggleIntegration:(role:Role,id:string,enabled:boolean,reason:string)=>request(role,`/settings/integrations/${id}/${enabled?"enable":"disable"}`,body({reason})),
 createWebhook:(role:Role,value:unknown)=>request(role,"/settings/webhooks",body(value)),testWebhook:(role:Role,id:string)=>request(role,`/settings/webhooks/${id}/test`,body({})),
 createFeature:(role:Role,value:unknown)=>request(role,"/settings/features",body(value)),toggleFeature:(role:Role,id:string,enabled:boolean,reason:string)=>request(role,`/settings/features/${id}/${enabled?"enable":"disable"}`,body({reason})),
 runDiagnostics:(role:Role)=>request(role,"/settings/diagnostics/run",body({})),runJob:(role:Role,id:string)=>request(role,`/settings/jobs/${id}/run`,body({})),toggleJob:(role:Role,id:string,enabled:boolean,reason:string)=>request(role,`/settings/jobs/${id}/${enabled?"enable":"disable"}`,body({reason})),
};

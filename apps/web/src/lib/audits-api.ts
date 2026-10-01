import type { AuditCheckResult, AuditEvidence, AuditFinding, AuditPlan, AuditReport, AuditRun, AuditTemplate, AuditWorkspace, RelatedAuditSnapshot, Role } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base=()=>process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api";
async function request<T>(role:Role,path:string,init:RequestInit={}){const response=await fetch(`${base()}${path}`,{...init,headers:await apiHeaders(role,init.headers),cache:"no-store"});if(!response.ok){let message=`Error ${response.status}`;try{const data=await response.json() as{message?:string|string[]};message=Array.isArray(data.message)?data.message.join(" "):data.message||message;}catch{/* non-json */}throw new Error(message);}return response.json() as Promise<T>;}
const body=(method:string,value:unknown,headers?:HeadersInit):RequestInit=>({method,body:JSON.stringify(value),headers});
type Page<T>={items:T[];page:number;pageSize:number;total:number;totalPages:number};
export interface AuditDetail { audit:AuditRun; checks:AuditCheckResult[]; findings:AuditFinding[]; evidence:AuditEvidence[]; remediations:unknown[]; retests:unknown[]; reports:AuditReport[]; activity:unknown[]; }

export const auditsApi={
  workspace:(role:Role)=>request<AuditWorkspace>(role,"/audits/workspace"),
  search:(role:Role,query:string)=>request<{audits:AuditRun[];findings:AuditFinding[]}>(role,`/audits/search?q=${encodeURIComponent(query)}`),
  projectSnapshot:(role:Role,id:string)=>request<RelatedAuditSnapshot>(role,`/projects/${id}/audits`),
  audits:(role:Role,query="")=>request<Page<AuditRun>>(role,`/audits${query?`?${query}`:""}`),
  plans:(role:Role)=>request<Page<AuditPlan>>(role,"/audits/plans?pageSize=100"),
  findings:(role:Role)=>request<Page<AuditFinding>>(role,"/findings?pageSize=100"),
  detail:(role:Role,id:string)=>request<AuditDetail>(role,`/audits/${id}`),
  templates:(role:Role)=>request<AuditTemplate[]>(role,"/audit-templates"),
  createPlan:(role:Role,value:unknown)=>request<AuditPlan>(role,"/audits/plans",body("POST",value)),
  updatePlan:(role:Role,id:string,value:unknown)=>request<AuditPlan>(role,`/audits/plans/${id}`,body("PATCH",value)),
  runPlan:(role:Role,id:string)=>request<AuditRun>(role,`/audits/plans/${id}/run-now`,body("POST",{}, {"idempotency-key":`manual-${id}-${Date.now()}`})),
  togglePlan:(role:Role,id:string,active:boolean)=>request<AuditPlan>(role,`/audits/plans/${id}/${active?"enable":"disable"}`,body("POST",{})),
  start:(role:Role,id:string)=>request<AuditRun>(role,`/audits/${id}/start`,body("POST",{})),
  submit:(role:Role,id:string)=>request<AuditRun>(role,`/audits/${id}/submit-review`,body("POST",{})),
  complete:(role:Role,id:string)=>request<AuditRun>(role,`/audits/${id}/complete`,body("POST",{})),
  check:(role:Role,auditId:string,checkId:string,value:unknown)=>request<AuditCheckResult>(role,`/audits/${auditId}/checks/${checkId}`,body("PATCH",value)),
  addEvidence:(role:Role,auditId:string,checkId:string|null,value:unknown)=>request<AuditEvidence>(role,checkId?`/audits/${auditId}/checks/${checkId}/evidence`:`/audits/${auditId}/evidence`,body("POST",value)),
  createFinding:(role:Role,auditId:string,checkId:string,value:unknown)=>request<AuditFinding>(role,`/audits/${auditId}/checks/${checkId}/create-finding`,body("POST",value)),
  updateFinding:(role:Role,id:string,value:unknown)=>request<AuditFinding>(role,`/findings/${id}`,body("PATCH",value)),
  assignFinding:(role:Role,id:string,userId:string)=>request<AuditFinding>(role,`/findings/${id}/assign`,body("POST",{userId})),
  remediation:(role:Role,id:string,value:unknown)=>request(role,`/findings/${id}/remediation`,body("POST",value)),
  createTask:(role:Role,id:string,value:unknown={})=>request(role,`/findings/${id}/create-task`,body("POST",value)),
  createBug:(role:Role,id:string,value:unknown={})=>request(role,`/findings/${id}/create-bug`,body("POST",value)),
  readyRetest:(role:Role,id:string)=>request(role,`/findings/${id}/ready-for-retest`,body("POST",{})),
  retest:(role:Role,id:string,value:unknown)=>request(role,`/findings/${id}/retests`,body("POST",value)),
  acceptRisk:(role:Role,id:string,value:unknown)=>request(role,`/findings/${id}/accept-risk`,body("POST",value)),
  closeFinding:(role:Role,id:string)=>request(role,`/findings/${id}/close`,body("POST",{})),
  generateReport:(role:Role,id:string,reportType:"INTERNAL"|"CLIENT")=>request<AuditReport>(role,`/audits/${id}/report/generate`,body("POST",{reportType})),
  approveReport:(role:Role,id:string)=>request<AuditReport>(role,`/audits/${id}/report/approve`,body("POST",{})),
  publishReport:(role:Role,id:string)=>request<AuditReport>(role,`/audits/${id}/report/publish`,body("POST",{})),
  createTemplate:(role:Role,value:unknown)=>request<AuditTemplate>(role,"/audit-templates",body("POST",value)),
};

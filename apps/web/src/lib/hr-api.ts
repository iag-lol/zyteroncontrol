import type { EmployeeDetail,HrWorkspace,Role } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";
const base=()=>process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api";
async function request<T>(role:Role,path:string,init:RequestInit={}){const response=await fetch(`${base()}${path}`,{...init,headers:await apiHeaders(role,init.headers),cache:"no-store"});if(!response.ok){let message=`Error ${response.status}`;try{const data=await response.json()as{message?:string|string[]};message=Array.isArray(data.message)?data.message.join(" "):data.message||message;}catch{/* respuesta no JSON */}throw new Error(message);}return response.json()as Promise<T>;}
const body=(value:unknown):RequestInit=>({method:"POST",body:JSON.stringify(value)});
export const hrApi={
 workspace:(role:Role)=>request<HrWorkspace>(role,"/hr/workspace"),employee:(role:Role,id:string)=>request<EmployeeDetail>(role,`/hr/employees/${id}`),
 createEmployee:(role:Role,value:unknown)=>request(role,"/hr/employees",body(value)),createDepartment:(role:Role,value:unknown)=>request(role,"/hr/organization/departments",body(value)),createTeam:(role:Role,value:unknown)=>request(role,"/hr/organization/teams",body(value)),createPosition:(role:Role,value:unknown)=>request(role,"/hr/organization/positions",body(value)),
 createLeave:(role:Role,value:unknown)=>request(role,"/hr/leave",body(value)),approveLeave:(role:Role,id:string)=>request(role,`/hr/leave/${id}/approve`,body({})),rejectLeave:(role:Role,id:string,reason:string)=>request(role,`/hr/leave/${id}/reject`,body({reason})),
 createPayroll:(role:Role,value:unknown)=>request(role,"/hr/payroll/periods",body(value)),createRequest:(role:Role,value:unknown)=>request(role,"/hr/workforce/requests",body(value)),
 reports:(role:Role)=>request<Record<string,unknown>>(role,"/hr/reports"),orgChart:(role:Role)=>request<Record<string,unknown>>(role,"/hr/organization/chart"),
};

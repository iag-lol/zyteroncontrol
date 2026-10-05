import type { ExecutiveDashboard, Role } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base=()=>process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api";
export async function executiveDashboard(role:Role):Promise<ExecutiveDashboard>{
  const response=await fetch(`${base()}/executive/dashboard`,{headers:await apiHeaders(role),cache:"no-store"});
  if(!response.ok){const payload=await response.json().catch(()=>({})) as {message?:string|string[]};const message=Array.isArray(payload.message)?payload.message.join(" "):payload.message;throw new Error(message||`No fue posible consolidar el resumen ejecutivo (${response.status}).`);}
  return response.json() as Promise<ExecutiveDashboard>;
}

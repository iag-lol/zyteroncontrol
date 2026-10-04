import type { Role } from "@zyteron/contracts";
import { browserSupabase } from "./auth-client";

export async function apiHeaders(role: Role, headers?: HeadersInit) {
  const result: Record<string, string> = { "content-type":"application/json", "x-request-id":crypto.randomUUID() };
  const development=process.env.NODE_ENV!=="production"&&process.env.NEXT_PUBLIC_AUTH_MODE==="development";
  if(development)result["x-zyteron-role"]=role;
  if (development&&process.env.NEXT_PUBLIC_DEV_USER_ID) result["x-zyteron-user-id"] = process.env.NEXT_PUBLIC_DEV_USER_ID;
  if(development&&process.env.NEXT_PUBLIC_DEV_AAL)result["x-zyteron-aal"]=process.env.NEXT_PUBLIC_DEV_AAL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof window !== "undefined" && url && key) {
    let deviceId=window.localStorage.getItem("zyteron_device_id");
    if(!deviceId){deviceId=crypto.randomUUID();window.localStorage.setItem("zyteron_device_id",deviceId);}
    result["x-zyteron-device-id"]=deviceId;
    const { data } = await browserSupabase()!.auth.getSession();
    if (data.session?.access_token) result.authorization = `Bearer ${data.session.access_token}`;
  }
  new Headers(headers).forEach((value,name)=>{result[name]=value;});
  return result;
}

import { Injectable,ServiceUnavailableException } from "@nestjs/common";
import { createServerSupabase } from "../domain/server-supabase.js";

export interface AuthorizationContext {
  userId:string;
  role:string;
  aal:"aal1"|"aal2";
  sessionId:string|null;
  deviceId:string|null;
  userAgent:string|null;
  ip:string|null;
}

const safeIp=(value:string|null)=>{
  if(!value)return null;
  if(value.includes(":"))return `${value.split(":").slice(0,4).join(":")}:…`;
  const parts=value.split(".");
  return parts.length===4?`${parts[0]}.${parts[1]}.x.x`:"redacted";
};
const browser=(ua:string|null)=>!ua?null:ua.includes("Edg/")?"Edge":ua.includes("Chrome/")?"Chrome":ua.includes("Firefox/")?"Firefox":ua.includes("Safari/")?"Safari":"Other";
const os=(ua:string|null)=>!ua?null:ua.includes("Windows")?"Windows":ua.includes("Mac OS")?"macOS":ua.includes("Android")?"Android":ua.includes("iPhone")||ua.includes("iPad")?"iOS":ua.includes("Linux")?"Linux":"Other";

@Injectable()
export class AuthorizationService {
  private readonly supabase=createServerSupabase();
  private readonly permissionCache=new Map<string,{expiresAt:number;values:Set<string>}>();
  private readonly permissionPending=new Map<string,Promise<Set<string>>>();
  private readonly observationCache=new Map<string,number>();
  private readonly observationPending=new Map<string,Promise<boolean>>();
  private readonly permissionTtl=this.duration("AUTH_PERMISSION_CACHE_MS",60_000,5_000,300_000);
  private readonly observationTtl=this.duration("AUTH_OBSERVATION_CACHE_MS",5_000,1_000,15_000);

  private duration(name:string,fallback:number,min:number,max:number){
    const parsed=Number(process.env[name]);
    return Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):fallback;
  }

  async hasPermissions(role:string,permissions:string[]){
    if(!permissions.length)return true;
    if(!this.supabase)return process.env.AUTH_MODE==="development"&&process.env.NODE_ENV!=="production";
    const cached=this.permissionCache.get(role);
    let granted=cached&&cached.expiresAt>Date.now()?cached.values:undefined;
    if(!granted){
      let pending=this.permissionPending.get(role);
      if(!pending){
        pending=(async()=>{
          const{data,error}=await this.supabase!.from("role_permissions").select("permission_code").eq("role",role);
          if(error)throw new ServiceUnavailableException("No fue posible validar los permisos de forma segura.");
          const values=new Set((data??[]).map(item=>String(item.permission_code)));
          this.permissionCache.set(role,{expiresAt:Date.now()+this.permissionTtl,values});
          return values;
        })().finally(()=>this.permissionPending.delete(role));
        this.permissionPending.set(role,pending);
      }
      granted=await pending;
    }
    return permissions.every(permission=>granted.has(permission));
  }

  async observe(context:AuthorizationContext){
    if(!this.supabase||!context.sessionId)return true;
    const key=`${context.sessionId}:${context.userId}:${context.deviceId??"none"}`;
    const cachedUntil=this.observationCache.get(key)??0;
    if(cachedUntil>Date.now())return true;
    const pending=this.observationPending.get(key);
    if(pending)return pending;
    const observation=this.observeFresh(context).then(allowed=>{
      if(allowed)this.observationCache.set(key,Date.now()+this.observationTtl);
      return allowed;
    }).finally(()=>this.observationPending.delete(key));
    this.observationPending.set(key,observation);
    return observation;
  }

  private async observeFresh(context:AuthorizationContext){
    if(!this.supabase||!context.sessionId)return true;
    const{data:session,error:sessionError}=await this.supabase.from("security_session_metadata").select("id,status").eq("session_id",context.sessionId).maybeSingle();
    if(sessionError)return false;
    if(session&&session.status!=="ACTIVE")return false;
    const stamp=new Date().toISOString();
    const observed={user_id:context.userId,role:context.role,device_id:context.deviceId,browser:browser(context.userAgent),os:os(context.userAgent),ip_masked:safeIp(context.ip),aal:context.aal,last_activity_at:stamp};
    if(session){
      // Never write status here: a concurrent administrative revocation must
      // not be reverted by ordinary request telemetry.
      const{data:updated,error:updateError}=await this.supabase.from("security_session_metadata").update(observed).eq("id",session.id).eq("status","ACTIVE").select("id").maybeSingle();
      if(updateError||!updated)return false;
    }else{
      const{error:insertError}=await this.supabase.from("security_session_metadata").insert({...observed,session_id:context.sessionId,status:"ACTIVE"});
      if(insertError){const{data:concurrent}=await this.supabase.from("security_session_metadata").select("status").eq("session_id",context.sessionId).maybeSingle();if(concurrent?.status!=="ACTIVE")return false;}
    }
    if(context.deviceId){
      const{data:known,error:deviceReadError}=await this.supabase.from("registered_devices").select("id,trust_status").eq("user_id",context.userId).eq("device_id",context.deviceId).maybeSingle();
      if(deviceReadError)return false;
      if(known?.trust_status==="BLOCKED"||known?.trust_status==="REVOKED")return false;
      const deviceObservation={browser:browser(context.userAgent),os:os(context.userAgent),last_seen:stamp};
      if(known){const{error:deviceError}=await this.supabase.from("registered_devices").update(deviceObservation).eq("id",known.id);if(deviceError)return false;}
      else{const{error:deviceError}=await this.supabase.from("registered_devices").insert({user_id:context.userId,device_id:context.deviceId,...deviceObservation,trust_status:"NEW"});if(deviceError){if(deviceError.code!=="23505")return false;const{data:concurrent}=await this.supabase.from("registered_devices").select("trust_status").eq("user_id",context.userId).eq("device_id",context.deviceId).maybeSingle();if(!concurrent||["BLOCKED","REVOKED"].includes(concurrent.trust_status))return false;}}
      if(!known){await this.supabase.from("security_events").insert({event_type:"NEW_DEVICE",severity:"MEDIUM",actor_user_id:context.userId,session_id:context.sessionId,ip_masked:safeIp(context.ip),device_id:context.deviceId,resource_type:"DEVICE",description:"Se observó un dispositivo no registrado.",metadata_safe:{browser:browser(context.userAgent),os:os(context.userAgent)}});}
    }
    return true;
  }
}

import { browserSupabase } from "./auth-client";

export function subscribeToSecurity(onChange:()=>void){
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return()=>undefined;
  const client=browserSupabase()!;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const notify=()=>{
    if(timer)clearTimeout(timer);
    timer=setTimeout(onChange,350);
  };
  const channel=client.channel("private:security:control-plane",{config:{private:true}});
  // Session/device telemetry is updated by every authenticated request. Listening
  // to it here caused request -> realtime -> request refresh loops. Administrative
  // actions refresh these views explicitly instead.
  for(const table of["security_events","security_incidents","access_requests","access_grants","security_vulnerabilities","production_security_gates"]){
    channel.on("postgres_changes",{event:"*",schema:"public",table},notify);
  }
  channel.subscribe();
  return()=>{if(timer)clearTimeout(timer);void client.removeChannel(channel);};
}

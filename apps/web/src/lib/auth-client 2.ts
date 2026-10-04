import { createClient,type SupabaseClient } from "@supabase/supabase-js";
let client:SupabaseClient|undefined;
export function developmentAuth(){return process.env.NODE_ENV!=="production"&&process.env.NEXT_PUBLIC_AUTH_MODE==="development";}
export function browserSupabase(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return undefined;client??=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}

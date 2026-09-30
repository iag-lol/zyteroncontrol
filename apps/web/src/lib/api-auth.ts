import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@zyteron/contracts";

let browserClient: SupabaseClient | undefined;

export async function apiHeaders(role: Role, headers?: HeadersInit) {
  const result: Record<string, string> = { "content-type":"application/json", "x-zyteron-role":role };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof window !== "undefined" && url && key) {
    browserClient ??= createClient(url,key);
    const { data } = await browserClient.auth.getSession();
    if (data.session?.access_token) result.authorization = `Bearer ${data.session.access_token}`;
  }
  new Headers(headers).forEach((value,name)=>{result[name]=value;});
  return result;
}

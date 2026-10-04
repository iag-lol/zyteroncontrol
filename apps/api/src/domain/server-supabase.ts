import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | undefined;
let serverUrl: string | undefined;
let serverServiceRole: string | undefined;

export function createServerSupabase(): SupabaseClient | undefined {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRole) return undefined;
  if (!serverClient || serverUrl !== url || serverServiceRole !== serviceRole) {
    serverClient = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    serverUrl = url;
    serverServiceRole = serviceRole;
  }
  return serverClient;
}

export function pageBounds(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function pagination(input: Record<string, string | undefined>) {
  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize) || 25));
  return { page, pageSize };
}

export function cleanSearch(value?: string) {
  return value?.trim().replace(/[,()]/g, " ") || undefined;
}

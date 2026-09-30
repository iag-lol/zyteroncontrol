import { createClient } from "@supabase/supabase-js";

export function subscribeToClient(clientId: string, onChange: () => void) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return () => undefined;

  const supabase = createClient(url, anonKey);
  const channel = supabase.channel(`private:client:${clientId}`, { config: { private: true } })
    .on("postgres_changes", { event: "*", schema: "public", table: "clients", filter: `id=eq.${clientId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "client_contacts", filter: `client_id=eq.${clientId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "client_contracts", filter: `client_id=eq.${clientId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "client_services", filter: `client_id=eq.${clientId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "client_renewals", filter: `client_id=eq.${clientId}` }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_events", filter: `client_id=eq.${clientId}` }, onChange)
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}

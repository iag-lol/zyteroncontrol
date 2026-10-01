import { createClient } from "@supabase/supabase-js";

export function subscribeToCommercial(onChange: () => void) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return () => undefined;

  const supabase = createClient(url, anonKey);
  const channel = supabase.channel("private:commercial:operations", { config: { private: true } });
  for (const table of ["leads", "opportunities", "follow_ups", "quotes", "sales", "sales_handoffs"]) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
}

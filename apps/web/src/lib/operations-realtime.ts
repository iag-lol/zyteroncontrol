import { createClient } from "@supabase/supabase-js";

export function subscribeToOperations(onChange: () => void) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return () => undefined;
  const client = createClient(url, anonKey);
  const channel = client.channel("private:delivery:operations", { config: { private: true } });
  for (const table of ["work_orders", "projects", "project_milestones", "tasks", "work_logs", "project_deliverables", "deployments"]) channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  channel.subscribe();
  return () => { void client.removeChannel(channel); };
}

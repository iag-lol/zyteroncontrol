import { createClient } from "@supabase/supabase-js";

export const monitoringRealtimeTables = ["monitors", "incidents", "incident_events", "maintenance_windows", "monitoring_events", "alert_delivery_events"] as const;
export type MonitoringLiveMode = "realtime" | "polling";

export function monitoringRealtimeConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }

/**
 * Canal privado de Supabase Realtime. La sesión del usuario viaja con el socket y las políticas RLS de la
 * migración (can_view_monitoring_project / destinatario de la alerta) deciden qué cambios recibe.
 * Sin Supabase configurado se usa sondeo explícito; la UI lo informa en vez de fingir tiempo real.
 */
export function subscribeToMonitoring(onChange: (table: string) => void, pollMs = 30_000): { mode: MonitoringLiveMode; unsubscribe: () => void } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const timer = window.setInterval(() => onChange("poll"), pollMs);
    return { mode: "polling", unsubscribe: () => window.clearInterval(timer) };
  }
  const client = createClient(url, anonKey);
  const channel = client.channel("private:monitoring:reliability", { config: { private: true } });
  for (const table of monitoringRealtimeTables) channel.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange(table));
  void client.auth.getSession().then(({ data }) => { if (data.session?.access_token) client.realtime.setAuth(data.session.access_token); channel.subscribe(); });
  return { mode: "realtime", unsubscribe: () => { void client.removeChannel(channel); } };
}

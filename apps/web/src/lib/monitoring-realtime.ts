import { browserSupabase } from "./auth-client";

export const monitoringRealtimeTables = ["monitors", "incidents", "incident_events", "maintenance_windows", "monitoring_events", "alert_delivery_events"] as const;
export type MonitoringLiveMode = "connecting" | "realtime" | "reconnecting" | "error" | "polling";

export function monitoringRealtimeConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }

/**
 * Canal privado de Supabase Realtime. La sesión del usuario viaja con el socket y las políticas RLS de la
 * migración (can_view_monitoring_project / destinatario de la alerta) deciden qué cambios recibe.
 * Sin Supabase configurado se usa sondeo explícito; la UI lo informa en vez de fingir tiempo real.
 */
export function subscribeToMonitoring(
  onChange: (table: string) => void,
  onStatusOrPollMs?: ((mode: MonitoringLiveMode) => void) | number,
  requestedPollMs = 30_000,
): { mode: MonitoringLiveMode; unsubscribe: () => void } {
  const onStatus = typeof onStatusOrPollMs === "function" ? onStatusOrPollMs : () => undefined;
  const pollMs = typeof onStatusOrPollMs === "number" ? onStatusOrPollMs : requestedPollMs;
  const client = browserSupabase();
  let pollTimer: number | null = null;
  let stopped = false;
  const setMode = (mode: MonitoringLiveMode) => { if (!stopped) onStatus(mode); };
  const startPolling = (mode: MonitoringLiveMode) => {
    setMode(mode);
    if (pollTimer === null) pollTimer = window.setInterval(() => onChange("poll"), pollMs);
  };
  const stopPolling = () => { if (pollTimer !== null) window.clearInterval(pollTimer); pollTimer = null; };
  if (!client) {
    startPolling("polling");
    return { mode: "polling", unsubscribe: () => { stopped = true; stopPolling(); } };
  }
  const channel = client.channel("private:monitoring:reliability", { config: { private: true } });
  for (const table of monitoringRealtimeTables) channel.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange(table));
  setMode("connecting");
  void client.auth.getSession().then(({ data }) => {
    if (stopped) return;
    if (!data.session?.access_token) { startPolling("error"); return; }
    client.realtime.setAuth(data.session.access_token);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") { stopPolling(); setMode("realtime"); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") startPolling("reconnecting");
      else if (status === "CLOSED") startPolling("error");
    });
  }).catch(() => startPolling("error"));
  return { mode: "connecting", unsubscribe: () => { stopped = true; stopPolling(); void client.removeChannel(channel); } };
}

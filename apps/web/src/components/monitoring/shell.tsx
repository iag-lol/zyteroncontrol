"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AlertDelivery, MonitoringScope, MonitorStatus } from "@zyteron/contracts/monitoring";
import { Activity, Bell, BellOff, Gauge, History, LayoutGrid, ListChecks, Radio, ShieldCheck, Siren, TrendingUp, Volume2, VolumeX, Wrench } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { canAccessGroup } from "@/lib/access-control";
import { monitoringApi } from "@/lib/monitoring-api";
import { formatDateTime, formatTime, monitorStatusLabel } from "@/lib/monitoring-format";
import { Empty, LiveProvider, useLive, useMonitoringQuery } from "./ui";

const ScopeContext = createContext<MonitoringScope | null>(null);
export const useScope = () => useContext(ScopeContext);
export const can = (scope: MonitoringScope | null, permission: string) => Boolean(scope?.permissions.includes(permission));

export const monitoringSections = [
  { id: "command", href: "/monitoring", label: "Command Center", icon: Gauge },
  { id: "sites", href: "/monitoring/websites", label: "Sitios", icon: LayoutGrid },
  { id: "live", href: "/monitoring/live", label: "En vivo", icon: Radio },
  { id: "incidents", href: "/monitoring/incidents", label: "Incidentes", icon: Siren },
  { id: "uptime", href: "/monitoring/uptime", label: "Uptime", icon: Activity },
  { id: "performance", href: "/monitoring/performance", label: "Rendimiento", icon: TrendingUp },
  { id: "ssl", href: "/monitoring/ssl", label: "SSL / TLS", icon: ShieldCheck },
  { id: "maintenance", href: "/monitoring/maintenance", label: "Mantenimiento", icon: Wrench },
  { id: "alert-rules", href: "/monitoring/alert-rules", label: "Reglas de alerta", icon: ListChecks },
  { id: "history", href: "/monitoring/history", label: "Historial", icon: History },
] as const;
export type MonitoringSectionId = (typeof monitoringSections)[number]["id"] | "endpoint" | "incident";

const order: MonitorStatus[] = ["OFFLINE", "DEGRADED", "MAINTENANCE", "ONLINE", "UNKNOWN", "DISABLED"];
const stripColor: Record<MonitorStatus, string> = { ONLINE: "var(--st-online)", DEGRADED: "var(--st-degraded)", OFFLINE: "var(--st-offline)", MAINTENANCE: "var(--st-maint)", UNKNOWN: "var(--st-unknown)", DISABLED: "var(--st-disabled)" };

export function MonitoringShell({ section, title, subtitle, actions, children }: { section: MonitoringSectionId; title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  const { role } = useAccess();
  if (!canAccessGroup(role, "monitoring")) return <main className="relShell"><Empty title="Acceso restringido" text="Tu rol no tiene acceso al Site Reliability Center." icon={BellOff} /></main>;
  return <LiveProvider><ScopeLoader><Frame section={section} title={title} subtitle={subtitle} actions={actions}>{children}</Frame></ScopeLoader></LiveProvider>;
}

function ScopeLoader({ children }: { children: ReactNode }) {
  const { role } = useAccess();
  const [scope, setScope] = useState<MonitoringScope | null>(null);
  useEffect(() => { let alive = true; monitoringApi.me(role).then((value) => { if (alive) setScope(value); }).catch(() => { if (alive) setScope({ role, scope: "OWN", permissions: [] }); }); return () => { alive = false; }; }, [role]);
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

function Frame({ section, title, subtitle, actions, children }: { section: MonitoringSectionId; title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  const { role } = useAccess();
  const live = useLive();
  const scope = useScope();
  const board = useMonitoringQuery(() => monitoringApi.status(role), [role]);
  const openIncidents = useMonitoringQuery(() => monitoringApi.incidents(role, { state: "open", pageSize: 1 }), [role]);
  const monitors = board.data?.monitors ?? [];
  const counts = order.map((status) => [status, monitors.filter((monitor) => monitor.status === status).length] as const);
  const offline = counts.find(([status]) => status === "OFFLINE")![1], degraded = counts.find(([status]) => status === "DEGRADED")![1];
  const headline = !monitors.length ? "Sin endpoints monitoreados" : offline ? `${offline} ${offline === 1 ? "endpoint fuera" : "endpoints fuera"} de servicio` : degraded ? `${degraded} con degradación` : "Todos los servicios operativos";
  const activeSection = section === "endpoint" ? "sites" : section === "incident" ? "incidents" : section;
  return <main className="relShell">
    <header className="relHead">
      <div><small><Radio size={12} aria-hidden />Monitoreo · Site Reliability Center</small><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="relHeadActions">
        <span className="relLive" title={live.mode === "realtime" ? "Supabase Realtime conectado con canal privado" : "Estado real del canal de actualización"}><i className={`relPulse ${live.mode}`} aria-hidden />{{ connecting: "Conectando…", realtime: "En vivo", reconnecting: "Reconectando · sondeo", error: "Canal no disponible · sondeo", polling: "Sondeo cada 30 s" }[live.mode]}{live.lastChange ? ` · ${formatTime(live.lastChange)}` : ""}</span>
        {scope && can(scope, "monitoring.dashboard.view") ? <AlertInbox /> : null}
        {actions}
      </div>
    </header>
    <section className="relStrip" aria-label="Franja de estado operacional">
      <div className="relStripHeadline"><i style={{ background: offline ? "var(--st-offline-bg)" : degraded ? "var(--st-degraded-bg)" : "var(--st-online-bg)", color: offline ? "var(--st-offline)" : degraded ? "var(--st-degraded)" : "var(--st-online)" }}><Activity size={18} aria-hidden /></i><span>{board.loading && !board.data ? "Sincronizando estado…" : headline}</span></div>
      <div style={{ display: "grid", gap: 7 }}>
        <div className="relStripBar" role="img" aria-label={counts.map(([status, count]) => `${monitorStatusLabel[status]}: ${count}`).join(", ")}>{counts.filter(([, count]) => count).map(([status, count]) => <span key={status} style={{ flex: count, background: stripColor[status] }} />)}</div>
        <div className="relStripLegend">{counts.map(([status, count]) => <span key={status}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: stripColor[status], marginRight: 5 }} aria-hidden />{monitorStatusLabel[status]} <b>{count}</b></span>)}</div>
      </div>
      <Link className="relBtn small" href="/monitoring/incidents?state=open"><Siren size={13} aria-hidden />{openIncidents.data?.total ?? 0} incidentes abiertos</Link>
    </section>
    <nav className="relTabs" aria-label="Secciones de monitoreo">{monitoringSections.map((item) => { const Icon = item.icon; return <Link key={item.id} href={item.href} className={activeSection === item.id ? "active" : ""} aria-current={activeSection === item.id ? "page" : undefined}><Icon size={13} aria-hidden />{item.label}{item.id === "incidents" && openIncidents.data?.total ? <b>{openIncidents.data.total}</b> : null}</Link>; })}</nav>
    {children}
  </main>;
}

// ------------------------------------------------------------------ bandeja de alertas + sonido
function readSoundPreference() { try { return window.localStorage.getItem("zyteron.monitoring.sound") === "on"; } catch { return false; } }
function writeSoundPreference(value: boolean) { try { window.localStorage.setItem("zyteron.monitoring.sound", value ? "on" : "off"); } catch { /* almacenamiento bloqueado */ } }

/** Tono generado con Web Audio; sólo suena tras un gesto explícito del usuario (política de autoplay). */
function playTone(context: AudioContext, profile: AlertDelivery["soundProfile"]) {
  if (profile === "SILENT" || context.state !== "running") return;
  const notes = profile === "URGENT" ? [880, 660, 880, 660] : [660];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator(), gain = context.createGain(), start = context.currentTime + index * 0.18;
    oscillator.frequency.value = frequency; oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(gain).connect(context.destination); oscillator.start(start); oscillator.stop(start + 0.17);
  });
}

export function AlertInbox() {
  const { role } = useAccess();
  const alerts = useMonitoringQuery(() => monitoringApi.alerts(role), [role]);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => { setSound(readSoundPreference()); }, []);
  useEffect(() => {
    if (!alerts.data) return;
    const ids = new Set(alerts.data.map((alert) => alert.id));
    if (seen.current && sound && audio.current) {
      const fresh = alerts.data.filter((alert) => !seen.current!.has(alert.id) && !alert.readAt);
      const profile = fresh.some((alert) => alert.soundProfile === "URGENT") ? "URGENT" : fresh.some((alert) => alert.soundProfile === "DEFAULT") ? "DEFAULT" : null;
      if (profile) playTone(audio.current, profile);
    }
    seen.current = ids;
  }, [alerts.data, sound]);
  const toggleSound = async () => {
    const next = !sound;
    if (next) { audio.current ??= new AudioContext(); await audio.current.resume().catch(() => undefined); playTone(audio.current, "DEFAULT"); }
    setSound(next); writeSoundPreference(next);
  };
  const unread = (alerts.data ?? []).filter((alert) => !alert.readAt);
  return <div className="relInbox">
    <button className="relBtn" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={`Alertas de monitoreo: ${unread.length} sin leer`}><Bell size={14} aria-hidden />{unread.length ? <b style={{ color: "var(--st-offline)" }}>{unread.length}</b> : null}</button>
    {open ? <div className="relInboxPanel" role="dialog" aria-label="Alertas de monitoreo">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 12 }}>Mis alertas</strong>
        <button className="relBtn small" onClick={() => void toggleSound()} aria-pressed={sound} title="El navegador sólo permite audio después de habilitarlo con un clic.">{sound ? <Volume2 size={13} aria-hidden /> : <VolumeX size={13} aria-hidden />}{sound ? "Sonido activo" : "Activar sonido"}</button>
      </div>
      {!alerts.data?.length ? <Empty title="Sin alertas" text="No tienes alertas de monitoreo registradas." /> : alerts.data.map((alert) => <article key={alert.id} className={alert.readAt ? "" : "unread"}>
        <a href={alert.href ?? "/monitoring"} onClick={() => { if (!alert.readAt) void monitoringApi.readAlert(role, alert.id).then(() => alerts.reload()); }}>{alert.title}</a>
        {alert.body ? <span>{alert.body}</span> : null}
        <small>{formatDateTime(alert.createdAt)} · {alert.eventType.replaceAll("_", " ").toLowerCase()}{alert.soundProfile === "URGENT" ? " · urgente" : ""}</small>
      </article>)}
    </div> : null}
  </div>;
}

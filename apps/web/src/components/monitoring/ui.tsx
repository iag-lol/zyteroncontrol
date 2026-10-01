"use client";

import "@/app/monitoring.css";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { IncidentSeverity, IncidentStatus, MonitorStatus, SslStatus } from "@zyteron/contracts/monitoring";
import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDashed, CircleHelp, CirclePause, PowerOff, ShieldAlert, ShieldCheck, ShieldX, Wrench, X } from "lucide-react";
import { incidentStatusLabel, monitorStatusLabel, severityLabel, sslStatusLabel } from "@/lib/monitoring-format";
import { subscribeToMonitoring, type MonitoringLiveMode } from "@/lib/monitoring-realtime";

const statusIcon: Record<MonitorStatus, typeof CheckCircle2> = { ONLINE: CheckCircle2, DEGRADED: AlertTriangle, OFFLINE: AlertOctagon, MAINTENANCE: Wrench, UNKNOWN: CircleHelp, DISABLED: PowerOff };

/** Estado del endpoint: ícono + texto; el color nunca es el único canal. */
export function StatusPill({ status, compact = false }: { status: MonitorStatus; compact?: boolean }) {
  const Icon = statusIcon[status];
  return <span className={`relStatus ${status}`} role="status"><Icon size={12} aria-hidden />{compact ? null : monitorStatusLabel[status]}{compact ? <span className="srOnly">{monitorStatusLabel[status]}</span> : null}</span>;
}
export function SeverityBadge({ severity }: { severity: IncidentSeverity }) { return <span className={`relSev ${severity}`}><ShieldAlert size={11} aria-hidden />{severityLabel[severity]}</span>; }
export function IncidentStatusChip({ status }: { status: IncidentStatus }) {
  const Icon = ["RESOLVED", "CLOSED"].includes(status) ? CheckCircle2 : status === "MONITORING" ? CirclePause : CircleDashed;
  return <span className="relChip"><Icon size={11} aria-hidden />{incidentStatusLabel[status]}</span>;
}
export function SslChip({ status }: { status: SslStatus }) {
  const Icon = status === "HEALTHY" ? ShieldCheck : status === "UNKNOWN" || status === "NOT_APPLICABLE" ? CircleHelp : ShieldX;
  const tone = status === "HEALTHY" ? "ONLINE" : status === "EXPIRING_SOON" ? "DEGRADED" : status === "EXPIRED" || status === "INVALID" ? "OFFLINE" : "UNKNOWN";
  return <span className={`relStatus ${tone}`}><Icon size={12} aria-hidden />{sslStatusLabel[status]}</span>;
}

export function Panel({ title, icon: Icon, count, actions, children, className = "" }: { title: string; icon?: typeof CheckCircle2; count?: number; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`relPanel ${className}`}><header>{Icon ? <Icon size={16} aria-hidden /> : null}<h2>{title}</h2>{actions ? <div className="relPanelActions">{actions}</div> : count !== undefined ? <span className="relCount">{count}</span> : null}</header>{children}</section>;
}
export function Empty({ title, text, icon: Icon = CheckCircle2 }: { title: string; text?: string; icon?: typeof CheckCircle2 }) { return <div className="relEmpty"><Icon size={26} aria-hidden /><strong>{title}</strong>{text ? <p>{text}</p> : null}</div>; }
export function Loading({ height = 120, label = "Cargando datos de monitoreo…" }: { height?: number; label?: string }) { return <div className="relSkeleton" style={{ height }} role="status" aria-label={label} />; }
export function ErrorBox({ error, retry }: { error: string; retry?: () => void }) { return <div className="relAlert error" role="alert"><AlertTriangle size={15} aria-hidden />{error}{retry ? <button className="relBtn small" style={{ marginLeft: "auto" }} onClick={retry}>Reintentar</button> : null}</div>; }
export function Notice({ tone, text, onClose }: { tone: "success" | "error" | "info"; text: string; onClose?: () => void }) { return <div className={`relAlert ${tone}`} role={tone === "error" ? "alert" : "status"}>{text}{onClose ? <button onClick={onClose} aria-label="Cerrar aviso">×</button> : null}</div>; }

export function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
  return <div className="relModal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><small className="relMuted" style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase" }}>{eyebrow ?? "Monitoreo"}</small><button className="relBtn small" onClick={onClose} aria-label="Cerrar"><X size={14} /></button></div><h2>{title}</h2>{children}</div></div>;
}

// ------------------------------------------------------------------ canal en vivo
interface LiveState { version: number; mode: MonitoringLiveMode; lastChange: string | null }
const LiveContext = createContext<LiveState>({ version: 0, mode: "polling", lastChange: null });
export const useLive = () => useContext(LiveContext);

/** Una sola suscripción por pantalla; agrupa ráfagas de cambios (debounce) para no recargar en cada check. */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveState>({ version: 0, mode: "polling", lastChange: null });
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const { mode, unsubscribe } = subscribeToMonitoring(() => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState((current) => ({ ...current, version: current.version + 1, lastChange: new Date().toISOString() })), 1200);
    });
    setState((current) => ({ ...current, mode }));
    return () => { unsubscribe(); if (timer.current) window.clearTimeout(timer.current); };
  }, []);
  return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}

/** Carga con estados loading/error y recarga automática ante cambios en vivo. */
export function useMonitoringQuery<T>(loader: () => Promise<T>, deps: unknown[]) {
  const { version } = useLive();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setData(await loaderRef.current()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar la información."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, deps);
  useEffect(() => { if (version) void load(true); }, [version, load]);
  return { data, error, loading, reload: () => load(true), setData };
}

/** Ejecuta una acción mostrando éxito/error y recargando la vista. */
export function useAction(reload?: () => Promise<unknown> | void) {
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (message: string, action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); setNotice({ tone: "success", text: message }); await reload?.(); return true; }
    catch (cause) { setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "La acción no pudo completarse." }); return false; }
    finally { setBusy(false); }
  }, [reload]);
  return { notice, setNotice, busy, run };
}


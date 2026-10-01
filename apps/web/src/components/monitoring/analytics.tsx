"use client";

import Link from "next/link";
import { useState } from "react";
import type { SslStatus } from "@zyteron/contracts/monitoring";
import { Activity, Download, Gauge, History, ShieldCheck, Timer, TrendingUp } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { monitoringApi } from "@/lib/monitoring-api";
import { environmentLabel, formatDate, formatDateTime, formatMs, formatPercent, optionalSantiagoIso, sslStatusLabel } from "@/lib/monitoring-format";
import { LatencyChart, SERIES, UptimeBars, UptimeLegend, UptimeTable } from "./charts";
import { EventStream } from "./command-center";
import { can, MonitoringShell, useScope } from "./shell";
import { Empty, ErrorBox, Loading, Panel, SslChip, useMonitoringQuery } from "./ui";

const periods = [["24h", "24 h"], ["7d", "7 días"], ["30d", "30 días"], ["90d", "90 días"]] as const;

export function UptimePage() { return <MonitoringShell section="uptime" title="Uptime" subtitle="Disponibilidad medida por checks reales. Fórmula: checks exitosos / checks evaluados por período."><UptimeBody /></MonitoringShell>; }

function UptimeBody() {
  const { role } = useAccess();
  const scope = useScope();
  const [period, setPeriod] = useState<(typeof periods)[number][0]>("30d");
  const [error, setError] = useState("");
  const query = useMonitoringQuery(() => monitoringApi.uptime(role, { period }), [role, period]);
  const data = query.data;
  const count = period === "24h" ? 24 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const key = period === "24h" ? "uptime24h" : period === "7d" ? "uptime7d" : period === "30d" ? "uptime30d" : "uptime90d";
  return <>
    {error ? <ErrorBox error={error} /> : null}
    <div className="relFilters"><div className="relTabs" style={{ margin: 0 }} role="tablist" aria-label="Período">{periods.map(([value, text]) => <a key={value} role="tab" aria-selected={period === value} className={period === value ? "active" : ""} href="#" onClick={(event) => { event.preventDefault(); setPeriod(value); }}>{text}</a>)}</div>
      {data ? <span className="relChip">Mantenimiento {data.maintenancePolicy === "EXCLUDE" ? "excluido del cálculo" : "incluido en el cálculo"}</span> : null}
      {data && period === "90d" ? <span className="relChip">Agregados diarios · retención {data.retention.dailyDays} días</span> : null}
      {can(scope, "monitoring.export") ? <button className="relBtn" style={{ marginLeft: "auto" }} onClick={() => void monitoringApi.download(role, "uptime", { period }).catch((cause: Error) => setError(cause.message))}><Download size={13} aria-hidden />Exportar CSV</button> : null}
    </div>
    {query.loading && !data ? <Loading height={320} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : !data?.monitors.length ? <Empty title="Este alcance todavía no posee endpoints monitoreados." icon={Activity} /> : <>
      <Panel title={`Disponibilidad por ${period === "24h" ? "hora" : "día"}`} icon={Activity} count={data.monitors.length}>
        <div style={{ display: "grid", gap: 16 }}>{data.monitors.map((monitor) => {
          const value = data.fleet[monitor.id]?.[key] ?? null;
          const firstDay = data.fleet[monitor.id]?.firstDay;
          return <div key={monitor.id} style={{ display: "grid", gridTemplateColumns: "minmax(170px,240px) 1fr 90px", gap: 14, alignItems: "center" }}>
            <div><Link href={`/monitoring/endpoints/${monitor.endpointId}`} style={{ fontWeight: 800, color: "inherit", fontSize: 12 }}>{monitor.endpointName}</Link><br /><small className="relMuted">{monitor.clientName ?? "Sin cliente"} · {environmentLabel[monitor.environment] ?? monitor.environment}</small></div>
            <UptimeBars buckets={data.buckets[monitor.id] ?? []} granularity={data.granularity} count={count} incidents={data.incidents.filter((incident) => incident.monitorId === monitor.id)} label={`Uptime de ${monitor.endpointName}`} />
            <div style={{ textAlign: "right" }}><strong className="relMono">{formatPercent(value, 2)}</strong><br /><small className="relMuted">{firstDay && new Date(firstDay).getTime() > Date.now() - count * (period === "24h" ? 3_600_000 : 86_400_000) ? `datos desde ${formatDate(firstDay)}` : ""}</small></div>
          </div>;
        })}</div>
        <UptimeLegend />
      </Panel>
      <Panel title="Incidentes del período" icon={Gauge} count={data.incidents.length}>{data.incidents.length ? <div className="relTableWrap"><table className="relTable"><thead><tr><th>Incidente</th><th>Endpoint</th><th>Confirmado</th><th>Recuperado</th><th className="num">Downtime</th></tr></thead><tbody>{data.incidents.map((incident) => <tr key={incident.id}><td><Link href={`/monitoring/incidents/${incident.id}`}>{incident.incidentNumber}</Link></td><td>{incident.endpointName}</td><td>{formatDateTime(incident.confirmedAt)}</td><td>{formatDateTime(incident.recoveredAt)}</td><td className="num">{incident.downtimeSeconds !== null ? `${Math.round(incident.downtimeSeconds / 60)} min` : "—"}</td></tr>)}</tbody></table></div> : <Empty title="Sin incidentes en el período." />}</Panel>
      {data.monitors.length === 1 ? <UptimeTable buckets={data.buckets[data.monitors[0]!.id] ?? []} granularity={data.granularity} /> : null}
    </>}
  </>;
}

export function PerformancePage() { return <MonitoringShell section="performance" title="Rendimiento" subtitle="Tiempo de respuesta hasta las cabeceras de la respuesta final (incluye redirects). Sólo respuestas exitosas."><PerformanceBody /></MonitoringShell>; }

function PerformanceBody() {
  const { role } = useAccess();
  const [period, setPeriod] = useState<"24h" | "7d">("24h");
  const [selected, setSelected] = useState("");
  const query = useMonitoringQuery(() => monitoringApi.performance(role, { period }), [role, period]);
  const data = query.data;
  const focus = data?.monitors.find((monitor) => monitor.id === selected) ?? data?.slowest[0]?.monitor ?? data?.monitors[0];
  return <>
    <div className="relFilters"><div className="relTabs" style={{ margin: 0 }} role="tablist">{(["24h", "7d"] as const).map((value) => <a key={value} role="tab" aria-selected={period === value} className={period === value ? "active" : ""} href="#" onClick={(event) => { event.preventDefault(); setPeriod(value); }}>{value === "24h" ? "24 h" : "7 días"}</a>)}</div>
      {data?.monitors.length ? <label>Endpoint<select value={focus?.id ?? ""} onChange={(event) => setSelected(event.target.value)}>{data.monitors.map((monitor) => <option key={monitor.id} value={monitor.id}>{monitor.endpointName} · {monitor.projectName}</option>)}</select></label> : null}
    </div>
    {query.loading && !data ? <Loading height={320} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : !data?.monitors.length ? <Empty title="Este alcance todavía no posee endpoints monitoreados." icon={Timer} /> : <div className="relGrid command">
      <Panel title={`Tendencia · ${focus?.endpointName ?? ""}`} icon={TrendingUp}>{focus ? <LatencyChart buckets={data.buckets[focus.id] ?? []} granularity={period === "24h" ? "hour" : "day"} /> : null}</Panel>
      <Panel title="Endpoints más lentos (p95)" icon={Timer} count={data.slowest.length}>{data.slowest.length ? <div className="relTableWrap"><table className="relTable"><thead><tr><th>Endpoint</th><th className="num">Prom.</th><th className="num">p50</th><th className="num">p95</th><th className="num">Muestras</th></tr></thead><tbody>
        {data.slowest.map(({ monitor, latency }) => { const max = Math.max(...data.slowest.map((item) => item.latency.p95 ?? item.latency.avg ?? 0)) || 1; const value = latency.p95 ?? latency.avg ?? 0; return <tr key={monitor.id}><td><button className="relBtn small" style={{ border: 0, padding: 0, minHeight: 0, background: "none" }} onClick={() => setSelected(monitor.id)}>{monitor.endpointName}</button><div style={{ height: 4, borderRadius: 4, marginTop: 4, background: "#e7ece9" }}><div style={{ width: `${(value / max) * 100}%`, height: 4, borderRadius: 4, background: SERIES.p95 }} /></div></td><td className="num">{formatMs(latency.avg)}</td><td className="num">{formatMs(latency.p50)}</td><td className="num">{formatMs(latency.p95)}</td><td className="num">{latency.samples}</td></tr>; })}
      </tbody></table></div> : <Empty title="Sin respuestas exitosas en el período." text="Las latencias se calculan sólo con checks exitosos." />}<small className="relMuted">p50 requiere ≥ 5 muestras y p95 ≥ 20.</small></Panel>
    </div>}
  </>;
}

export function SslPage() { return <MonitoringShell section="ssl" title="Certificate Control" subtitle="Certificados TLS observados por el worker: emisor, vigencia y días restantes, ordenados por urgencia."><SslBody /></MonitoringShell>; }

const lanes: Array<[SslStatus, string]> = [["HEALTHY", "Saludables"], ["EXPIRING_SOON", "Por vencer"], ["EXPIRED", "Vencidos"], ["INVALID", "Inválidos"], ["UNKNOWN", "Desconocidos"]];
const ringColor: Record<SslStatus, string> = { HEALTHY: "var(--st-online)", EXPIRING_SOON: "var(--st-degraded)", EXPIRED: "var(--st-offline)", INVALID: "var(--st-offline)", UNKNOWN: "var(--st-unknown)", NOT_APPLICABLE: "var(--st-unknown)" };

function SslBody() {
  const { role } = useAccess();
  const scope = useScope();
  const [filter, setFilter] = useState<SslStatus | "">("");
  const [error, setError] = useState("");
  const query = useMonitoringQuery(() => monitoringApi.ssl(role), [role]);
  const data = query.data;
  const visible = (data?.monitors ?? []).filter((monitor) => !filter || monitor.ssl.status === filter);
  return <>
    {error ? <ErrorBox error={error} /> : null}
    <div className="relSslLanes">{lanes.map(([status, text]) => <button key={status} className={`relKpi ${["EXPIRED", "INVALID"].includes(status) && data?.counts[status] ? "alert" : ""}`} style={{ textAlign: "left", cursor: "pointer", outline: filter === status ? "2px solid #8cc52c" : undefined }} onClick={() => setFilter(filter === status ? "" : status)} aria-pressed={filter === status}><span><ShieldCheck size={12} aria-hidden />{text}</span><strong>{data?.counts[status] ?? 0}</strong><small>{sslStatusLabel[status]}</small></button>)}</div>
    <div className="relFilters">{data ? <span className="relChip">Alertas a {data.alertDays.join(", ")} días · «por vencer» ≤ {data.warningDays} días</span> : null}{can(scope, "monitoring.export") ? <button className="relBtn" style={{ marginLeft: "auto" }} onClick={() => void monitoringApi.download(role, "ssl").catch((cause: Error) => setError(cause.message))}><Download size={13} aria-hidden />Exportar CSV</button> : null}</div>
    {query.loading && !data ? <Loading height={260} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : !visible.length ? <Empty title={filter === "EXPIRING_SOON" ? "No hay certificados próximos a vencer." : "No hay certificados para mostrar."} text="Sólo los monitores HTTPS con control SSL activo aparecen aquí." icon={ShieldCheck} /> :
      <div className="relSslGrid">{visible.map((monitor) => { const days = monitor.ssl.daysRemaining; const ratio = days === null ? 0 : Math.max(0, Math.min(1, days / 90)); return <Link key={monitor.id} className="relSslCard" href={`/monitoring/endpoints/${monitor.endpointId}`} style={{ color: "inherit", textDecoration: "none" }}>
        <div className="relRing" style={{ background: `conic-gradient(${ringColor[monitor.ssl.status]} ${ratio * 360}deg, #e7ece9 0)` }} aria-hidden><b>{days ?? "—"}<small>DÍAS</small></b></div>
        <div><h3>{monitor.endpointName}</h3><SslChip status={monitor.ssl.status} /><p>{monitor.clientName ?? "Sin cliente"} · vence {formatDate(monitor.ssl.expiresAt) || "sin dato"}<br />{monitor.ssl.issuer ?? "Emisor desconocido"}{monitor.ssl.errorType ? ` · ${monitor.ssl.errorType}` : ""}<br />Revisado {formatDateTime(monitor.ssl.checkedAt)}</p></div>
      </Link>; })}</div>}
  </>;
}

export function HistoryPage() { return <MonitoringShell section="history" title="Historial" subtitle="Bitácora inmutable de eventos de monitoreo: estados, incidentes, recuperaciones, SSL y mantenimiento."><HistoryBody /></MonitoringShell>; }

const eventTypes = ["ENDPOINT_OFFLINE", "ENDPOINT_STATUS_CHANGED", "CHECK_FAILED", "INCIDENT_CONFIRMED", "INCIDENT_ACKNOWLEDGED", "INCIDENT_ESCALATED", "ENDPOINT_RECOVERED", "INCIDENT_RESOLVED", "INCIDENT_REOPENED", "LATENCY_DEGRADED", "SSL_EXPIRING", "SSL_EXPIRED", "MAINTENANCE_STARTED", "MAINTENANCE_COMPLETED", "MONITOR_CREATED"];

function HistoryBody() {
  const { role } = useAccess();
  const [filters, setFilters] = useState({ eventType: "", from: "", to: "", page: 1 });
  const query = useMonitoringQuery(() => monitoringApi.history(role, { eventType: filters.eventType || undefined, from: optionalSantiagoIso(filters.from, "00:00"), to: optionalSantiagoIso(filters.to, "23:59"), page: filters.page, pageSize: 50 }), [role, filters.eventType, filters.from, filters.to, filters.page]);
  return <>
    <div className="relFilters" role="search">
      <label>Evento<select value={filters.eventType} onChange={(event) => setFilters({ ...filters, eventType: event.target.value, page: 1 })}><option value="">Todos</option>{eventTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
      <label>Desde (DD-MM-AAAA)<input value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })} placeholder="01-10-2026" style={{ width: 130 }} /></label>
      <label>Hasta (DD-MM-AAAA)<input value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })} placeholder="31-10-2026" style={{ width: 130 }} /></label>
    </div>
    <Panel title="Eventos" icon={History} count={query.data?.total}>{query.loading && !query.data ? <Loading height={300} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : <EventStream events={query.data?.items ?? []} />}
      {query.data && query.data.totalPages > 1 ? <div className="relActions" style={{ marginTop: 10, justifyContent: "flex-end" }}><button className="relBtn small" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button><span className="relMuted" style={{ fontSize: 11, alignSelf: "center" }}>Página {query.data.page} de {query.data.totalPages}</span><button className="relBtn small" disabled={filters.page >= query.data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button></div> : null}
    </Panel>
  </>;
}


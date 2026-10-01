"use client";

import Link from "next/link";
import type { Incident, MonitoringEvent, MonitorView } from "@zyteron/contracts/monitoring";
import { Activity, AlertOctagon, Cpu, Gauge, GitBranch, Globe2, HeartPulse, Plus, RotateCcw, ShieldAlert, Siren, Timer } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { monitoringApi } from "@/lib/monitoring-api";
import { formatDate, formatDateTime, formatMs, formatPercent, formatTime, environmentLabel, since } from "@/lib/monitoring-format";
import { can, MonitoringShell, useScope } from "./shell";
import { Empty, ErrorBox, IncidentStatusChip, Loading, Panel, SeverityBadge, SslChip, StatusPill, useMonitoringQuery } from "./ui";

export function CommandCenter() {
  return <MonitoringShell section="command" title="Reliability Command Center" subtitle="Disponibilidad, incidentes, certificados y latencia de cada endpoint de clientes y proyectos, con datos medidos por el worker de Zyteron." actions={<NewMonitorLink />}><CommandBody /></MonitoringShell>;
}

function NewMonitorLink() { const scope = useScope(); return can(scope, "monitor.create") ? <Link className="relBtn primary" href="/monitoring/websites?new=1"><Plus size={14} aria-hidden />Nuevo monitor</Link> : null; }

function CommandBody() {
  const { role } = useAccess();
  const scope = useScope();
  const { data, error, loading, reload } = useMonitoringQuery(() => monitoringApi.dashboard(role), [role]);
  if (loading && !data) return <div className="relStack"><Loading height={90} /><Loading height={320} /></div>;
  if (error && !data) return <ErrorBox error={error} retry={() => void reload()} />;
  if (!data) return null;
  const t = data.totals;
  return <>
    <div className="relKpis">
      <Kpi icon={Globe2} label="Endpoints" value={t.total} hint={`${t.DISABLED} deshabilitados · ${t.UNKNOWN} sin datos`} href="/monitoring/websites" />
      <Kpi icon={HeartPulse} label="Online" value={t.ONLINE} hint={`${t.MAINTENANCE} en mantenimiento`} href="/monitoring/live?status=ONLINE" />
      <Kpi icon={Activity} label="Degradados" value={t.DEGRADED} hint="Latencia o fallas sin confirmar" href="/monitoring/live?status=DEGRADED" alert={t.DEGRADED > 0} />
      <Kpi icon={AlertOctagon} label="Offline" value={t.OFFLINE} hint="Umbral de fallas alcanzado" href="/monitoring/live?status=OFFLINE" alert={t.OFFLINE > 0} />
      <Kpi icon={Siren} label="Incidentes abiertos" value={data.openIncidents} hint={`${data.criticalIncidents} críticos · ${data.unacknowledgedIncidents} sin reconocer`} href="/monitoring/incidents?state=open" alert={data.criticalIncidents > 0} />
      <Kpi icon={Gauge} label="Uptime global 24 h" value={formatPercent(data.globalUptime24h)} hint={data.globalUptimeDefinition} />
    </div>
    <div className="relGrid command">
      <div className="relStack">
        <Panel title="Matriz de salud" icon={HeartPulse} count={data.monitors.length}><HealthMatrix monitors={data.monitors} fleet={data.fleet} /></Panel>
        <Panel title="Mapa operacional" icon={GitBranch}><LogicalMap monitors={data.monitors} /></Panel>
      </div>
      <div className="relStack">
        <Panel title="Cola de incidentes" icon={Siren} count={data.activeIncidents.length}><IncidentQueue incidents={data.activeIncidents.slice(0, 8)} empty="No hay incidentes activos." /></Panel>
        <Panel title="Stream de eventos" icon={Activity}><EventStream events={data.events} /></Panel>
      </div>
    </div>
    <div className="relGrid three" style={{ marginTop: 12 }}>
      <Panel title="Certificados por vencer" icon={ShieldAlert} count={data.sslExpiring.length}>{data.sslExpiring.length ? <div className="relQueue">{data.sslExpiring.map((monitor) => <Link key={monitor.id} className="relIncidentRow" href={`/monitoring/endpoints/${monitor.endpointId}`}><i className={monitor.ssl.status === "EXPIRING_SOON" ? "MEDIUM" : "CRITICAL"} /><div><strong>{monitor.endpointName}</strong><small>{monitor.clientName ?? "Sin cliente"} · {monitor.ssl.expiresAt ? `vence ${formatDate(monitor.ssl.expiresAt)}` : "sin fecha"}</small></div><aside><SslChip status={monitor.ssl.status} />{monitor.ssl.daysRemaining !== null ? <span className="relMono">{monitor.ssl.daysRemaining} días</span> : null}</aside></Link>)}</div> : <Empty title="No hay certificados próximos a vencer." />}</Panel>
      <Panel title="Latencia elevada" icon={Timer} count={data.highLatency.length}>{data.highLatency.length ? <div className="relQueue">{data.highLatency.map((monitor) => <Link key={monitor.id} className="relIncidentRow" href={`/monitoring/endpoints/${monitor.endpointId}`}><i className={monitor.criticalLatencyMs && (monitor.lastLatencyMs ?? 0) >= monitor.criticalLatencyMs ? "HIGH" : "MEDIUM"} /><div><strong>{monitor.endpointName}</strong><small>Umbral {formatMs(monitor.warningLatencyMs)} / {formatMs(monitor.criticalLatencyMs)}</small></div><aside><strong className="relMono">{formatMs(monitor.lastLatencyMs)}</strong><span>{formatTime(monitor.lastCheckedAt)}</span></aside></Link>)}</div> : <Empty title="Sin latencias sobre los umbrales configurados." text="Sólo se evalúan monitores con umbrales de advertencia o críticos definidos." />}</Panel>
      <Panel title="Últimas recuperaciones" icon={RotateCcw} count={data.recentRecoveries.length}>{data.recentRecoveries.length ? <EventStream events={data.recentRecoveries} /> : <Empty title="Sin recuperaciones recientes." />}</Panel>
    </div>
    {data.workers.length || can(scope, "monitoring.settings.manage") ? <Panel title="Scheduler y workers" icon={Cpu} className="relWorkers">{data.workers.length ? <div className="relTableWrap"><table className="relTable"><thead><tr><th>Worker</th><th>Último latido</th><th className="num">Checks ejecutados</th><th>Estado</th></tr></thead><tbody>{data.workers.map((worker) => { const stale = Date.now() - new Date(worker.lastSeenAt).getTime() > 3 * 60_000; return <tr key={worker.workerId}><td className="relMono">{worker.workerId}</td><td>{formatDateTime(worker.lastSeenAt)} ({since(worker.lastSeenAt)})</td><td className="num">{worker.checksExecuted}</td><td>{stale ? <StatusPill status="OFFLINE" /> : <StatusPill status="ONLINE" />}{worker.lastError ? <small className="relMuted"> · {worker.lastError}</small> : null}</td></tr>; })}</tbody></table></div> : <Empty title="Ningún worker ha reportado latido." text="Verifica MONITORING_WORKER_ENABLED en la instancia API o el Background Worker." icon={Cpu} />}</Panel> : null}
  </>;
}

function Kpi({ icon: Icon, label, value, hint, href, alert = false }: { icon: typeof Globe2; label: string; value: number | string; hint: string; href?: string; alert?: boolean }) {
  const body = <><span><Icon size={12} aria-hidden />{label}</span><strong>{value}</strong><small>{hint}</small></>;
  return href ? <Link className={`relKpi ${alert ? "alert" : ""}`} href={href}>{body}</Link> : <div className={`relKpi ${alert ? "alert" : ""}`} title={hint}>{body}</div>;
}

export function HealthMatrix({ monitors, fleet }: { monitors: MonitorView[]; fleet: Record<string, { uptime24h: number | null }> }) {
  if (!monitors.length) return <Empty title="Aún no existen endpoints monitoreados." text="Registra un monitor desde Sitios monitoreados para comenzar a medir disponibilidad." icon={Globe2} />;
  const groups = new Map<string, MonitorView[]>();
  const rank = { OFFLINE: 0, DEGRADED: 1, MAINTENANCE: 2, UNKNOWN: 3, ONLINE: 4, DISABLED: 5 } as const;
  for (const monitor of monitors) groups.set(monitor.clientName ?? "Sin cliente", [...(groups.get(monitor.clientName ?? "Sin cliente") ?? []), monitor]);
  return <div className="relMatrix">{[...groups.entries()].map(([client, items]) => <div className="relMatrixGroup" key={client}><h4>{client}<span className="relCount">{items.length}</span></h4><div className="relMatrixTiles">
    {[...items].sort((a, b) => rank[a.status] - rank[b.status]).map((monitor) => <Link key={monitor.id} href={`/monitoring/endpoints/${monitor.endpointId}`} className={`relTile ${monitor.status}`} title={monitor.statusReason ?? undefined}>
      <strong>{monitor.endpointName}</strong><small>{monitor.projectName} · {environmentLabel[monitor.environment] ?? monitor.environment}</small>
      <footer><StatusPill status={monitor.status} /><span className="relMono">{formatPercent(fleet[monitor.id]?.uptime24h ?? null, 1)}</span></footer>
    </Link>)}
  </div></div>)}</div>;
}

export function LogicalMap({ monitors }: { monitors: MonitorView[] }) {
  if (!monitors.length) return <Empty title="Sin relaciones para mostrar." text="El mapa se arma con Cliente → Proyecto → Endpoint a partir de los monitores registrados." icon={GitBranch} />;
  const tree = new Map<string, Map<string, MonitorView[]>>();
  for (const monitor of monitors) { const client = monitor.clientName ?? "Sin cliente"; const projects = tree.get(client) ?? new Map(); projects.set(monitor.projectName, [...(projects.get(monitor.projectName) ?? []), monitor]); tree.set(client, projects); }
  return <div className="relMap">{[...tree.entries()].map(([client, projects]) => <div className="relMapClient" key={client}><header><Globe2 size={14} aria-hidden />{client}</header>
    {[...projects.entries()].map(([project, items]) => <div className="relMapProject" key={project}><span>{project}</span><div className="relMapEndpoints">{items.map((monitor) => <Link key={monitor.id} href={`/monitoring/endpoints/${monitor.endpointId}`}><StatusPill status={monitor.status} compact />{monitor.endpointName}<small className="relMuted">{environmentLabel[monitor.environment] ?? monitor.environment}</small></Link>)}</div></div>)}
  </div>)}</div>;
}

export function IncidentQueue({ incidents, empty }: { incidents: Incident[]; empty: string }) {
  if (!incidents.length) return <Empty title={empty} />;
  return <div className="relQueue">{incidents.map((incident) => <Link key={incident.id} className="relIncidentRow" href={`/monitoring/incidents/${incident.id}`}>
    <i className={incident.severity} />
    <div><strong>{incident.incidentNumber} · {incident.title}</strong><small>{incident.clientName ?? "Sin cliente"} · {incident.projectName}</small><span className="relMeta"><SeverityBadge severity={incident.severity} /><IncidentStatusChip status={incident.status} />{!incident.acknowledgedAt && ["CONFIRMED", "DETECTED"].includes(incident.status) ? <span className="relChip" style={{ background: "#fdebe9", color: "#9b2a23" }}>Sin reconocer</span> : null}</span></div>
    <aside><span className="relMono">{since(incident.confirmedAt ?? incident.detectedAt)}</span><span>{formatTime(incident.confirmedAt ?? incident.detectedAt)}</span></aside>
  </Link>)}</div>;
}

export function EventStream({ events }: { events: MonitoringEvent[] }) {
  if (!events.length) return <Empty title="Sin eventos registrados." text="Los cambios de estado, incidentes, recuperaciones y mantenimientos aparecerán aquí." icon={Activity} />;
  return <div className="relStream" role="log" aria-live="polite">{events.map((event) => <article key={event.id}><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time><i className={event.tone} aria-hidden /><span>{event.incidentId ? <Link href={`/monitoring/incidents/${event.incidentId}`}>{event.title}</Link> : event.title}</span></article>)}</div>;
}

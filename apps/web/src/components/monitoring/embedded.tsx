"use client";

import Link from "next/link";
import { useState } from "react";
import type { MonitoringFleetEntry, MonitorView } from "@zyteron/contracts/monitoring";
import { Activity, MonitorCheck, Plus, ShieldCheck, Siren, Wrench } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { canAccessGroup } from "@/lib/access-control";
import { monitoringApi } from "@/lib/monitoring-api";
import { environmentLabel, formatDate, formatDateTime, formatDuration, formatMs, formatPercent } from "@/lib/monitoring-format";
import { IncidentQueue } from "./command-center";
import { CreateMonitorModal } from "./sites";
import { Empty, ErrorBox, LiveProvider, Loading, Panel, SslChip, StatusPill, useMonitoringQuery } from "./ui";

// Paneles embebidos: consumen la API de Monitoreo y no duplican datos en Clientes ni Operaciones.

function EndpointTable({ monitors, fleet, compact = false }: { monitors: MonitorView[]; fleet: Record<string, MonitoringFleetEntry>; compact?: boolean }) {
  return <div className="relTableWrap"><table className="relTable"><thead><tr><th>Sitio</th><th>Ambiente</th><th>Estado</th><th className="num">Uptime 30 d</th>{compact ? null : <th className="num">Latencia</th>}<th>SSL</th></tr></thead><tbody>
    {monitors.map((monitor) => <tr key={monitor.id}><td>{compact ? <strong>{monitor.endpointName}</strong> : <Link href={`/monitoring/endpoints/${monitor.endpointId}`} style={{ fontWeight: 800, color: "inherit" }}>{monitor.endpointName}</Link>}<br /><small className="relMuted relMono">{monitor.url}</small></td><td>{environmentLabel[monitor.environment] ?? monitor.environment}</td><td><StatusPill status={monitor.status} /></td><td className="num">{formatPercent(fleet[monitor.id]?.uptime30d ?? null)}</td>{compact ? null : <td className="num">{formatMs(monitor.lastLatencyMs)}</td>}<td>{monitor.monitorType === "HTTPS" ? <SslChip status={monitor.ssl.status} /> : "HTTP"}{monitor.ssl.daysRemaining !== null && monitor.monitorType === "HTTPS" ? <small className="relMuted"> {monitor.ssl.daysRemaining} d</small> : null}</td></tr>)}
  </tbody></table></div>;
}

/** Client 360 → pestaña Monitoreo. Ventas recibe el resumen sanitizado que entrega el backend. */
export function ClientMonitoringPanel({ clientId }: { clientId: string }) {
  return <LiveProvider><ClientBody clientId={clientId} /></LiveProvider>;
}
function ClientBody({ clientId }: { clientId: string }) {
  const { role } = useAccess();
  const query = useMonitoringQuery(() => monitoringApi.clientStatus(role, clientId), [role, clientId]);
  const summaryOnly = !canAccessGroup(role, "monitoring");
  if (query.loading && !query.data) return <div className="relEmbed"><Loading height={200} /></div>;
  if (query.error) return <div className="relEmbed"><ErrorBox error={query.error.includes("403") || query.error.toLowerCase().includes("permiso") ? "Tu rol no tiene acceso al resumen de monitoreo de este cliente." : query.error} retry={() => void query.reload()} /></div>;
  const data = query.data!;
  return <div className="relEmbed">
    <div className="relKpis" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
      <div className="relKpi"><span><MonitorCheck size={12} aria-hidden />Sitios</span><strong>{data.monitors.length}</strong><small>{data.monitors.filter((monitor) => monitor.status === "ONLINE").length} online</small></div>
      <div className={`relKpi ${data.openIncidents.length ? "alert" : ""}`}><span><Siren size={12} aria-hidden />Incidentes abiertos</span><strong>{data.openIncidents.length}</strong><small>{data.recentIncidents.length} recientes</small></div>
      <div className="relKpi"><span><Activity size={12} aria-hidden />Último downtime</span><strong style={{ fontSize: 16 }}>{data.lastDowntime ? formatDuration(data.lastDowntime.downtimeSeconds) : "Sin registro"}</strong><small>{data.lastDowntime ? `${data.lastDowntime.incidentNumber} · ${formatDate(data.lastDowntime.at)}` : "No hay incidentes con caída"}</small></div>
      <div className="relKpi"><span><ShieldCheck size={12} aria-hidden />SSL en riesgo</span><strong>{data.monitors.filter((monitor) => ["EXPIRING_SOON", "EXPIRED", "INVALID"].includes(monitor.ssl.status)).length}</strong><small>por vencer, vencidos o inválidos</small></div>
    </div>
    <Panel title="Sitios del cliente" icon={MonitorCheck} count={data.monitors.length} actions={!summaryOnly ? <Link className="relBtn small" href={`/monitoring/live`}>Abrir NOC</Link> : undefined}>{data.monitors.length ? <EndpointTable monitors={data.monitors} fleet={data.fleet} compact={summaryOnly} /> : <Empty title="No hay sitios asociados al monitoreo de este cliente." text="Los sitios se registran en los proyectos del cliente desde Monitoreo." icon={MonitorCheck} />}</Panel>
    <div className="relGrid two">
      <Panel title="Incidentes" icon={Siren} count={data.recentIncidents.length}>{summaryOnly ? (data.recentIncidents.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>{data.recentIncidents.map((incident) => <li key={incident.id}>{incident.incidentNumber} · {incident.title} · {formatDateTime(incident.detectedAt)}</li>)}</ul> : <Empty title="No hay incidentes registrados." />) : <IncidentQueue incidents={data.recentIncidents} empty="No hay incidentes registrados para este cliente." />}</Panel>
      <Panel title="Mantenimiento programado" icon={Wrench} count={data.maintenance.length}>{data.maintenance.length ? <div className="relQueue">{data.maintenance.map((window) => <div key={window.id} className="relIncidentRow"><i className="LOW" /><div><strong>{window.title}</strong><small>{formatDateTime(window.startsAt)} → {formatDateTime(window.endsAt)}</small></div><aside>{window.clientVisibility === "CLIENT_VISIBLE" ? "Visible" : "Interna"}</aside></div>)}</div> : <Empty title="Sin mantenimientos planificados." />}</Panel>
    </div>
  </div>;
}

/** Project 360 → bloque Monitoreo. No toca las demás secciones del proyecto. */
export function ProjectMonitoringPanel({ projectId }: { projectId: string }) {
  return <LiveProvider><ProjectBody projectId={projectId} /></LiveProvider>;
}
function ProjectBody({ projectId }: { projectId: string }) {
  const { role } = useAccess();
  const query = useMonitoringQuery(() => monitoringApi.projectStatus(role, projectId), [role, projectId]);
  const [creating, setCreating] = useState(false);
  if (!canAccessGroup(role, "monitoring")) return null;
  return <section className="relEmbed" style={{ marginTop: 13 }} aria-label="Monitoreo del proyecto">
    <Panel title="Monitoreo del proyecto" icon={MonitorCheck} count={query.data?.monitors.length} actions={<><Link className="relBtn small" href="/monitoring/live">NOC</Link><button className="relBtn small primary" onClick={() => setCreating(true)}><Plus size={12} aria-hidden />Monitor</button></>}>
      {query.loading && !query.data ? <Loading height={140} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : !query.data?.monitors.length ? <Empty title="Este proyecto todavía no posee endpoints monitoreados." text="Agrega un monitor para medir disponibilidad, latencia y certificado del sitio." icon={MonitorCheck} /> : <>
        <EndpointTable monitors={query.data.monitors} fleet={query.data.fleet} />
        <div className="relGrid two" style={{ marginTop: 12 }}>
          <div><strong style={{ fontSize: 12 }}>Incidentes abiertos</strong><div style={{ marginTop: 8 }}><IncidentQueue incidents={query.data.openIncidents} empty="No hay incidentes activos." /></div></div>
          <div><strong style={{ fontSize: 12 }}>Historial reciente</strong><div style={{ marginTop: 8 }}><IncidentQueue incidents={query.data.recentIncidents.filter((incident) => !query.data!.openIncidents.some((open) => open.id === incident.id)).slice(0, 4)} empty="Sin incidentes anteriores." /></div></div>
        </div>
      </>}
    </Panel>
    {creating ? <CreateMonitorModal presetProjectId={projectId} onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); await query.reload(); }} /> : null}
  </section>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Se monta desde la ruta /projects/[id], debajo del Project 360 de Operaciones, sin editar sus secciones. */
export function ProjectMonitoringSlot({ projectId }: { projectId: string }) {
  if (!uuidPattern.test(projectId)) return null;
  return <div className="relProjectSlot"><ProjectMonitoringPanel projectId={projectId} /></div>;
}

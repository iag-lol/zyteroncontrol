"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { UserDirectoryItem } from "@zyteron/contracts";
import type { MonitorView, MonitoringFleetEntry } from "@zyteron/contracts/monitoring";
import { endpointEnvironments, incidentSeverities } from "@zyteron/contracts/monitoring";
import { Radio } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { usersDirectoryApi } from "@/lib/client-domain-api";
import { monitoringApi } from "@/lib/monitoring-api";
import { environmentLabel, formatMs, formatPercent, formatTime, monitorStatusLabel, severityLabel, since } from "@/lib/monitoring-format";
import { MonitoringShell, useScope } from "./shell";
import { Empty, ErrorBox, Loading, SeverityBadge, StatusPill, useMonitoringQuery } from "./ui";

export function StatusBoardPage() {
  return <MonitoringShell section="live" title="Estado en tiempo real" subtitle="Tablero NOC agrupado por cliente, proyecto y ambiente. Se actualiza solo cuando cambia el estado de un endpoint."><StatusBoardBody /></MonitoringShell>;
}

const rank = { OFFLINE: 0, DEGRADED: 1, MAINTENANCE: 2, UNKNOWN: 3, ONLINE: 4, DISABLED: 5 } as const;

function StatusBoardBody() {
  const { role } = useAccess();
  const scope = useScope();
  const params = useSearchParams();
  const fleetScope = scope?.scope === "ALL" || scope?.scope === "DEPARTMENT";
  const [filters, setFilters] = useState({ clientId: "", responsibleUserId: "", status: params.get("status") ?? "", environment: "", severity: "" });
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  useEffect(() => { if (fleetScope) void usersDirectoryApi.list(role).then(setUsers).catch(() => setUsers([])); }, [role, fleetScope]);
  const query = useMonitoringQuery(() => monitoringApi.status(role, Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value || undefined]))), [role, ...Object.values(filters)]);
  const all = useMonitoringQuery(() => monitoringApi.monitors(role), [role]);
  const clients = useMemo(() => [...new Map((all.data ?? []).filter((monitor) => monitor.clientId).map((monitor) => [monitor.clientId!, monitor.clientName ?? "Cliente"])).entries()], [all.data]);
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, MonitorView[]>>>();
    for (const monitor of query.data?.monitors ?? []) {
      const client = monitor.clientName ?? "Sin cliente", project = monitor.projectName ?? "Sin proyecto", projects = map.get(client) ?? new Map<string, Map<string, MonitorView[]>>(), environments = projects.get(project) ?? new Map<string, MonitorView[]>();
      environments.set(monitor.environment, [...(environments.get(monitor.environment) ?? []), monitor]); projects.set(project, environments); map.set(client, projects);
    }
    return [...map.entries()].sort(([, a], [, b]) => worst(a) - worst(b));
  }, [query.data]);
  return <>
    <div className="relFilters" role="search" aria-label="Filtros del tablero">
      {fleetScope ? <label>Cliente<select value={filters.clientId} onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}><option value="">Todos</option>{clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
      {fleetScope ? <label>Responsable<select value={filters.responsibleUserId} onChange={(event) => setFilters({ ...filters, responsibleUserId: event.target.value })}><option value="">Todos</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label> : null}
      <label>Estado<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option>{Object.entries(monitorStatusLabel).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      <label>Ambiente<select value={filters.environment} onChange={(event) => setFilters({ ...filters, environment: event.target.value })}><option value="">Todos</option>{endpointEnvironments.map((value) => <option key={value} value={value}>{environmentLabel[value]}</option>)}</select></label>
      <label>Severidad<select value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value })}><option value="">Todas</option>{incidentSeverities.map((value) => <option key={value} value={value}>{severityLabel[value]}</option>)}</select></label>
      {!fleetScope ? <span className="relChip">Alcance: proyectos asignados</span> : null}
    </div>
    {query.loading && !query.data ? <Loading height={300} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : !grouped.length ? <Empty title={filters.status === "OFFLINE" ? "No existen sitios fuera de servicio." : "No hay endpoints para los filtros seleccionados."} icon={Radio} /> :
      <div className="relNoc">{grouped.map(([client, projects]) => <section className="relNocGroup" key={client} aria-label={client}>
        <header><h2>{client}</h2>{summary([...projects.values()].flatMap((environments) => [...environments.values()].flat()))}</header>
        {[...projects.entries()].map(([project, environments]) => <div key={project} style={{ marginTop: 6 }}><strong style={{ fontSize: 12 }}>{project}</strong>
          {[...environments.entries()].map(([environment, monitors]) => <div className="relNocEnv" key={environment}><span>{environmentLabel[environment] ?? environment}</span><div className="relNocCards">
            {[...monitors].sort((a, b) => rank[a.status] - rank[b.status]).map((monitor) => <NocCard key={monitor.id} monitor={monitor} fleet={query.data!.fleet[monitor.id]} />)}
          </div></div>)}
        </div>)}
      </section>)}</div>}
  </>;
}

function worst(projects: Map<string, Map<string, MonitorView[]>>) { return Math.min(...[...projects.values()].flatMap((environments) => [...environments.values()].flat()).map((monitor) => rank[monitor.status])); }
function summary(monitors: MonitorView[]) { const offline = monitors.filter((monitor) => monitor.status === "OFFLINE").length, degraded = monitors.filter((monitor) => monitor.status === "DEGRADED").length; return <span className="relMuted" style={{ fontSize: 11 }}>{monitors.length} endpoints{offline ? ` · ${offline} offline` : ""}{degraded ? ` · ${degraded} degradados` : ""}</span>; }

function NocCard({ monitor, fleet }: { monitor: MonitorView; fleet?: MonitoringFleetEntry }) {
  return <Link className={`relNocCard ${monitor.status}`} href={`/monitoring/endpoints/${monitor.endpointId}`}>
    <header><div style={{ display: "grid", gap: 2, minWidth: 0 }}><strong>{monitor.endpointName}</strong><small className="relMono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{monitor.url}</small></div><StatusPill status={monitor.status} /></header>
    {monitor.statusReason ? <small>{monitor.statusReason}</small> : null}
    {monitor.activeIncident ? <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10.5 }}><SeverityBadge severity={monitor.activeIncident.severity} />{monitor.activeIncident.incidentNumber} · {since(monitor.activeIncident.confirmedAt)}</span> : null}
    <dl><div><dt>Latencia</dt><dd>{formatMs(monitor.lastLatencyMs)}</dd></div><div><dt>Uptime 24 h</dt><dd>{formatPercent(fleet?.uptime24h ?? null, 1)}</dd></div><div><dt>Check</dt><dd>{formatTime(monitor.lastCheckedAt)}</dd></div></dl>
  </Link>;
}

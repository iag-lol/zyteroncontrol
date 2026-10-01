"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { OperationsProject, UserDirectoryItem } from "@zyteron/contracts";
import type { AlertRule, MonitorView } from "@zyteron/contracts/monitoring";
import { endpointEnvironments, endpointTypes, incidentSeverities, monitorIntervals } from "@zyteron/contracts/monitoring";
import { Globe2, LayoutGrid, Plus, Radio, RefreshCw, Search } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { usersDirectoryApi } from "@/lib/client-domain-api";
import { monitoringApi } from "@/lib/monitoring-api";
import { endpointTypeLabel, environmentLabel, formatDateTime, formatInterval, formatMs, formatPercent, monitorStatusLabel, severityLabel } from "@/lib/monitoring-format";
import { operationsApi } from "@/lib/operations-api";
import { can, MonitoringShell, useScope } from "./shell";
import { Empty, ErrorBox, Loading, Modal, Notice, Panel, SslChip, StatusPill, useAction, useMonitoringQuery } from "./ui";

export function SitesPage() {
  return <MonitoringShell section="sites" title="Sitios monitoreados" subtitle="Inventario de endpoints bajo vigilancia: cada monitor pertenece a un proyecto real de Operaciones y hereda su cliente."><SitesBody /></MonitoringShell>;
}

function SitesBody() {
  const { role } = useAccess();
  const scope = useScope();
  const params = useSearchParams(), router = useRouter();
  const [filters, setFilters] = useState({ search: "", status: "", environment: "", clientId: "" });
  const query = useMonitoringQuery(() => monitoringApi.status(role, { status: filters.status || undefined, environment: filters.environment || undefined, clientId: filters.clientId || undefined }), [role, filters.status, filters.environment, filters.clientId]);
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (params.get("new") === "1") setCreating(true); }, [params]);
  const action = useAction(query.reload);
  const monitors = useMemo(() => (query.data?.monitors ?? []).filter((monitor) => !filters.search || [monitor.endpointName, monitor.url, monitor.projectName, monitor.clientName].some((value) => value?.toLowerCase().includes(filters.search.toLowerCase()))), [query.data, filters.search]);
  const clients = useMemo(() => [...new Map((query.data?.monitors ?? []).filter((monitor) => monitor.clientId).map((monitor) => [monitor.clientId!, monitor.clientName ?? "Cliente"])).entries()], [query.data]);
  return <>
    {action.notice ? <Notice tone={action.notice.tone} text={action.notice.text} onClose={() => action.setNotice(null)} /> : null}
    <div className="relFilters" role="search">
      <label>Buscar<span style={{ position: "relative", display: "flex", alignItems: "center" }}><Search size={13} style={{ position: "absolute", left: 9 }} aria-hidden /><input style={{ paddingLeft: 28 }} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Endpoint, URL, proyecto o cliente" /></span></label>
      <label>Estado<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option>{Object.entries(monitorStatusLabel).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      <label>Ambiente<select value={filters.environment} onChange={(event) => setFilters({ ...filters, environment: event.target.value })}><option value="">Todos</option>{endpointEnvironments.map((value) => <option key={value} value={value}>{environmentLabel[value]}</option>)}</select></label>
      <label>Cliente<select value={filters.clientId} onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}><option value="">Todos</option>{clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}><button className="relBtn" onClick={() => void query.reload()}><RefreshCw size={13} aria-hidden />Actualizar</button>{can(scope, "monitor.create") ? <button className="relBtn primary" onClick={() => setCreating(true)}><Plus size={14} aria-hidden />Nuevo monitor</button> : null}</span>
    </div>
    <Panel title="Endpoints" icon={LayoutGrid} count={monitors.length}>
      {query.loading && !query.data ? <Loading height={260} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : !monitors.length ? <Empty title="Este alcance todavía no posee endpoints monitoreados." text={can(scope, "monitor.create") ? "Registra el primer monitor con «Nuevo monitor»." : "Solicita a tu jefatura registrar los endpoints de tus proyectos."} icon={Globe2} /> :
        <div className="relTableWrap"><table className="relTable"><thead><tr><th>Endpoint</th><th>Proyecto / cliente</th><th>Ambiente</th><th>Estado</th><th className="num">Uptime 24 h</th><th className="num">Uptime 30 d</th><th className="num">Latencia</th><th>SSL</th><th>Último check</th><th /></tr></thead><tbody>
          {monitors.map((monitor) => <SiteRow key={monitor.id} monitor={monitor} fleet={query.data!.fleet[monitor.id]} onCheck={() => void action.run(`Check ejecutado para ${monitor.endpointName}.`, () => monitoringApi.checkNow(role, monitor.id))} busy={action.busy} />)}
        </tbody></table></div>}
    </Panel>
    {creating ? <CreateMonitorModal onClose={() => { setCreating(false); if (params.get("new")) router.replace("/monitoring/websites"); }} onCreated={async (monitor) => { setCreating(false); action.setNotice({ tone: "success", text: `Monitor creado para ${monitor.endpointName}. El primer check se ejecuta en el próximo ciclo del scheduler.` }); await query.reload(); }} /> : null}
  </>;
}

function SiteRow({ monitor, fleet, onCheck, busy }: { monitor: MonitorView; fleet?: { uptime24h: number | null; uptime30d: number | null }; onCheck: () => void; busy: boolean }) {
  return <tr>
    <td><Link href={`/monitoring/endpoints/${monitor.endpointId}`} style={{ fontWeight: 800, color: "inherit" }}>{monitor.endpointName}</Link><br /><small className="relMuted relMono">{monitor.url}</small></td>
    <td>{monitor.projectName}<br /><small className="relMuted">{monitor.clientName ?? "Sin cliente"}</small></td>
    <td>{environmentLabel[monitor.environment] ?? monitor.environment}<br /><small className="relMuted">{endpointTypeLabel[monitor.endpointType] ?? monitor.endpointType} · cada {formatInterval(monitor.intervalSeconds)}</small></td>
    <td><StatusPill status={monitor.status} />{monitor.activeIncident ? <><br /><Link href={`/monitoring/incidents/${monitor.activeIncident.id}`} className="relMono" style={{ fontSize: 10 }}>{monitor.activeIncident.incidentNumber}</Link></> : null}</td>
    <td className="num">{formatPercent(fleet?.uptime24h ?? null)}</td><td className="num">{formatPercent(fleet?.uptime30d ?? null)}</td>
    <td className="num">{formatMs(monitor.lastLatencyMs)}</td>
    <td>{monitor.monitorType === "HTTPS" ? <SslChip status={monitor.ssl.status} /> : <span className="relMuted">HTTP</span>}</td>
    <td><span className="relMono" style={{ fontSize: 10.5 }}>{formatDateTime(monitor.lastCheckedAt)}</span></td>
    <td><button className="relBtn small" disabled={busy || !monitor.enabled} onClick={onCheck} title="Ejecuta un check real con las mismas protecciones del worker"><Radio size={12} aria-hidden />Check</button></td>
  </tr>;
}

export function CreateMonitorModal({ onClose, onCreated, presetProjectId }: { onClose: () => void; onCreated: (monitor: MonitorView) => void | Promise<void>; presetProjectId?: string }) {
  const { role } = useAccess();
  const [projects, setProjects] = useState<OperationsProject[]>([]);
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState<Record<string, string | number | boolean>>({ projectId: presetProjectId ?? "", name: "", url: "https://", environment: "PRODUCTION", endpointType: "WEB", responsibleUserId: "", intervalSeconds: 300, timeoutMs: 10000, expectedStatus: "200-299", failureThreshold: 3, recoveryThreshold: 2, sslMonitoringEnabled: true, httpMethod: "GET", followRedirects: true, maxRedirects: 3, expectedContent: "", warningLatencyMs: "", criticalLatencyMs: "", incidentSeverity: "", maintenanceMode: "CHECK_AND_SUPPRESS", alertRuleId: "", clientVisibility: "INTERNAL" });
  useEffect(() => {
    void operationsApi.projects(role).then((page) => setProjects(page.items)).catch(() => setProjects([]));
    void usersDirectoryApi.list(role).then(setUsers).catch(() => setUsers([]));
    void monitoringApi.alertRules(role).then(setRules).catch(() => setRules([]));
  }, [role]);
  const set = (key: string, entry: string | number | boolean) => setValue((current) => ({ ...current, [key]: entry }));
  const project = projects.find((item) => item.id === value.projectId);
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const payload: Record<string, unknown> = { ...value };
      for (const key of ["warningLatencyMs", "criticalLatencyMs"]) payload[key] = value[key] === "" ? null : Number(value[key]);
      for (const key of ["incidentSeverity", "alertRuleId", "responsibleUserId", "expectedContent"]) if (value[key] === "") payload[key] = null;
      await onCreated(await monitoringApi.createMonitor(role, payload));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible crear el monitor."); }
    finally { setBusy(false); }
  };
  return <Modal title="Nuevo monitor HTTP/HTTPS" eyebrow="Monitoreo · registro autorizado" onClose={onClose}>
    {error ? <ErrorBox error={error} /> : null}
    <form className="relForm" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className="relField wide">Proyecto<select required value={String(value.projectId)} onChange={(event) => set("projectId", event.target.value)}><option value="">Seleccionar proyecto</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.projectNumber} · {item.name}</option>)}</select><small>Cliente derivado: {project?.clientName ?? "—"}. Monitoreo sólo de endpoints autorizados por Zyteron o el cliente.</small></label>
      <label className="relField">Nombre<input required maxLength={120} value={String(value.name)} onChange={(event) => set("name", event.target.value)} placeholder="Web principal" /></label>
      <label className="relField">URL<input required type="url" value={String(value.url)} onChange={(event) => set("url", event.target.value)} placeholder="https://www.zyteron.cl" /><small>Sólo http/https públicos, puertos 80/443/8080/8443. Destinos privados se rechazan.</small></label>
      <label className="relField">Ambiente<select value={String(value.environment)} onChange={(event) => set("environment", event.target.value)}>{endpointEnvironments.map((item) => <option key={item} value={item}>{environmentLabel[item]}</option>)}</select></label>
      <label className="relField">Tipo<select value={String(value.endpointType)} onChange={(event) => set("endpointType", event.target.value)}>{endpointTypes.map((item) => <option key={item} value={item}>{endpointTypeLabel[item]}</option>)}</select></label>
      <label className="relField wide">Responsable<select value={String(value.responsibleUserId)} onChange={(event) => set("responsibleUserId", event.target.value)}><option value="">Sin responsable (alertas al líder del proyecto)</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <fieldset><legend>Ejecución</legend>
        <label className="relField">Intervalo<select value={String(value.intervalSeconds)} onChange={(event) => set("intervalSeconds", Number(event.target.value))}>{monitorIntervals.map((item) => <option key={item} value={item}>{formatInterval(item)}</option>)}</select></label>
        <label className="relField">Timeout (ms)<input type="number" min={1000} max={30000} step={500} value={Number(value.timeoutMs)} onChange={(event) => set("timeoutMs", Number(event.target.value))} /></label>
        <label className="relField">Expected status<input value={String(value.expectedStatus)} onChange={(event) => set("expectedStatus", event.target.value)} placeholder="200 o 200-299" /></label>
        <label className="relField">Método<select value={String(value.httpMethod)} onChange={(event) => set("httpMethod", event.target.value)}><option value="GET">GET</option><option value="HEAD">HEAD</option></select></label>
        <label className="relField">Fallas para incidente<input type="number" min={1} max={10} value={Number(value.failureThreshold)} onChange={(event) => set("failureThreshold", Number(event.target.value))} /></label>
        <label className="relField">Éxitos para recuperar<input type="number" min={1} max={10} value={Number(value.recoveryThreshold)} onChange={(event) => set("recoveryThreshold", Number(event.target.value))} /></label>
        <label className="relCheck"><input type="checkbox" checked={Boolean(value.followRedirects)} onChange={(event) => set("followRedirects", event.target.checked)} />Seguir redirects (máx. {String(value.maxRedirects)})</label>
        <label className="relCheck"><input type="checkbox" checked={Boolean(value.sslMonitoringEnabled)} onChange={(event) => set("sslMonitoringEnabled", event.target.checked)} />Monitorear certificado SSL/TLS</label>
        <label className="relField">Contenido esperado<input maxLength={200} value={String(value.expectedContent)} onChange={(event) => set("expectedContent", event.target.value)} placeholder="Opcional, ej.: Zyteron" /></label>
      </fieldset>
      <fieldset><legend>Umbrales y políticas</legend>
        <label className="relField">Latencia advertencia (ms)<input type="number" min={50} max={60000} value={String(value.warningLatencyMs)} onChange={(event) => set("warningLatencyMs", event.target.value)} placeholder="Sin umbral" /></label>
        <label className="relField">Latencia crítica (ms)<input type="number" min={50} max={60000} value={String(value.criticalLatencyMs)} onChange={(event) => set("criticalLatencyMs", event.target.value)} placeholder="Sin umbral" /></label>
        <label className="relField">Severidad del incidente<select value={String(value.incidentSeverity)} onChange={(event) => set("incidentSeverity", event.target.value)}><option value="">Según reglas (ambiente/prioridad)</option>{incidentSeverities.map((item) => <option key={item} value={item}>{severityLabel[item]}</option>)}</select></label>
        <label className="relField">Mantenimiento<select value={String(value.maintenanceMode)} onChange={(event) => set("maintenanceMode", event.target.value)}><option value="CHECK_AND_SUPPRESS">Seguir chequeando y suprimir alertas</option><option value="PAUSE_CHECKS">Pausar checks durante la ventana</option></select></label>
        <label className="relField">Regla de alerta<select value={String(value.alertRuleId)} onChange={(event) => set("alertRuleId", event.target.value)}><option value="">Automática (más específica)</option>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label>
        <label className="relField">Visibilidad cliente<select value={String(value.clientVisibility)} onChange={(event) => set("clientVisibility", event.target.value)}><option value="INTERNAL">Interna</option><option value="CLIENT_VISIBLE">Visible en portal (estado y uptime)</option></select></label>
      </fieldset>
      <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary" disabled={busy}>{busy ? "Validando destino…" : "Crear monitor"}</button></footer>
    </form>
  </Modal>;
}

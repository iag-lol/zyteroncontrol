"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MonitorView } from "@zyteron/contracts/monitoring";
import { incidentSeverities, monitorIntervals } from "@zyteron/contracts/monitoring";
import { Activity, ArrowLeft, Gauge, History, Power, Radio, Settings2, ShieldCheck, Siren, Timer, Wrench } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { monitoringApi } from "@/lib/monitoring-api";
import { environmentLabel, endpointTypeLabel, errorTypeLabel, formatDate, formatDateTime, formatInterval, formatMs, formatPercent, severityLabel, since, optionalSantiagoIso } from "@/lib/monitoring-format";
import { LatencyChart, UptimeBars, UptimeLegend, UptimeTable } from "./charts";
import { IncidentQueue } from "./command-center";
import { can, MonitoringShell, useScope } from "./shell";
import { Empty, ErrorBox, Loading, Notice, Panel, SslChip, StatusPill, useAction, useMonitoringQuery } from "./ui";

export function EndpointDetailPage({ id }: { id: string }) {
  return <MonitoringShell section="endpoint" title="Detalle de endpoint" subtitle="Evidencia completa del endpoint: checks reales, disponibilidad, latencia, certificado, incidentes y configuración."><EndpointBody id={id} /></MonitoringShell>;
}

function EndpointBody({ id }: { id: string }) {
  const { role } = useAccess();
  const detail = useMonitoringQuery(() => monitoringApi.endpoint(role, id), [role, id]);
  const [selected, setSelected] = useState<string | null>(null);
  if (detail.loading && !detail.data) return <Loading height={320} />;
  if (detail.error && !detail.data) return <ErrorBox error={detail.error} retry={() => void detail.reload()} />;
  if (!detail.data) return null;
  const { endpoint, monitors, maintenance, incidents } = detail.data;
  const monitor = monitors.find((item) => item.id === selected) ?? monitors[0];
  return <>
    <div className="relActions"><Link className="relBtn small" href="/monitoring/websites"><ArrowLeft size={13} aria-hidden />Sitios monitoreados</Link>{monitors.length > 1 ? monitors.map((item) => <button key={item.id} className={`relBtn small ${item.id === monitor?.id ? "lime" : ""}`} onClick={() => setSelected(item.id)}>{item.monitorType}</button>) : null}</div>
    <section className="relBanner resolved" style={{ background: "#fff", borderColor: "var(--rel-line)" }}>
      <div><small className="relMuted" style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" }}>{endpoint.clientName ?? "Sin cliente"} · {endpoint.projectName ? `${endpoint.projectNumber ?? ""} ${endpoint.projectName}`.trim() : "Sin proyecto"}</small>
        <h2>{endpoint.name}</h2><p className="relMono">{endpoint.url}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{monitor ? <StatusPill status={monitor.status} /> : <span className="relChip">Sin monitor</span>}<span className="relChip">{environmentLabel[endpoint.environment] ?? endpoint.environment}</span><span className="relChip">{endpointTypeLabel[endpoint.endpointType] ?? endpoint.endpointType}</span>{monitor?.activeIncident ? <Link className="relChip" style={{ background: "#fdebe9", color: "#9b2a23" }} href={`/monitoring/incidents/${monitor.activeIncident.id}`}>{monitor.activeIncident.incidentNumber}</Link> : null}</div>
      </div>
      {monitor ? <div className="relClock"><small>Último check</small><strong>{monitor.lastCheckedAt ? since(monitor.lastCheckedAt) : "—"}</strong><small>{formatDateTime(monitor.lastCheckedAt)}</small></div> : null}
    </section>
    {!monitor ? <Empty title="Este endpoint no tiene monitor activo." text="Crea un monitor desde Sitios monitoreados para comenzar a registrar checks." /> : <MonitorSections monitor={monitor} maintenance={maintenance} incidents={incidents} reload={detail.reload} />}
  </>;
}

function MonitorSections({ monitor, maintenance, incidents, reload }: { monitor: MonitorView; maintenance: import("@zyteron/contracts/monitoring").MaintenanceWindow[]; incidents: import("@zyteron/contracts/monitoring").Incident[]; reload: () => Promise<void> }) {
  const { role } = useAccess();
  const scope = useScope();
  const stats = useMonitoringQuery(() => monitoringApi.stats(role, monitor.id), [role, monitor.id]);
  const action = useAction(async () => { await reload(); await stats.reload(); });
  const s = stats.data?.stats;
  const windows = [["h1", "1 h"], ["h24", "24 h"], ["d7", "7 d"], ["d30", "30 d"], ["d90", "90 d"]] as const;
  return <>
    {action.notice ? <Notice tone={action.notice.tone} text={action.notice.text} onClose={() => action.setNotice(null)} /> : null}
    <div className="relGrid three">
      <Panel title="Estado en vivo" icon={Radio} actions={<>{monitor.enabled ? <button className="relBtn small" disabled={action.busy} onClick={() => void action.run("Check ejecutado.", () => monitoringApi.checkNow(role, monitor.id))}><Radio size={12} aria-hidden />Check now</button> : null}{can(scope, "monitor.disable") ? <button className={`relBtn small ${monitor.enabled ? "danger" : ""}`} disabled={action.busy} onClick={() => void action.run(monitor.enabled ? "Monitor deshabilitado." : "Monitor habilitado.", () => monitoringApi.setEnabled(role, monitor.id, !monitor.enabled))}><Power size={12} aria-hidden />{monitor.enabled ? "Deshabilitar" : "Habilitar"}</button> : null}</>}>
        <dl className="relFacts">
          <div><dt>Estado</dt><dd><StatusPill status={monitor.status} /></dd></div><div><dt>Desde</dt><dd>{formatDateTime(monitor.statusChangedAt)}</dd></div>
          <div style={{ gridColumn: "1/-1" }}><dt>Motivo</dt><dd>{monitor.statusReason ?? "—"}</dd></div>
          <div><dt>Status HTTP</dt><dd className="relMono">{monitor.lastStatusCode ?? "—"}</dd></div><div><dt>Latencia actual</dt><dd className="relMono">{formatMs(monitor.lastLatencyMs)}</dd></div>
          <div><dt>Fallas seguidas</dt><dd>{monitor.consecutiveFailures}/{monitor.failureThreshold}</dd></div><div><dt>Próximo check</dt><dd>{monitor.enabled ? formatDateTime(monitor.nextCheckAt) : "Deshabilitado"}</dd></div>
          {monitor.lastErrorType ? <div style={{ gridColumn: "1/-1" }}><dt>Último error</dt><dd>{errorTypeLabel[monitor.lastErrorType] ?? monitor.lastErrorType} · {monitor.lastErrorMessage}</dd></div> : null}
        </dl>
      </Panel>
      <Panel title="Uptime" icon={Gauge}>{stats.loading && !s ? <Loading height={150} /> : stats.error ? <ErrorBox error={stats.error} /> : <table className="relTable"><thead><tr><th>Ventana</th><th className="num">Uptime</th><th className="num">Checks</th></tr></thead><tbody>{windows.map(([key, text]) => <tr key={key}><td>{text}</td><td className="num">{formatPercent(s?.uptime[key]?.percentage ?? null, 3)}</td><td className="num">{s?.uptime[key]?.checks ?? 0}</td></tr>)}</tbody></table>}{s ? <small className="relMuted">Mantenimiento {s.maintenancePolicy === "EXCLUDE" ? "excluido" : "incluido"} del cálculo. Datos desde {formatDate(s.firstCheckAt)}.</small> : null}</Panel>
      <Panel title="Certificado SSL/TLS" icon={ShieldCheck}>{monitor.monitorType !== "HTTPS" ? <Empty title="No aplica" text="El endpoint usa HTTP sin TLS." /> : <dl className="relFacts">
        <div><dt>Estado</dt><dd><SslChip status={monitor.ssl.status} /></dd></div><div><dt>Días restantes</dt><dd className="relMono">{monitor.ssl.daysRemaining ?? "—"}</dd></div>
        <div><dt>Vence</dt><dd>{formatDateTime(monitor.ssl.expiresAt)}</dd></div><div><dt>Revisado</dt><dd>{formatDateTime(monitor.ssl.checkedAt)}</dd></div>
        <div style={{ gridColumn: "1/-1" }}><dt>Emisor</dt><dd>{monitor.ssl.issuer ?? "—"}</dd></div>{monitor.ssl.errorType ? <div style={{ gridColumn: "1/-1" }}><dt>Error</dt><dd>{monitor.ssl.errorType}</dd></div> : null}
      </dl>}</Panel>
    </div>
    <div className="relGrid two" style={{ marginTop: 12 }}>
      <Panel title="Disponibilidad últimas 24 h" icon={Activity}>{stats.loading && !stats.data ? <Loading height={80} /> : <><UptimeBars buckets={stats.data?.hourly ?? []} granularity="hour" count={24} incidents={stats.data?.incidents ?? []} label="Uptime por hora, últimas 24 horas" /><UptimeTable buckets={stats.data?.hourly ?? []} granularity="hour" /></>}</Panel>
      <Panel title="Disponibilidad últimos 90 días" icon={Activity}>{stats.loading && !stats.data ? <Loading height={80} /> : <><UptimeBars buckets={stats.data?.daily ?? []} granularity="day" count={90} incidents={stats.data?.incidents ?? []} label="Uptime diario, últimos 90 días" /><UptimeLegend /><UptimeTable buckets={stats.data?.daily ?? []} granularity="day" /></>}</Panel>
    </div>
    <div className="relGrid two" style={{ marginTop: 12 }}>
      <Panel title="Latencia 24 h" icon={Timer}>{stats.loading && !stats.data ? <Loading height={180} /> : <LatencyChart buckets={stats.data?.hourly ?? []} granularity="hour" />}</Panel>
      <Panel title="Percentiles de latencia" icon={Timer}>{s ? <table className="relTable"><thead><tr><th>Ventana</th><th className="num">Promedio</th><th className="num">p50</th><th className="num">p95</th><th className="num">Muestras</th></tr></thead><tbody>
        <tr><td>Actual</td><td className="num">{formatMs(s.current)}</td><td className="num">—</td><td className="num">—</td><td className="num">1</td></tr>
        {(["h1", "h24", "d7", "d30"] as const).map((key) => <tr key={key}><td>{{ h1: "1 h", h24: "24 h", d7: "7 d", d30: "30 d" }[key]}</td><td className="num">{formatMs(s.latency[key]?.avg)}</td><td className="num">{formatMs(s.latency[key]?.p50)}</td><td className="num">{formatMs(s.latency[key]?.p95)}</td><td className="num">{s.latency[key]?.samples ?? 0}</td></tr>)}
      </tbody></table> : <Loading height={150} />}<small className="relMuted">p50 requiere ≥ 5 y p95 ≥ 20 respuestas exitosas; con menos muestras se muestra «—» en lugar de inventar el valor.</small></Panel>
    </div>
    <CheckHistory monitorId={monitor.id} />
    <div className="relGrid two" style={{ marginTop: 12 }}>
      <Panel title="Incidentes" icon={Siren} count={incidents.length}><IncidentQueue incidents={incidents} empty="Este endpoint no registra incidentes." /></Panel>
      <Panel title="Mantenimiento" icon={Wrench} count={maintenance.length}>{maintenance.length ? <div className="relQueue">{maintenance.map((window) => <div key={window.id} className="relIncidentRow"><i className="LOW" /><div><strong>{window.title}</strong><small>{formatDateTime(window.startsAt)} → {formatDateTime(window.endsAt)}</small></div><aside><span className="relChip">{window.status}</span></aside></div>)}</div> : <Empty title="Sin ventanas de mantenimiento recientes o planificadas." />}</Panel>
    </div>
    {can(scope, "monitor.edit") ? <MonitorConfig monitor={monitor} onSaved={() => action.run("Configuración guardada.", async () => undefined)} /> : null}
  </>;
}

function CheckHistory({ monitorId }: { monitorId: string }) {
  const { role } = useAccess();
  const [filters, setFilters] = useState({ result: "", statusCode: "", from: "", to: "", page: 1 });
  const checks = useMonitoringQuery(() => monitoringApi.checks(role, monitorId, { result: filters.result || undefined, statusCode: filters.statusCode || undefined, from: optionalSantiagoIso(filters.from, "00:00"), to: optionalSantiagoIso(filters.to, "23:59"), page: filters.page, pageSize: 25 }), [role, monitorId, filters.result, filters.statusCode, filters.from, filters.to, filters.page]);
  return <Panel title="Historial de checks" icon={History} count={checks.data?.total}>
    <div className="relFilters">
      <label>Resultado<select value={filters.result} onChange={(event) => setFilters({ ...filters, result: event.target.value, page: 1 })}><option value="">Todos</option><option value="success">Éxito</option><option value="failure">Falla</option></select></label>
      <label>Status HTTP<input inputMode="numeric" maxLength={3} value={filters.statusCode} onChange={(event) => setFilters({ ...filters, statusCode: event.target.value.replace(/\D/g, ""), page: 1 })} placeholder="500" style={{ width: 90 }} /></label>
      <label>Desde (DD-MM-AAAA)<input value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })} placeholder="01-10-2026" style={{ width: 130 }} /></label>
      <label>Hasta (DD-MM-AAAA)<input value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })} placeholder="31-10-2026" style={{ width: 130 }} /></label>
    </div>
    {checks.loading && !checks.data ? <Loading height={160} /> : checks.error ? <ErrorBox error={checks.error} /> : !checks.data?.items.length ? <Empty title="Sin checks para los filtros seleccionados." /> : <>
      <div className="relTableWrap"><table className="relTable"><thead><tr><th>Fecha</th><th>Resultado</th><th className="num">Status</th><th className="num">Latencia</th><th>Error</th><th>Redirects</th><th>Origen</th></tr></thead><tbody>
        {checks.data.items.map((check) => <tr key={check.id}><td className="relMono">{formatDateTime(check.checkedAt)}</td><td>{check.success ? <StatusPill status="ONLINE" /> : <StatusPill status="OFFLINE" />}{check.inMaintenance ? <span className="relChip" style={{ marginLeft: 4 }}>Mant.</span> : null}</td><td className="num">{check.statusCode ?? "—"}</td><td className="num">{formatMs(check.latencyMs)}</td><td>{check.errorType ? `${errorTypeLabel[check.errorType] ?? check.errorType}${check.errorMessage ? ` · ${check.errorMessage}` : ""}` : "—"}</td><td>{check.redirectCount}</td><td>{check.triggerType === "MANUAL" ? "Manual" : "Programado"}</td></tr>)}
      </tbody></table></div>
      <div className="relActions" style={{ marginTop: 10, justifyContent: "flex-end" }}><button className="relBtn small" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button><span className="relMuted" style={{ fontSize: 11, alignSelf: "center" }}>Página {checks.data.page} de {Math.max(1, checks.data.totalPages)}</span><button className="relBtn small" disabled={filters.page >= checks.data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button></div>
    </>}
  </Panel>;
}

function MonitorConfig({ monitor, onSaved }: { monitor: MonitorView; onSaved: () => Promise<unknown> }) {
  const { role } = useAccess();
  const scope = useScope();
  const [value, setValue] = useState(() => draftOf(monitor));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setValue(draftOf(monitor)); }, [monitor]);
  const set = (key: string, entry: string | number | boolean) => setValue((current) => ({ ...current, [key]: entry }));
  const save = async () => {
    setBusy(true); setError("");
    try {
      const payload: Record<string, unknown> = { ...value, warningLatencyMs: value.warningLatencyMs === "" ? null : Number(value.warningLatencyMs), criticalLatencyMs: value.criticalLatencyMs === "" ? null : Number(value.criticalLatencyMs), incidentSeverity: value.incidentSeverity || null, expectedContent: value.expectedContent || null };
      if (!can(scope, "endpoint.manage")) { delete payload.name; delete payload.url; }
      await monitoringApi.updateMonitor(role, monitor.id, payload); await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); } finally { setBusy(false); }
  };
  return <Panel title="Configuración del monitor" icon={Settings2}>
    {error ? <ErrorBox error={error} /> : null}
    <form className="relForm" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {can(scope, "endpoint.manage") ? <><label className="relField">Nombre<input value={String(value.name)} onChange={(event) => set("name", event.target.value)} /></label><label className="relField">URL<input type="url" value={String(value.url)} onChange={(event) => set("url", event.target.value)} /></label></> : null}
      <fieldset><legend>Ejecución</legend>
        <label className="relField">Intervalo<select value={String(value.intervalSeconds)} onChange={(event) => set("intervalSeconds", Number(event.target.value))}>{monitorIntervals.map((item) => <option key={item} value={item}>{formatInterval(item)}</option>)}</select></label>
        <label className="relField">Timeout (ms)<input type="number" min={1000} max={30000} value={Number(value.timeoutMs)} onChange={(event) => set("timeoutMs", Number(event.target.value))} /></label>
        <label className="relField">Expected status<input value={String(value.expectedStatus)} onChange={(event) => set("expectedStatus", event.target.value)} /></label>
        <label className="relField">Fallas para incidente<input type="number" min={1} max={10} value={Number(value.failureThreshold)} onChange={(event) => set("failureThreshold", Number(event.target.value))} /></label>
        <label className="relField">Éxitos para recuperar<input type="number" min={1} max={10} value={Number(value.recoveryThreshold)} onChange={(event) => set("recoveryThreshold", Number(event.target.value))} /></label>
        <label className="relField">Contenido esperado<input maxLength={200} value={String(value.expectedContent)} onChange={(event) => set("expectedContent", event.target.value)} /></label>
      </fieldset>
      <fieldset><legend>Umbrales</legend>
        <label className="relField">Latencia advertencia (ms)<input type="number" value={String(value.warningLatencyMs)} onChange={(event) => set("warningLatencyMs", event.target.value)} /></label>
        <label className="relField">Latencia crítica (ms)<input type="number" value={String(value.criticalLatencyMs)} onChange={(event) => set("criticalLatencyMs", event.target.value)} /></label>
        <label className="relField">Severidad<select value={String(value.incidentSeverity)} onChange={(event) => set("incidentSeverity", event.target.value)}><option value="">Según reglas</option>{incidentSeverities.map((item) => <option key={item} value={item}>{severityLabel[item]}</option>)}</select></label>
      </fieldset>
      <footer><button className="relBtn primary" disabled={busy}>{busy ? "Guardando…" : "Guardar configuración"}</button></footer>
    </form>
  </Panel>;
}
function draftOf(monitor: MonitorView) {
  return { name: monitor.endpointName, url: monitor.url, intervalSeconds: monitor.intervalSeconds, timeoutMs: monitor.timeoutMs, expectedStatus: monitor.expectedStatusMin === monitor.expectedStatusMax ? String(monitor.expectedStatusMin) : `${monitor.expectedStatusMin}-${monitor.expectedStatusMax}`, failureThreshold: monitor.failureThreshold, recoveryThreshold: monitor.recoveryThreshold, expectedContent: monitor.expectedContent ?? "", warningLatencyMs: monitor.warningLatencyMs === null ? "" : String(monitor.warningLatencyMs), criticalLatencyMs: monitor.criticalLatencyMs === null ? "" : String(monitor.criticalLatencyMs), incidentSeverity: monitor.incidentSeverity ?? "" } as Record<string, string | number | boolean>;
}

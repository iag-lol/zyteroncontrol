"use client";

import { useEffect, useMemo, useState } from "react";
import type { OperationsProject } from "@zyteron/contracts";
import type { AlertRule, AlertTarget, MaintenanceWindow, MonitoringSettings } from "@zyteron/contracts/monitoring";
import { alertChannels, alertTargets, incidentSeverities } from "@zyteron/contracts/monitoring";
import { BellRing, CalendarClock, Plus, Settings2, SlidersHorizontal, Wrench, XCircle } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { monitoringApi } from "@/lib/monitoring-api";
import { formatDate, formatDateTime, formatTime, santiagoToIso, severityLabel } from "@/lib/monitoring-format";
import { operationsApi } from "@/lib/operations-api";
import { can, MonitoringShell, useScope } from "./shell";
import { Empty, ErrorBox, Loading, Modal, Notice, Panel, useAction, useMonitoringQuery } from "./ui";

export function MaintenancePage() { return <MonitoringShell section="maintenance" title="Ventanas de mantenimiento" subtitle="Durante una ventana los checks siguen registrando evidencia (o se pausan, según el monitor) y las alertas se suprimen si así se configura."><MaintenanceBody /></MonitoringShell>; }

const maintenanceStatus: Record<MaintenanceWindow["status"], string> = { PLANNED: "Planificada", ACTIVE: "Activa", COMPLETED: "Completada", CANCELLED: "Cancelada" };

function MaintenanceBody() {
  const { role } = useAccess();
  const scope = useScope();
  const query = useMonitoringQuery(() => monitoringApi.maintenance(role), [role]);
  const action = useAction(query.reload);
  const [creating, setCreating] = useState(false);
  const windows = query.data ?? [];
  const groups: Array<[string, MaintenanceWindow[]]> = [["Activas", windows.filter((w) => w.status === "ACTIVE")], ["Planificadas", windows.filter((w) => w.status === "PLANNED").sort((a, b) => a.startsAt.localeCompare(b.startsAt))], ["Historial", windows.filter((w) => ["COMPLETED", "CANCELLED"].includes(w.status))]];
  return <>
    {action.notice ? <Notice tone={action.notice.tone} text={action.notice.text} onClose={() => action.setNotice(null)} /> : null}
    <div className="relFilters"><span className="relChip">Horario America/Santiago · persistido en UTC</span>{can(scope, "maintenance.create") ? <button className="relBtn primary" style={{ marginLeft: "auto" }} onClick={() => setCreating(true)}><Plus size={14} aria-hidden />Programar ventana</button> : null}</div>
    {query.loading && !query.data ? <Loading height={240} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : <div className="relStack">{groups.map(([title, items]) => <Panel key={title} title={title} icon={title === "Historial" ? CalendarClock : Wrench} count={items.length}>
      {!items.length ? <Empty title={title === "Activas" ? "No hay mantenimientos en curso." : title === "Planificadas" ? "No hay ventanas planificadas." : "Sin ventanas finalizadas."} icon={Wrench} /> : <div className="relTableWrap"><table className="relTable"><thead><tr><th>Ventana</th><th>Proyecto / endpoint</th><th>Inicio</th><th>Término</th><th>Alertas</th><th>Cliente</th><th>Estado</th><th /></tr></thead><tbody>
        {items.map((w) => <tr key={w.id}><td><strong>{w.title}</strong>{w.description ? <><br /><small className="relMuted">{w.description}</small></> : null}</td><td>{w.projectName}<br /><small className="relMuted">{w.endpointName ?? "Todos los endpoints del proyecto"}</small></td><td className="relMono">{formatDateTime(w.startsAt)}</td><td className="relMono">{formatDateTime(w.endsAt)}</td><td>{w.suppressAlerts ? "Suprimidas" : "Activas"}</td><td>{w.clientVisibility === "CLIENT_VISIBLE" ? "Visible" : "Interna"}</td><td><span className="relChip">{maintenanceStatus[w.status]}</span></td>
          <td>{["PLANNED", "ACTIVE"].includes(w.status) && (can(scope, "maintenance.manage") || can(scope, "maintenance.create")) ? <span style={{ display: "flex", gap: 6 }}>{w.status === "ACTIVE" ? <button className="relBtn small" onClick={() => void action.run("Ventana extendida 1 hora.", () => monitoringApi.updateMaintenance(role, w.id, { endsAt: new Date(new Date(w.endsAt).getTime() + 3_600_000).toISOString() }))}>+1 h</button> : null}<button className="relBtn small danger" onClick={() => { if (window.confirm(`¿Cancelar la ventana «${w.title}»?`)) void action.run("Ventana cancelada.", () => monitoringApi.cancelMaintenance(role, w.id)); }}><XCircle size={12} aria-hidden />Cancelar</button></span> : null}</td></tr>)}
      </tbody></table></div>}
    </Panel>)}</div>}
    {creating ? <MaintenanceModal onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); action.setNotice({ tone: "success", text: "Ventana de mantenimiento programada." }); await query.reload(); }} /> : null}
  </>;
}

export function MaintenanceModal({ onClose, onSaved, presetProjectId }: { onClose: () => void; onSaved: () => Promise<void>; presetProjectId?: string }) {
  const { role } = useAccess();
  const [projects, setProjects] = useState<OperationsProject[]>([]);
  const inOneHour = new Date(Date.now() + 3_600_000), inTwoHours = new Date(Date.now() + 7_200_000);
  const [value, setValue] = useState({ projectId: presetProjectId ?? "", endpointId: "", title: "", description: "", startDate: formatDate(inOneHour), startTime: formatTime(inOneHour), endDate: formatDate(inTwoHours), endTime: formatTime(inTwoHours), suppressAlerts: true, clientVisibility: "INTERNAL", clientSummary: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const monitors = useMonitoringQuery(() => value.projectId ? monitoringApi.monitors(role, { projectId: value.projectId }) : Promise.resolve([]), [role, value.projectId]);
  useEffect(() => { void operationsApi.projects(role).then((page) => setProjects(page.items)).catch(() => setProjects([])); }, [role]);
  const set = (key: string, entry: string | boolean) => setValue((current) => ({ ...current, [key]: entry }));
  const submit = async () => {
    const startsAt = santiagoToIso(value.startDate, value.startTime), endsAt = santiagoToIso(value.endDate, value.endTime);
    if (!startsAt || !endsAt) { setError("Usa fechas DD-MM-AAAA y horas HH:mm (24 h) válidas."); return; }
    setBusy(true); setError("");
    try { await monitoringApi.createMaintenance(role, { projectId: value.projectId, endpointId: value.endpointId || null, title: value.title, description: value.description || null, startsAt, endsAt, suppressAlerts: value.suppressAlerts, clientVisibility: value.clientVisibility, clientSummary: value.clientSummary || null }); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible programar la ventana."); } finally { setBusy(false); }
  };
  return <Modal title="Programar mantenimiento" onClose={onClose}>
    {error ? <ErrorBox error={error} /> : null}
    <form className="relForm" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className="relField wide">Proyecto<select required value={value.projectId} onChange={(event) => { set("projectId", event.target.value); set("endpointId", ""); }}><option value="">Seleccionar</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.projectNumber} · {project.name}</option>)}</select></label>
      <label className="relField wide">Endpoint<select value={value.endpointId} onChange={(event) => set("endpointId", event.target.value)}><option value="">Todos los endpoints del proyecto</option>{(monitors.data ?? []).map((monitor) => <option key={monitor.endpointId} value={monitor.endpointId}>{monitor.endpointName}</option>)}</select></label>
      <label className="relField wide">Título<input required maxLength={160} value={value.title} onChange={(event) => set("title", event.target.value)} placeholder="Migración de base de datos" /></label>
      <label className="relField">Inicio (DD-MM-AAAA)<input required pattern="\d{2}-\d{2}-\d{4}" value={value.startDate} onChange={(event) => set("startDate", event.target.value)} /></label>
      <label className="relField">Hora inicio (HH:mm)<input required pattern="\d{2}:\d{2}" value={value.startTime} onChange={(event) => set("startTime", event.target.value)} /></label>
      <label className="relField">Término (DD-MM-AAAA)<input required pattern="\d{2}-\d{2}-\d{4}" value={value.endDate} onChange={(event) => set("endDate", event.target.value)} /></label>
      <label className="relField">Hora término (HH:mm)<input required pattern="\d{2}:\d{2}" value={value.endTime} onChange={(event) => set("endTime", event.target.value)} /></label>
      <label className="relField wide">Descripción interna<textarea value={value.description} onChange={(event) => set("description", event.target.value)} /></label>
      <label className="relCheck wide"><input type="checkbox" checked={value.suppressAlerts} onChange={(event) => set("suppressAlerts", event.target.checked)} />Suprimir incidentes y alertas durante la ventana (la evidencia se conserva)</label>
      <label className="relField">Visibilidad cliente<select value={value.clientVisibility} onChange={(event) => set("clientVisibility", event.target.value)}><option value="INTERNAL">Interna</option><option value="CLIENT_VISIBLE">Visible en portal</option></select></label>
      <label className="relField">Resumen para cliente<input maxLength={500} value={value.clientSummary} onChange={(event) => set("clientSummary", event.target.value)} placeholder="Mantención programada del sitio" /></label>
      <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary" disabled={busy}>{busy ? "Guardando…" : "Programar"}</button></footer>
    </form>
  </Modal>;
}

export function AlertRulesPage() { return <MonitoringShell section="alert-rules" title="Reglas de alerta" subtitle="Destinatarios dinámicos por rol del proyecto, escalamiento por tiempo sin reconocimiento y deduplicación por etapa."><AlertRulesBody /></MonitoringShell>; }

const targetLabel: Record<AlertTarget, string> = { ENDPOINT_RESPONSIBLE: "Responsable del endpoint", INCIDENT_ASSIGNEE: "Asignado al incidente", PROJECT_LEAD: "Project Lead", DEVELOPMENT_MANAGER: "Jefe de Desarrollo", GENERAL_MANAGER: "Gerencia General", PROJECT_MEMBERS: "Equipo del proyecto" };
const channelLabel: Record<string, string> = { IN_APP: "In-app", REALTIME: "Realtime", EMAIL: "Email", WEB_PUSH: "Web Push" };
const scopeLabel: Record<AlertRule["scopeType"], string> = { GLOBAL: "Global", CLIENT: "Cliente", PROJECT: "Proyecto", MONITOR: "Monitor" };

function AlertRulesBody() {
  const { role } = useAccess();
  const scope = useScope();
  const rules = useMonitoringQuery(() => monitoringApi.alertRules(role), [role]);
  const settings = useMonitoringQuery(() => monitoringApi.settings(role), [role]);
  const action = useAction(async () => { await rules.reload(); await settings.reload(); });
  const [editing, setEditing] = useState<AlertRule | "new" | null>(null);
  return <>
    {action.notice ? <Notice tone={action.notice.tone} text={action.notice.text} onClose={() => action.setNotice(null)} /> : null}
    <Notice tone="info" text="In-app y Realtime funcionan siempre. Email se envía sólo si RESEND_API_KEY y MONITORING_MAIL_FROM están configurados; Web Push queda registrado como «proveedor no configurado» hasta habilitar VAPID." />
    <div className="relFilters">{can(scope, "alert_rule.manage") ? <button className="relBtn primary" style={{ marginLeft: "auto" }} onClick={() => setEditing("new")}><Plus size={14} aria-hidden />Nueva regla</button> : null}</div>
    {rules.loading && !rules.data ? <Loading height={200} /> : rules.error ? <ErrorBox error={rules.error} /> : !rules.data?.length ? <Empty title="No existen reglas de alerta." text="Sin reglas no se envían notificaciones; los incidentes igual se registran." icon={BellRing} /> :
      <div className="relGrid two">{rules.data.map((rule) => <Panel key={rule.id} title={rule.name} icon={BellRing} actions={<>{rule.enabled ? <span className="relChip">Activa</span> : <span className="relChip">Inactiva</span>}{can(scope, "alert_rule.manage") ? <button className="relBtn small" onClick={() => setEditing(rule)}>Editar</button> : null}</>}>
        <dl className="relFacts"><div><dt>Alcance</dt><dd>{scopeLabel[rule.scopeType]}</dd></div><div><dt>Severidad mínima</dt><dd>{severityLabel[rule.minSeverity]}</dd></div><div style={{ gridColumn: "1/-1" }}><dt>Canales</dt><dd>{rule.channels.map((channel) => channelLabel[channel]).join(" · ")}</dd></div><div><dt>Sonido</dt><dd>{rule.soundProfile} · críticos {rule.criticalSoundProfile}</dd></div><div><dt>Recuperación avisa a</dt><dd>{rule.recoveryTargets.map((target) => targetLabel[target]).join(", ")}</dd></div></dl>
        <div className="relTimeline" style={{ marginTop: 12 }}>{rule.escalationPolicy.steps.map((step, index) => <article key={index} className={index ? "SYSTEM" : ""}><time>{step.afterMinutes ? `+${step.afterMinutes} min sin reconocer` : "Al confirmar"}</time><strong>{step.targets.map((target) => targetLabel[target]).join(", ")}</strong></article>)}{rule.escalationPolicy.criticalImmediateTargets.length ? <article><time>Severidad crítica</time><strong>{rule.escalationPolicy.criticalImmediateTargets.map((target) => targetLabel[target]).join(", ")} de inmediato</strong></article> : null}</div>
      </Panel>)}</div>}
    {settings.data ? <PoliciesPanel settings={settings.data.settings} severityRules={settings.data.severityRules} canEdit={can(scope, "monitoring.settings.manage")} onSave={(value) => action.run("Políticas actualizadas.", () => monitoringApi.updateSettings(role, value))} /> : null}
    {editing ? <RuleModal rule={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={async (value) => { const ok = await action.run(editing === "new" ? "Regla creada." : "Regla actualizada.", () => editing === "new" ? monitoringApi.createAlertRule(role, value) : monitoringApi.updateAlertRule(role, editing.id, value)); if (ok) setEditing(null); }} /> : null}
  </>;
}

function RuleModal({ rule, onClose, onSave }: { rule: AlertRule | null; onClose: () => void; onSave: (value: Record<string, unknown>) => Promise<void> }) {
  const { role } = useAccess();
  const monitors = useMonitoringQuery(() => monitoringApi.monitors(role), [role]);
  const [value, setValue] = useState({ name: rule?.name ?? "", scopeType: rule?.scopeType ?? "PROJECT", clientId: rule?.clientId ?? "", projectId: rule?.projectId ?? "", monitorId: rule?.monitorId ?? "", minSeverity: rule?.minSeverity ?? "INFO", enabled: rule?.enabled ?? true, channels: rule?.channels ?? ["IN_APP", "REALTIME"], soundProfile: rule?.soundProfile ?? "DEFAULT", criticalSoundProfile: rule?.criticalSoundProfile ?? "URGENT" });
  const [steps, setSteps] = useState(rule?.escalationPolicy.steps ?? [{ afterMinutes: 0, targets: ["ENDPOINT_RESPONSIBLE"] as AlertTarget[] }, { afterMinutes: 5, targets: ["PROJECT_LEAD"] as AlertTarget[] }, { afterMinutes: 15, targets: ["DEVELOPMENT_MANAGER"] as AlertTarget[] }]);
  const [critical, setCritical] = useState<AlertTarget[]>(rule?.escalationPolicy.criticalImmediateTargets ?? ["GENERAL_MANAGER"]);
  const clients = useMemo(() => [...new Map((monitors.data ?? []).filter((m) => m.clientId).map((m) => [m.clientId!, m.clientName ?? "Cliente"])).entries()], [monitors.data]);
  const projects = useMemo(() => [...new Map((monitors.data ?? []).map((m) => [m.projectId, m.projectName])).entries()], [monitors.data]);
  const toggle = <T,>(list: T[], item: T) => list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
  return <Modal title={rule ? "Editar regla" : "Nueva regla de alerta"} onClose={onClose}><form className="relForm" onSubmit={(event) => { event.preventDefault(); void onSave({ ...value, clientId: value.clientId || null, projectId: value.projectId || null, monitorId: value.monitorId || null, escalationPolicy: { steps, criticalImmediateTargets: critical } }); }}>
    <label className="relField wide">Nombre<input required maxLength={120} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} /></label>
    <label className="relField">Alcance<select value={value.scopeType} onChange={(event) => setValue({ ...value, scopeType: event.target.value as AlertRule["scopeType"] })}>{Object.entries(scopeLabel).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
    {value.scopeType === "CLIENT" ? <label className="relField">Cliente<select required value={value.clientId} onChange={(event) => setValue({ ...value, clientId: event.target.value })}><option value="">Seleccionar</option>{clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
    {value.scopeType === "PROJECT" ? <label className="relField">Proyecto<select required value={value.projectId} onChange={(event) => setValue({ ...value, projectId: event.target.value })}><option value="">Seleccionar</option>{projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
    {value.scopeType === "MONITOR" ? <label className="relField">Monitor<select required value={value.monitorId} onChange={(event) => setValue({ ...value, monitorId: event.target.value })}><option value="">Seleccionar</option>{(monitors.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.endpointName}</option>)}</select></label> : null}
    <label className="relField">Severidad mínima<select value={value.minSeverity} onChange={(event) => setValue({ ...value, minSeverity: event.target.value as AlertRule["minSeverity"] })}>{incidentSeverities.map((item) => <option key={item} value={item}>{severityLabel[item]}</option>)}</select></label>
    <fieldset><legend>Canales</legend>{alertChannels.map((channel) => <label className="relCheck" key={channel}><input type="checkbox" checked={value.channels.includes(channel)} onChange={() => setValue({ ...value, channels: toggle(value.channels, channel) })} />{channelLabel[channel]}</label>)}</fieldset>
    <fieldset style={{ gridTemplateColumns: "1fr" }}><legend>Escalamiento sin reconocimiento</legend>
      {steps.map((step, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 8, alignItems: "center" }}>
        <label className="relField">Minutos<input type="number" min={0} max={1440} disabled={index === 0} value={step.afterMinutes} onChange={(event) => setSteps(steps.map((entry, i) => i === index ? { ...entry, afterMinutes: Number(event.target.value) } : entry))} /></label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{alertTargets.map((target) => <label className="relCheck" key={target} style={{ fontSize: 11 }}><input type="checkbox" checked={step.targets.includes(target)} onChange={() => setSteps(steps.map((entry, i) => i === index ? { ...entry, targets: toggle(entry.targets, target) } : entry))} />{targetLabel[target]}</label>)}</div>
        {index ? <button type="button" className="relBtn small danger" onClick={() => setSteps(steps.filter((_, i) => i !== index))}>Quitar</button> : <span />}
      </div>)}
      <button type="button" className="relBtn small" onClick={() => setSteps([...steps, { afterMinutes: (steps.at(-1)?.afterMinutes ?? 0) + 15, targets: ["GENERAL_MANAGER"] }])}><Plus size={12} aria-hidden />Agregar paso</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><strong style={{ fontSize: 11 }}>Críticos, de inmediato:</strong>{alertTargets.map((target) => <label className="relCheck" key={target} style={{ fontSize: 11 }}><input type="checkbox" checked={critical.includes(target)} onChange={() => setCritical(toggle(critical, target))} />{targetLabel[target]}</label>)}</div>
    </fieldset>
    <label className="relField">Sonido<select value={value.soundProfile} onChange={(event) => setValue({ ...value, soundProfile: event.target.value as AlertRule["soundProfile"] })}><option value="DEFAULT">Estándar</option><option value="URGENT">Urgente</option><option value="SILENT">Silencio</option></select></label>
    <label className="relField">Sonido críticos<select value={value.criticalSoundProfile} onChange={(event) => setValue({ ...value, criticalSoundProfile: event.target.value as AlertRule["criticalSoundProfile"] })}><option value="URGENT">Urgente</option><option value="DEFAULT">Estándar</option><option value="SILENT">Silencio</option></select></label>
    <label className="relCheck wide"><input type="checkbox" checked={value.enabled} onChange={(event) => setValue({ ...value, enabled: event.target.checked })} />Regla activa</label>
    <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary">Guardar</button></footer>
  </form></Modal>;
}

function PoliciesPanel({ settings, severityRules, canEdit, onSave }: { settings: MonitoringSettings; severityRules: Array<{ id: string; name: string; environment: string | null; projectPriority: string | null; severity: keyof typeof severityLabel }>; canEdit: boolean; onSave: (value: Record<string, unknown>) => Promise<boolean> }) {
  const [value, setValue] = useState(settings);
  useEffect(() => setValue(settings), [settings]);
  const num = (key: keyof MonitoringSettings, label: string, hint: string) => <label className="relField">{label}<input type="number" disabled={!canEdit} value={value[key] === null ? "" : Number(value[key])} onChange={(event) => setValue({ ...value, [key]: event.target.value === "" ? null : Number(event.target.value) })} /><small>{hint}</small></label>;
  return <div className="relGrid two" style={{ marginTop: 12 }}>
    <Panel title="Políticas de incidentes y retención" icon={Settings2}><form className="relForm" onSubmit={(event) => { event.preventDefault(); void onSave({ ...value }); }}>
      {num("reopenWindowMinutes", "Ventana de reapertura (min)", "Nueva caída dentro de la ventana reabre el incidente; fuera de ella crea uno nuevo.")}
      <label className="relField">Al recuperar<select disabled={!canEdit} value={value.recoveryPolicy} onChange={(event) => setValue({ ...value, recoveryPolicy: event.target.value as MonitoringSettings["recoveryPolicy"] })}><option value="MONITORING">Pasar a observación</option><option value="AUTO_RESOLVE">Resolver automáticamente</option></select></label>
      {num("autoResolveAfterMinutes", "Auto-resolver tras observación (min)", "Vacío = resolución manual.")}
      <label className="relField">Mantenimiento en uptime<select disabled={!canEdit} value={value.uptimeMaintenancePolicy} onChange={(event) => setValue({ ...value, uptimeMaintenancePolicy: event.target.value as MonitoringSettings["uptimeMaintenancePolicy"] })}><option value="EXCLUDE">Excluir checks en mantenimiento</option><option value="INCLUDE">Incluirlos</option></select></label>
      {num("rawRetentionDays", "Retención checks crudos (días)", "7–90; luego quedan agregados.")}
      {num("dailyRetentionDays", "Retención agregados diarios (días)", "Base para uptime 90 d e informes.")}
      {num("sslWarningDays", "SSL «por vencer» (días)", "Umbral visual de certificados.")}
      {num("manualCheckCooldownSeconds", "Cooldown CHECK NOW (s)", "Evita ráfagas manuales sobre un mismo sitio.")}
      {canEdit ? <footer><button className="relBtn primary">Guardar políticas</button></footer> : null}
    </form></Panel>
    <Panel title="Reglas de severidad" icon={SlidersHorizontal} count={severityRules.length}><table className="relTable"><thead><tr><th>Regla</th><th>Ambiente</th><th>Prioridad</th><th>Severidad</th></tr></thead><tbody>{severityRules.map((rule) => <tr key={rule.id}><td>{rule.name}</td><td>{rule.environment ?? "Cualquiera"}</td><td>{rule.projectPriority ?? "Cualquiera"}</td><td>{severityLabel[rule.severity]}</td></tr>)}</tbody></table><small className="relMuted">Orden de resolución: severidad fijada en el monitor → regla más específica → Media. Postmortem requerido para: {settings.postmortemSeverities.map((severity) => severityLabel[severity]).join(", ")}.</small></Panel>
  </div>;
}


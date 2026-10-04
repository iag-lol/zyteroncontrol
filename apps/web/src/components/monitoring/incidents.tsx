"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserDirectoryItem } from "@zyteron/contracts";
import type { Incident, IncidentDetail } from "@zyteron/contracts/monitoring";
import { incidentSeverities, incidentStatuses } from "@zyteron/contracts/monitoring";
import { ArrowLeft, Bug, CheckCheck, ClipboardList, Download, Eye, FileText, GitCommitHorizontal, Hand, History, ListPlus, MessageSquare, Search, Shield, Siren, UserRoundCog, Wrench } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { usersDirectoryApi } from "@/lib/client-domain-api";
import { monitoringApi } from "@/lib/monitoring-api";
import { environmentLabel, errorTypeLabel, formatDateTime, formatDuration, formatMs, incidentStatusLabel, isActiveIncident, severityLabel } from "@/lib/monitoring-format";
import { IncidentQueue } from "./command-center";
import { can, MonitoringShell, useScope } from "./shell";
import { Empty, ErrorBox, IncidentStatusChip, Loading, Modal, Notice, Panel, SeverityBadge, StatusPill, useAction, useMonitoringQuery } from "./ui";

export function IncidentsPage() {
  return <MonitoringShell section="incidents" title="Incidentes" subtitle="Caídas confirmadas por umbral, su ciclo de vida completo y la evidencia que las respalda."><IncidentsBody /></MonitoringShell>;
}

function IncidentsBody() {
  const { role } = useAccess();
  const scope = useScope();
  const params = useSearchParams();
  const [filters, setFilters] = useState({ state: params.get("state") ?? "open", severity: "", status: "", assignedTo: "", page: 1 });
  const query = useMonitoringQuery(() => monitoringApi.incidents(role, { ...filters, severity: filters.severity || undefined, status: filters.status || undefined, assignedTo: filters.assignedTo || undefined, pageSize: 25 }), [role, filters.state, filters.severity, filters.status, filters.assignedTo, filters.page]);
  const [error, setError] = useState("");
  return <>
    {error ? <ErrorBox error={error} /> : null}
    <div className="relFilters" role="search">
      <label>Vista<select value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value, page: 1 })}><option value="open">Activos</option><option value="closed">Resueltos y cerrados</option><option value="all">Todos</option></select></label>
      <label>Severidad<select value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value, page: 1 })}><option value="">Todas</option>{incidentSeverities.map((value) => <option key={value} value={value}>{severityLabel[value]}</option>)}</select></label>
      <label>Estado<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">Todos</option>{incidentStatuses.map((value) => <option key={value} value={value}>{incidentStatusLabel[value]}</option>)}</select></label>
      <label>Asignación<select value={filters.assignedTo} onChange={(event) => setFilters({ ...filters, assignedTo: event.target.value, page: 1 })}><option value="">Todas</option><option value="me">Asignados a mí</option></select></label>
      {can(scope, "monitoring.export") ? <button className="relBtn" style={{ marginLeft: "auto" }} onClick={() => void monitoringApi.download(role, "incidents").catch((cause: Error) => setError(cause.message))}><Download size={13} aria-hidden />Exportar CSV</button> : null}
    </div>
    <Panel title={filters.state === "open" ? "Incidentes activos" : "Incidentes"} icon={Siren} count={query.data?.total}>
      {query.loading && !query.data ? <Loading height={240} /> : query.error ? <ErrorBox error={query.error} retry={() => void query.reload()} /> : <IncidentQueue incidents={query.data?.items ?? []} empty={filters.state === "open" ? "No hay incidentes activos." : "No hay incidentes para los filtros seleccionados."} />}
      {query.data && query.data.totalPages > 1 ? <div className="relActions" style={{ marginTop: 10, justifyContent: "flex-end" }}><button className="relBtn small" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button><span className="relMuted" style={{ fontSize: 11, alignSelf: "center" }}>Página {query.data.page} de {query.data.totalPages}</span><button className="relBtn small" disabled={filters.page >= query.data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button></div> : null}
    </Panel>
  </>;
}

export function IncidentDetailPage({ id }: { id: string }) {
  return <MonitoringShell section="incident" title="Incident Command" subtitle="Coordina reconocimiento, investigación, mitigación y resolución con trazabilidad completa."><IncidentBody id={id} /></MonitoringShell>;
}

type Dialog = "assign" | "resolve" | "task" | "bug" | "visibility" | null;

function IncidentBody({ id }: { id: string }) {
  const { role } = useAccess();
  const scope = useScope();
  const query = useMonitoringQuery(() => monitoringApi.incident(role, id), [role, id]);
  const action = useAction(query.reload);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { void usersDirectoryApi.list(role).then(setUsers).catch(() => setUsers([])); }, [role]);
  if (query.loading && !query.data) return <Loading height={360} />;
  if (query.error && !query.data) return <ErrorBox error={query.error} retry={() => void query.reload()} />;
  if (!query.data) return null;
  const detail: IncidentDetail = query.data, incident = detail.incident;
  const active = isActiveIncident(incident.status);
  const person = (userId: string | null) => userId ? users.find((user) => user.id === userId)?.name ?? `Usuario ${userId.slice(0, 8)}` : "Sin asignar";
  const elapsed = active ? (now - new Date(incident.confirmedAt ?? incident.detectedAt).getTime()) / 1000 : null;
  const transitions = detail.allowedTransitions;
  return <>
    <div className="relActions"><Link className="relBtn small" href="/monitoring/incidents"><ArrowLeft size={13} aria-hidden />Incidentes</Link></div>
    {action.notice ? <Notice tone={action.notice.tone} text={action.notice.text} onClose={() => action.setNotice(null)} /> : null}
    <section className={`relBanner ${active ? incident.severity : "resolved"}`} aria-label="Resumen del incidente">
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}><span className="relMono" style={{ fontWeight: 900 }}>{incident.incidentNumber}</span><SeverityBadge severity={incident.severity} /><IncidentStatusChip status={incident.status} />{incident.reopenedCount ? <span className="relChip">Reabierto {incident.reopenedCount}×</span> : null}{incident.clientVisibility === "CLIENT_VISIBLE" ? <span className="relChip"><Eye size={11} aria-hidden />Visible al cliente</span> : null}</div>
        <h2>{incident.title}</h2>
        <p>{incident.clientName ?? "Sin cliente"} · {incident.projectName} · {incident.endpointName ?? "Sin endpoint"} {incident.environment ? `· ${environmentLabel[incident.environment] ?? incident.environment}` : ""}</p>
      </div>
      <div className="relClock">{active ? <><small>Abierto hace</small><strong>{formatDuration(elapsed)}</strong><small>Confirmado {formatDateTime(incident.confirmedAt)}</small></> : <><small>Downtime</small><strong>{formatDuration(incident.downtimeSeconds)}</strong><small>Resuelto {formatDateTime(incident.resolvedAt)}</small></>}</div>
    </section>
    <div className="relActions" role="toolbar" aria-label="Acciones del incidente">
      {active && !incident.acknowledgedAt && can(scope, "incident.acknowledge") ? <button className="relBtn primary" disabled={action.busy} onClick={() => void action.run("Incidente reconocido.", () => monitoringApi.acknowledge(role, incident.id))}><Hand size={14} aria-hidden />Acknowledge</button> : null}
      {can(scope, "incident.assign") && incident.status !== "CLOSED" ? <button className="relBtn" onClick={() => setDialog("assign")}><UserRoundCog size={14} aria-hidden />Asignar</button> : null}
      {transitions.includes("INVESTIGATING") ? <button className="relBtn" disabled={action.busy} onClick={() => void action.run(incident.status === "RESOLVED" ? "Incidente reabierto para investigación." : "Investigación iniciada.", () => monitoringApi.changeStatus(role, incident.id, "INVESTIGATING"))}><Search size={14} aria-hidden />{incident.status === "RESOLVED" ? "Reabrir" : "Investigar"}</button> : null}
      {transitions.includes("MITIGATING") ? <button className="relBtn" disabled={action.busy} onClick={() => void action.run("Mitigación en curso.", () => monitoringApi.changeStatus(role, incident.id, "MITIGATING"))}><Shield size={14} aria-hidden />Mitigar</button> : null}
      {transitions.includes("MONITORING") ? <button className="relBtn" disabled={action.busy} onClick={() => void action.run("Incidente en observación.", () => monitoringApi.changeStatus(role, incident.id, "MONITORING"))}><Eye size={14} aria-hidden />Observar</button> : null}
      {active && can(scope, "incident.resolve") ? <button className="relBtn lime" onClick={() => setDialog("resolve")}><CheckCheck size={14} aria-hidden />Resolver</button> : null}
      {can(scope, "incident.manage") && incident.status !== "CLOSED" ? <button className="relBtn" onClick={() => setDialog("task")}><ListPlus size={14} aria-hidden />Crear tarea</button> : null}
      {can(scope, "incident.manage") && incident.status !== "CLOSED" ? <button className="relBtn" onClick={() => setDialog("bug")}><Bug size={14} aria-hidden />Vincular bug</button> : null}
      {can(scope, "incident.assign") ? <button className="relBtn" onClick={() => setDialog("visibility")}><Eye size={14} aria-hidden />Visibilidad cliente</button> : null}
      {["RESOLVED", "POSTMORTEM_REQUIRED"].includes(incident.status) && can(scope, "incident.resolve") ? <button className="relBtn" disabled={action.busy || (incident.postmortemRequired && !incident.postmortemCompletedAt)} title={incident.postmortemRequired && !incident.postmortemCompletedAt ? "Completa el postmortem para cerrar" : undefined} onClick={() => void action.run("Incidente cerrado.", () => monitoringApi.close(role, incident.id))}><FileText size={14} aria-hidden />Cerrar</button> : null}
    </div>
    <div className="relGrid command">
      <div className="relStack">
        <Panel title="Timeline" icon={History} count={detail.events.length}><div className="relTimeline">{detail.events.map((event) => <article key={event.id} className={event.actorType}><time>{formatDateTime(event.occurredAt)}</time><strong>{eventLabel(event.eventType)}{event.toStatus && event.fromStatus ? ` · ${incidentStatusLabel[event.fromStatus as keyof typeof incidentStatusLabel] ?? event.fromStatus} → ${incidentStatusLabel[event.toStatus as keyof typeof incidentStatusLabel] ?? event.toStatus}` : ""}</strong><p>{event.actorType === "SYSTEM" ? "Sistema" : person(event.actorId)}{event.message ? ` · ${event.message}` : ""}</p></article>)}</div>
          {can(scope, "incident.acknowledge") ? <NoteForm onSubmit={(body) => action.run("Nota registrada.", () => monitoringApi.comment(role, incident.id, body))} /> : null}
        </Panel>
        <Panel title="Checks relacionados" icon={GitCommitHorizontal} count={detail.recentChecks.length}>{detail.recentChecks.length ? <>
          <div className="relCheckDots" aria-label="Secuencia de checks (izquierda = más antiguo)">{[...detail.recentChecks].reverse().map((check) => <span key={check.id} className={check.inMaintenance ? "maint" : check.success ? "" : "fail"} title={`${formatDateTime(check.checkedAt)} · ${check.success ? "OK" : "Falla"} ${check.statusCode ?? ""}`} />)}</div>
          <div className="relTableWrap" style={{ marginTop: 10 }}><table className="relTable"><thead><tr><th>Fecha</th><th>Resultado</th><th className="num">Status</th><th className="num">Latencia</th><th>Error</th></tr></thead><tbody>{detail.recentChecks.slice(0, 15).map((check) => <tr key={check.id}><td className="relMono">{formatDateTime(check.checkedAt)}</td><td>{check.success ? "OK" : "Falla"}</td><td className="num">{check.statusCode ?? "—"}</td><td className="num">{formatMs(check.latencyMs)}</td><td>{check.errorType ? errorTypeLabel[check.errorType] ?? check.errorType : "—"}</td></tr>)}</tbody></table></div>
        </> : <Empty title="Sin checks asociados." text="Incidentes manuales no tienen evidencia automática." />}</Panel>
        <Postmortem incident={incident} canEdit={can(scope, "incident.manage")} onSave={(value) => action.run("Postmortem actualizado.", () => monitoringApi.postmortem(role, incident.id, value))} />
      </div>
      <div className="relStack">
        <Panel title="Ficha" icon={ClipboardList}><dl className="relFacts">
          <div><dt>Responsable</dt><dd>{person(incident.assignedTo)}</dd></div><div><dt>Reconocido por</dt><dd>{incident.acknowledgedAt ? `${person(incident.acknowledgedBy)} · ${formatDateTime(incident.acknowledgedAt)}` : "Pendiente"}</dd></div>
          <div><dt>Primera falla</dt><dd>{formatDateTime(incident.detectedAt)}</dd></div><div><dt>Confirmado</dt><dd>{formatDateTime(incident.confirmedAt)}</dd></div>
          <div><dt>Tiempo a reconocer</dt><dd>{incident.acknowledgedAt && incident.confirmedAt ? formatDuration((new Date(incident.acknowledgedAt).getTime() - new Date(incident.confirmedAt).getTime()) / 1000) : "—"}</dd></div><div><dt>Recuperado</dt><dd>{formatDateTime(incident.recoveredAt)}</dd></div>
          <div><dt>Downtime</dt><dd>{formatDuration(incident.downtimeSeconds)}</dd></div><div><dt>Escalamiento</dt><dd>Nivel {incident.escalationLevel}</dd></div>
          <div style={{ gridColumn: "1/-1" }}><dt>Endpoint</dt><dd>{incident.endpointId ? <Link href={`/monitoring/endpoints/${incident.endpointId}`}>{incident.endpointName}</Link> : "—"} <span className="relMono relMuted">{incident.endpointUrl}</span></dd></div>
          <div style={{ gridColumn: "1/-1" }}><dt>Descripción interna</dt><dd>{incident.description ?? "—"}</dd></div>
          {incident.clientSummary ? <div style={{ gridColumn: "1/-1" }}><dt>Resumen para cliente</dt><dd>{incident.clientSummary}</dd></div> : null}
        </dl>{detail.monitor ? <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>Estado actual del endpoint: <StatusPill status={detail.monitor.status} /></div> : null}</Panel>
        <Panel title="Deployments recientes" icon={GitCommitHorizontal} count={detail.deployments.length}>{detail.deployments.length ? <><p className="relMuted" style={{ fontSize: 11, marginTop: 0 }}>Contexto temporal (48 h previas a la primera falla). No implica causalidad.</p><div className="relQueue">{detail.deployments.map((deployment) => <div className="relIncidentRow" key={deployment.id}><i className="LOW" /><div><strong>{deployment.version} · {environmentLabel[deployment.environment] ?? deployment.environment}</strong><small>{deployment.status} · {deployment.recordType === "MANUAL_RECORD" ? "registro manual" : "integración"} · {formatDateTime(deployment.completedAt ?? deployment.createdAt)}</small></div><aside><span className="relMono">{deployment.minutesBeforeDetection !== null ? `${formatDuration(deployment.minutesBeforeDetection * 60)} antes` : ""}</span></aside></div>)}</div></> : <Empty title="Sin deployments en las 48 h previas." />}</Panel>
        <Panel title="Vínculos" icon={Wrench} count={detail.links.length}>{detail.links.length ? <div className="relQueue">{detail.links.map((link) => <div className="relIncidentRow" key={link.id}><i className={link.linkType === "TASK" ? "LOW" : "MEDIUM"} /><div><strong>{link.linkType === "TASK" ? "Tarea correctiva" : link.linkType === "BUG" ? "Bug" : link.linkType}</strong><small>{link.linkType === "TASK" && link.targetId ? <Link href={`/tasks?taskId=${link.targetId}`}>Ver en Operaciones</Link> : link.externalReference ?? link.targetId}</small></div><aside>{formatDateTime(link.createdAt)}</aside></div>)}</div> : <Empty title="Sin tareas ni bugs vinculados." />}</Panel>
      </div>
    </div>
    {dialog === "assign" ? <AssignDialog users={users} current={incident.assignedTo} onClose={() => setDialog(null)} onSubmit={async (userId, note) => { if (await action.run("Incidente reasignado.", () => monitoringApi.assign(role, incident.id, userId, note))) setDialog(null); }} /> : null}
    {dialog === "resolve" ? <ResolveDialog incident={incident} onClose={() => setDialog(null)} onSubmit={async (value) => { if (await action.run(incident.postmortemRequired ? "Incidente resuelto; postmortem pendiente." : "Incidente resuelto.", () => monitoringApi.resolve(role, incident.id, value))) setDialog(null); }} /> : null}
    {dialog === "task" ? <TaskDialog incident={incident} users={users} onClose={() => setDialog(null)} onSubmit={async (value) => { if (await action.run("Tarea correctiva creada en Operaciones.", () => monitoringApi.createTask(role, incident.id, value))) setDialog(null); }} /> : null}
    {dialog === "bug" ? <BugDialog onClose={() => setDialog(null)} onSubmit={async (value) => { if (await action.run("Bug vinculado.", () => monitoringApi.linkBug(role, incident.id, value))) setDialog(null); }} /> : null}
    {dialog === "visibility" ? <VisibilityDialog incident={incident} onClose={() => setDialog(null)} onSubmit={async (value) => { if (await action.run("Visibilidad actualizada.", () => monitoringApi.visibility(role, incident.id, value))) setDialog(null); }} /> : null}
  </>;
}

const eventNames: Record<string, string> = { DETECTED: "Primera falla detectada", CONFIRMED: "Incidente confirmado", ACKNOWLEDGED: "Reconocido", ASSIGNED: "Asignado", COMMENT: "Nota", STATUS_CHANGED: "Cambio de estado", RECOVERY_DETECTED: "Recuperación detectada", RESOLVED: "Resuelto", REOPENED: "Reabierto", RELAPSED: "Nueva falla en observación", ESCALATED: "Escalado", TASK_CREATED: "Tarea correctiva creada", BUG_LINKED: "Bug vinculado", POSTMORTEM_UPDATED: "Postmortem", CLOSED: "Cerrado", VISIBILITY_CHANGED: "Visibilidad cliente", SEVERITY_CHANGED: "Severidad" };
const eventLabel = (type: string) => eventNames[type] ?? type;

function NoteForm({ onSubmit }: { onSubmit: (body: string) => Promise<boolean> }) {
  const [body, setBody] = useState("");
  return <form style={{ display: "grid", gap: 8, marginTop: 8 }} onSubmit={async (event) => { event.preventDefault(); if (body.trim() && await onSubmit(body.trim())) setBody(""); }}>
    <label className="relField">Nota interna<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder="Hallazgos, comandos ejecutados, contacto con proveedor…" /><small>Las notas nunca se exponen al cliente.</small></label>
    <button className="relBtn small" style={{ justifySelf: "end" }} disabled={!body.trim()}><MessageSquare size={12} aria-hidden />Agregar nota</button>
  </form>;
}

function Postmortem({ incident, canEdit, onSave }: { incident: Incident; canEdit: boolean; onSave: (value: Record<string, string>) => Promise<boolean> }) {
  const [value, setValue] = useState({ rootCause: incident.rootCause ?? "", impact: incident.impact ?? "", resolution: incident.resolution ?? "", preventiveActions: incident.preventiveActions ?? "" });
  useEffect(() => { setValue({ rootCause: incident.rootCause ?? "", impact: incident.impact ?? "", resolution: incident.resolution ?? "", preventiveActions: incident.preventiveActions ?? "" }); }, [incident.rootCause, incident.impact, incident.resolution, incident.preventiveActions]);
  const fields: Array<[keyof typeof value, string, string]> = [["rootCause", "Causa raíz", "Qué falló y por qué (verificado, no supuesto)."], ["impact", "Impacto", "Usuarios, funcionalidades y duración afectada."], ["resolution", "Resolución", "Qué se hizo para restablecer el servicio."], ["preventiveActions", "Acciones preventivas", "Cambios para evitar recurrencia."]];
  return <Panel title={incident.postmortemRequired ? "Postmortem (requerido)" : "Causa raíz y resolución"} icon={FileText} actions={incident.postmortemCompletedAt ? <span className="relChip">Completo {formatDateTime(incident.postmortemCompletedAt)}</span> : incident.postmortemRequired ? <span className="relChip" style={{ background: "#fff4dc", color: "#80570a" }}>Pendiente</span> : undefined}>
    {canEdit && incident.status !== "CLOSED" ? <form className="relForm" onSubmit={(event) => { event.preventDefault(); void onSave(value); }}>
      {fields.map(([key, label, hint]) => <label className="relField wide" key={key}>{label}<textarea value={value[key]} onChange={(event) => setValue({ ...value, [key]: event.target.value })} maxLength={4000} /><small>{hint}</small></label>)}
      <footer><button className="relBtn primary">Guardar postmortem</button></footer>
    </form> : <dl className="relFacts">{fields.map(([key, label]) => <div key={key} style={{ gridColumn: "1/-1" }}><dt>{label}</dt><dd>{value[key] || "Sin registrar"}</dd></div>)}</dl>}
  </Panel>;
}

function AssignDialog({ users, current, onClose, onSubmit }: { users: UserDirectoryItem[]; current: string | null; onClose: () => void; onSubmit: (userId: string, note: string) => Promise<void> }) {
  const [userId, setUserId] = useState(current ?? ""); const [note, setNote] = useState("");
  return <Modal title="Asignar incidente" onClose={onClose}><form className="relForm" onSubmit={(event) => { event.preventDefault(); if (userId) void onSubmit(userId, note); }}>
    <label className="relField wide">Responsable<select required value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Seleccionar</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role ?? "sin rol"}</option>)}</select>{!users.length ? <small>El directorio de usuarios no está disponible para tu rol o entorno.</small> : null}</label>
    <label className="relField wide">Motivo<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Opcional" /></label>
    <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary" disabled={!userId}>Asignar</button></footer>
  </form></Modal>;
}

function ResolveDialog({ incident, onClose, onSubmit }: { incident: Incident; onClose: () => void; onSubmit: (value: { resolution: string; rootCause?: string }) => Promise<void> }) {
  const [resolution, setResolution] = useState(""); const [rootCause, setRootCause] = useState(incident.rootCause ?? "");
  return <Modal title={`Resolver ${incident.incidentNumber}`} onClose={onClose}><form className="relForm" onSubmit={(event) => { event.preventDefault(); void onSubmit({ resolution, rootCause: rootCause || undefined }); }}>
    <label className="relField wide">Resolución<textarea required minLength={10} value={resolution} onChange={(event) => setResolution(event.target.value)} /><small>Mínimo 10 caracteres. No se genera texto automático.</small></label>
    <label className="relField wide">Causa raíz (si ya está confirmada)<textarea value={rootCause} onChange={(event) => setRootCause(event.target.value)} /></label>
    {incident.postmortemRequired ? <p className="relMuted wide" style={{ fontSize: 11 }}>Severidad {severityLabel[incident.severity]}: quedará en «Postmortem pendiente» hasta completar el análisis.</p> : null}
    <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary" disabled={resolution.trim().length < 10}>Resolver</button></footer>
  </form></Modal>;
}

function TaskDialog({ incident, users, onClose, onSubmit }: { incident: Incident; users: UserDirectoryItem[]; onClose: () => void; onSubmit: (value: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState(`Corregir causa de ${incident.incidentNumber}: ${incident.title}`.slice(0, 200)); const [assignedTo, setAssignedTo] = useState(incident.assignedTo ?? "");
  return <Modal title="Crear tarea correctiva" eyebrow="Operaciones · tasks" onClose={onClose}><form className="relForm" onSubmit={(event) => { event.preventDefault(); void onSubmit({ title, assignedTo: assignedTo || null }); }}>
    <label className="relField wide">Título<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label className="relField wide">Responsable<select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}><option value="">Responsable del incidente</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><small>Se crea en el proyecto {incident.projectName} con prioridad según severidad y queda vinculada al incidente.</small></label>
    <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary">Crear tarea</button></footer>
  </form></Modal>;
}

function BugDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (value: { bugId?: string; reference?: string }) => Promise<void> }) {
  const [reference, setReference] = useState(""); const [bugId, setBugId] = useState("");
  return <Modal title="Vincular bug" eyebrow="Integración desacoplada con Desarrollo" onClose={onClose}><form className="relForm" onSubmit={(event) => { event.preventDefault(); void onSubmit({ bugId: bugId || undefined, reference: reference || undefined }); }}>
    <label className="relField wide">Referencia<input maxLength={200} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="BUG-142 o URL del issue" /></label>
    <label className="relField wide">ID del bug (UUID, opcional)<input value={bugId} onChange={(event) => setBugId(event.target.value)} /><small>Cuando el módulo Bugs de Desarrollo esté integrado, el vínculo apuntará al registro sin migrar datos.</small></label>
    <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary" disabled={!reference && !bugId}>Vincular</button></footer>
  </form></Modal>;
}

function VisibilityDialog({ incident, onClose, onSubmit }: { incident: Incident; onClose: () => void; onSubmit: (value: { clientVisibility: string; clientSummary?: string }) => Promise<void> }) {
  const [visible, setVisible] = useState(incident.clientVisibility === "CLIENT_VISIBLE"); const [summary, setSummary] = useState(incident.clientSummary ?? "");
  return <Modal title="Visibilidad para el cliente" eyebrow="Portal Cliente" onClose={onClose}><form className="relForm" onSubmit={(event) => { event.preventDefault(); void onSubmit({ clientVisibility: visible ? "CLIENT_VISIBLE" : "INTERNAL", clientSummary: summary || undefined }); }}>
    <label className="relCheck wide"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Mostrar este incidente en el portal del cliente</label>
    <label className="relField wide">Resumen para cliente<textarea maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Ej.: El sitio web presentó una interrupción breve; el servicio fue restablecido." /><small>Nunca incluyas IPs, errores técnicos ni notas internas. El portal sólo muestra este resumen, estado y tiempos.</small></label>
    <footer><button type="button" className="relBtn" onClick={onClose}>Cancelar</button><button className="relBtn primary" disabled={visible && !summary.trim()}>Guardar</button></footer>
  </form></Modal>;
}


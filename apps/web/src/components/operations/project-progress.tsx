"use client";

import { useState } from "react";
import type { OperationsProject, OperationsTask, ProjectMilestone, WorkLog } from "@zyteron/contracts";
import { Check, Clock3, Flag, Plus } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { formatDate } from "@/lib/date-time";
import type { OperationsCreateKind } from "@/lib/operations-form";

const taskLabels: Record<OperationsTask["status"], string> = {
  BACKLOG: "Por planificar", TODO: "Pendiente", IN_PROGRESS: "En curso", BLOCKED: "Bloqueada",
  REVIEW: "En revisión", QA: "En pruebas", DONE: "Terminada", CANCELLED: "Anulada",
};
// Las opciones respetan las transiciones que permite OperationsService.
const nextTaskStates: Record<OperationsTask["status"], OperationsTask["status"][]> = {
  BACKLOG: ["TODO", "CANCELLED"], TODO: ["BACKLOG", "IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["TODO", "BLOCKED", "REVIEW", "QA", "DONE", "CANCELLED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "CANCELLED"], REVIEW: ["IN_PROGRESS", "QA", "DONE"],
  QA: ["IN_PROGRESS", "REVIEW", "DONE"], DONE: ["IN_PROGRESS"], CANCELLED: [],
};
const milestoneLabels: Record<ProjectMilestone["status"], string> = {
  PLANNED: "Planificado", IN_PROGRESS: "En curso", AT_RISK: "En riesgo", BLOCKED: "Bloqueado",
  COMPLETED: "Completado", CANCELLED: "Anulado",
};
const projectLabels: Record<OperationsProject["status"], string> = {
  PLANNING: "Planificación", READY: "Listo para iniciar", IN_PROGRESS: "En desarrollo", BLOCKED: "Bloqueado",
  INTERNAL_REVIEW: "Revisión interna", QA: "Pruebas", WAITING_CLIENT: "Esperando al cliente",
  READY_FOR_PRODUCTION: "Listo para publicar", PRODUCTION: "En producción", MAINTENANCE: "Mantenimiento",
  COMPLETED: "Completado", ON_HOLD: "En pausa", CANCELLED: "Anulado", ARCHIVED: "Archivado",
};
const nextProjectStates: Record<OperationsProject["status"], OperationsProject["status"][]> = {
  PLANNING: ["READY", "ON_HOLD"], READY: ["IN_PROGRESS", "ON_HOLD"],
  IN_PROGRESS: ["BLOCKED", "INTERNAL_REVIEW", "QA", "WAITING_CLIENT", "ON_HOLD"],
  BLOCKED: ["IN_PROGRESS", "ON_HOLD"], INTERNAL_REVIEW: ["IN_PROGRESS", "QA", "WAITING_CLIENT"],
  QA: ["IN_PROGRESS", "READY_FOR_PRODUCTION", "WAITING_CLIENT"],
  WAITING_CLIENT: ["IN_PROGRESS", "INTERNAL_REVIEW", "QA", "ON_HOLD"],
  READY_FOR_PRODUCTION: ["PRODUCTION", "QA", "ON_HOLD"], PRODUCTION: ["MAINTENANCE", "COMPLETED", "IN_PROGRESS"],
  MAINTENANCE: ["COMPLETED", "IN_PROGRESS"], COMPLETED: ["MAINTENANCE"],
  ON_HOLD: ["PLANNING", "READY", "IN_PROGRESS"], CANCELLED: [], ARCHIVED: [],
};

interface Props {
  project: OperationsProject;
  tasks: OperationsTask[];
  milestones: ProjectMilestone[];
  worklogs: WorkLog[];
  create: (kind: OperationsCreateKind) => void;
  complete: (id: string) => Promise<void>;
  moveTask: (id: string, status: OperationsTask["status"], reason?: string) => Promise<void>;
  moveProject: (status: OperationsProject["status"]) => Promise<void>;
}

export function ProjectProgress({ project, tasks, milestones, worklogs, create, complete, moveTask, moveProject }: Props) {
  const { role } = useAccess();
  const [busy, setBusy] = useState(false);
  const canManage = ["GERENTE_GENERAL", "JEFE_DESARROLLO", "OPERACIONES"].includes(role);
  const canReport = ["GERENTE_GENERAL", "JEFE_DESARROLLO", "OPERACIONES", "TECH_LEAD", "PROGRAMADOR", "QA", "SOPORTE_TECNICO", "DESARROLLO"].includes(role);
  const activeMilestones = milestones.filter((item) => item.status !== "CANCELLED");
  const activeTasks = tasks.filter((item) => item.status !== "CANCELLED");
  const totalWeight = activeMilestones.reduce((sum, item) => sum + item.weight, 0);
  const doneWeight = activeMilestones.filter((item) => item.status === "COMPLETED").reduce((sum, item) => sum + item.weight, 0);
  const completedTasks = activeTasks.filter((item) => item.status === "DONE").length;
  const hasMilestones = totalWeight > 0;
  const recentLogs = [...worklogs].sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  return <section className="projectProgressPanel" aria-label="Informar avances del proyecto">
    <header>
      <div><small>SEGUIMIENTO DEL PROYECTO</small><h3>Informar avances</h3><p>El porcentaje se actualiza al completar hitos y terminar tareas.</p></div>
      <strong className="projectProgressValue">{project.progress}%</strong>
    </header>
    <div className="projectProgressActions">
      {canManage ? <button disabled={busy} onClick={() => create("milestone")}><Flag size={14}/>Crear hito</button> : null}
      {canReport ? <><button disabled={busy} onClick={() => create("task")}><Plus size={14}/>Crear tarea</button><button disabled={busy} onClick={() => create("worklog")}><Clock3 size={14}/>Registrar trabajo</button></> : null}
      {canManage ? <label>Etapa del proyecto<select aria-label="Etapa del proyecto" disabled={busy} value={project.status} onChange={(event) => void run(() => moveProject(event.target.value as OperationsProject["status"]))}>
        {[project.status, ...nextProjectStates[project.status]].map((status) => <option value={status} key={status}>{projectLabels[status]}</option>)}
      </select></label> : null}
    </div>
    <div className="projectProgressExplanation">
      <p>{hasMilestones && activeTasks.length ? "Hitos: 70% del avance · Tareas: 30%. Cada parte se calcula sobre lo completado de su plan."
        : hasMilestones ? "El avance corresponde al peso de los hitos completados sobre el peso total definido."
        : activeTasks.length ? "El avance corresponde a las tareas terminadas sobre el total de tareas del proyecto."
        : "Está en 0% porque todavía no hay hitos ni tareas. Crea las etapas del proyecto y las tareas que necesitas completar."}</p>
      <p>Registrar trabajo guarda lo que hiciste y las horas dedicadas. Para actualizar el porcentaje, completa el hito o cambia la tarea a Terminada. Cambiar la etapa del proyecto no cambia el porcentaje.</p>
    </div>
    <div className="projectProgressColumns">
      <article>
        <h4>Hitos <span>{doneWeight} / {totalWeight} puntos completados</span></h4>
        {activeMilestones.length ? <ul>{activeMilestones.map((item) => <li key={item.id}>
          <div><strong>{item.name}</strong><small>Peso {item.weight} · {milestoneLabels[item.status]}{item.dueDate ? ` · vence ${formatDate(item.dueDate)}` : ""}</small></div>
          {item.status === "COMPLETED" ? <span className="projectProgressDone"><Check size={14}/>Completado</span>
            : canReport ? <button disabled={busy} onClick={() => void run(() => complete(item.id))} aria-label={`Completar hito ${item.name}`}>Completar hito</button> : null}
        </li>)}</ul> : <p className="projectProgressEmpty">Define las etapas y su peso antes de marcar lo completado. Por ejemplo: análisis, desarrollo, pruebas y entrega.</p>}
      </article>
      <article>
        <h4>Tareas <span>{completedTasks} / {activeTasks.length} terminadas</span></h4>
        {activeTasks.length ? <ul>{activeTasks.map((item) => <li key={item.id}>
          <div><strong>{item.title}</strong><small>{item.dueDate ? `Vence ${formatDate(item.dueDate)}` : "Sin vencimiento"}{item.blockedReason ? ` · ${item.blockedReason}` : ""}</small></div>
          {canReport ? <select aria-label={`Estado de la tarea ${item.title}`} disabled={busy} value={item.status} onChange={(event) => {
            const status = event.target.value as OperationsTask["status"];
            const reason = status === "BLOCKED" ? window.prompt("¿Qué impide avanzar con esta tarea?")?.trim() : undefined;
            if (status === "BLOCKED" && !reason) return;
            void run(() => moveTask(item.id, status, reason));
          }}>{[item.status, ...nextTaskStates[item.status]].map((status) => <option key={status} value={status}>{taskLabels[status]}</option>)}</select> : <span>{taskLabels[item.status]}</span>}
        </li>)}</ul> : <p className="projectProgressEmpty">Agrega tareas concretas. Muévelas de Pendiente a En curso y a Terminada cuando hayas finalizado el trabajo.</p>}
      </article>
    </div>
    <article className="projectProgressLogs"><h4>Últimos trabajos informados</h4>
      {recentLogs.length ? <ul>{recentLogs.map((item) => <li key={item.id}><div><strong>{item.description}</strong><small>{formatDate(item.workDate)}</small></div><span>{Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}m</span></li>)}</ul>
        : <p className="projectProgressEmpty">Usa Registrar trabajo para dejar constancia de lo realizado, incluso mientras una tarea sigue en curso.</p>}
    </article>
  </section>;
}

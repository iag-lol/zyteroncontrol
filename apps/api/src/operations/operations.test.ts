import { BadRequestException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { OperationsRepository } from "./operations.repository.js";
import { OperationsService, type OperationsActor } from "./operations.service.js";

const managerId = "33333333-3333-4333-8333-333333333333";
const developerId = "44444444-4444-4444-8444-444444444444";
const manager: OperationsActor = { userId: managerId, role: "GERENTE_GENERAL" };

describe("Delivery Operations Center", () => {
  let repository: OperationsRepository;
  let service: OperationsService;
  beforeEach(() => { delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; repository = new OperationsRepository(); service = new OperationsService(repository); });

  async function plannedWorkOrder() {
    const order = await service.createWorkOrder({ title: "Portal cliente", scope: "Diseño, desarrollo y QA", priority: "HIGH" }, manager);
    await service.workOrderStatus(order.id, "READY_FOR_HANDOFF", null, manager);
    await service.acceptHandoff(order.id, manager);
    await service.planWorkOrder(order.id, { plannedStartDate: "2026-10-01", targetDate: "2026-11-15", estimatedHours: 120 }, manager);
    return service.assignWorkOrder(order.id, developerId, manager);
  }

  it("controla la máquina de estados de OT y exige planificación", async () => {
    const order = await service.createWorkOrder({ title: "Integración", scope: "API" }, manager);
    await expect(service.workOrderStatus(order.id, "COMPLETED", null, manager)).rejects.toBeInstanceOf(BadRequestException);
    const ready = await service.workOrderStatus(order.id, "READY_FOR_HANDOFF", null, manager);
    expect(ready.status).toBe("READY_FOR_HANDOFF");
    expect((await service.acceptHandoff(order.id, manager)).status).toBe("PENDING_PLANNING");
  });

  it("crea la OT manual en DRAFT aunque el cliente envíe un estado de otra entidad", async () => {
    const order = await service.createWorkOrder({ title: "Integración GPS", scope: "Implementación", status: "BACKLOG" }, manager);
    expect(order.status).toBe("DRAFT");
    expect(order.projectId).toBeTruthy();
    expect((await service.listProjects({ page: 1, pageSize: 25 }, manager)).total).toBe(1);
  });

  it("convierte una OT a un único proyecto aunque se repita la solicitud", async () => {
    const order = await plannedWorkOrder();
    const first = await service.convertWorkOrder(order.id, {}, "create-project-1", manager);
    const second = await service.convertWorkOrder(order.id, {}, "create-project-2", manager);
    expect(second.id).toBe(first.id);
    expect(first.projectNumber).toMatch(/^PRJ-\d{4}-\d{6}$/);
    expect((await service.getWorkOrder(order.id, manager)).projectId).toBe(first.id);
  });

  it("calcula avance por hitos y rechaza pesos superiores a 100%", async () => {
    const project = await service.convertWorkOrder((await plannedWorkOrder()).id, {}, "project-progress", manager);
    const first = await service.createMilestone(project.id, { name: "Discovery", weight: 40 }, manager);
    await service.createMilestone(project.id, { name: "Entrega", weight: 60 }, manager);
    await expect(service.createMilestone(project.id, { name: "Extra", weight: 1 }, manager)).rejects.toBeInstanceOf(BadRequestException);
    await service.completeMilestone(first.id, manager);
    expect((await service.getProject(project.id, manager)).progress).toBe(40);
  });

  it("evita dependencias cíclicas y exige motivo al bloquear", async () => {
    const project = await service.convertWorkOrder((await plannedWorkOrder()).id, {}, "project-tasks", manager);
    const a = await service.createTask({ projectId: project.id, title: "A" }, manager);
    const b = await service.createTask({ projectId: project.id, title: "B" }, manager);
    await service.dependency(a.id, { dependsOnTaskId: b.id }, manager);
    await expect(service.dependency(b.id, { dependsOnTaskId: a.id }, manager)).rejects.toBeInstanceOf(BadRequestException);
    await service.taskStatus(a.id, "TODO", null, null, manager);
    await expect(service.taskStatus(a.id, "BLOCKED", null, "DEPENDENCY", manager)).rejects.toBeInstanceOf(BadRequestException);
    expect((await service.taskStatus(a.id, "BLOCKED", "Esperando credenciales", "DEPENDENCY", manager)).blockedReason).toBe("Esperando credenciales");
  });

  it("recalcula el avance al terminar, anular y reabrir tareas junto con hitos", async () => {
    const project = await service.convertWorkOrder((await plannedWorkOrder()).id, {}, "project-reporting", manager);
    const analysis = await service.createMilestone(project.id, { name: "Análisis", weight: 40 }, manager);
    const delivery = await service.createMilestone(project.id, { name: "Entrega", weight: 60 }, manager);
    const task = await service.createTask({ projectId: project.id, title: "Integración" }, manager);
    const pending = await service.createTask({ projectId: project.id, title: "Validación" }, manager);
    await service.createWorklog({ projectId: project.id, taskId: task.id, durationMinutes: 45, description: "Preparación de la integración" }, manager);
    await service.taskStatus(task.id, "TODO", null, null, manager);
    await service.taskStatus(task.id, "IN_PROGRESS", null, null, manager);
    expect((await service.getProject(project.id, manager)).progress).toBe(0);
    await service.taskStatus(task.id, "DONE", null, null, manager);
    expect((await service.getProject(project.id, manager)).progress).toBe(15);
    await service.completeMilestone(analysis.id, manager);
    expect((await service.getProject(project.id, manager)).progress).toBe(43);
    await service.taskStatus(pending.id, "CANCELLED", null, null, manager);
    expect((await service.getProject(project.id, manager)).progress).toBe(58);
    await service.taskStatus(task.id, "IN_PROGRESS", null, null, manager);
    expect((await service.getProject(project.id, manager)).progress).toBe(28);
    await service.completeMilestone(delivery.id, manager);
    await service.taskStatus(task.id, "DONE", null, null, manager);
    expect((await service.getProject(project.id, manager)).progress).toBe(100);
  });

  it("registra tiempo real y crea entregables y deployments sin simular CI/CD", async () => {
    const project = await service.convertWorkOrder((await plannedWorkOrder()).id, {}, "project-delivery", manager);
    const task = await service.createTask({ projectId: project.id, title: "Publicar" }, manager);
    const log = await service.createWorklog({ projectId: project.id, taskId: task.id, durationMinutes: 90, description: "Preparación de entrega" }, manager);
    expect(log.durationMinutes).toBe(90);
    const deliverable = await service.createDeliverable({ projectId: project.id, name: "Build v1", type: "BUILD" }, manager);
    expect((await service.deliverableAction(deliverable.id, "submit", {}, manager)).status).toBe("READY_FOR_REVIEW");
    const deployment = await service.createDeployment({ projectId: project.id, version: "v1.0.0", environment: "STAGING" }, manager);
    expect(deployment.recordType).toBe("MANUAL_RECORD");
  });
});

describe("migración de Operaciones", () => {
  const sql = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20261001010000_delivery_operations_center.sql"), "utf8");
  const automationSql = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20261005080000_ot_auto_project_contract_context.sql"), "utf8");
  it("reutiliza work_orders y crea numeración segura", () => { expect(sql).toContain("alter table public.work_orders"); expect(sql).toContain("operations_work_order_number_seq"); expect(sql).toContain("operations_project_number_seq"); });
  it("incluye estado, avance explicable, ciclos e idempotencia", () => { expect(sql).toContain("operations_change_project_status"); expect(sql).toContain("operations_recalculate_project"); expect(sql).toContain("operations_task_dependency_guard"); expect(sql).toContain("operations_idempotency_keys"); });
  it("activa RLS, Realtime, outbox y RBAC", () => { expect(sql).toContain("enable row level security"); expect(sql).toContain("supabase_realtime"); expect(sql).toContain("business_event_outbox"); expect(sql).toContain("operations.dashboard.view"); });
  it("crea y recupera el proyecto automáticamente al existir una OT", () => { expect(automationSql).toContain("work_orders_auto_project"); expect(automationSql).toContain("operations_ensure_project_for_work_order"); expect(automationSql).toContain("'projectId',project_id"); expect(automationSql).toContain("where w.status not in ('CANCELLED','CLOSED')"); });
});

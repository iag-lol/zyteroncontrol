import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RoleGuard } from "../auth/role.guard.js";
import { REQUIRED_ROLES } from "../auth/roles.decorator.js";
import { MonitoringController } from "./monitoring.controller.js";
import { monitoringPermissions, monitoringPermissionsByRole, rolesWith } from "./monitoring.rbac.js";
import { actors, createKit, fail, ids } from "./monitoring.test-kit.js";

async function setup() {
  const kit = await createKit();
  const monitorA = await kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "Web principal", url: "https://www.zyteron.cl", responsibleUserId: ids.dev });
  const monitorB = await kit.service.createMonitor(actors.jefe, { projectId: kit.projectB.id, name: "Portal B", url: "https://portal-b.example" });
  return { ...kit, monitorA, monitorB };
}

describe("RBAC y alcance (anti-IDOR)", () => {
  it("programador asignado → permitido; no asignado → denegado aunque conozca el id", async () => {
    const { service, monitorA, monitorB } = await setup();
    expect((await service.getMonitor(actors.dev, monitorA.id)).id).toBe(monitorA.id);
    await expect(service.getMonitor(actors.dev, monitorB.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.checkNow(actors.dev, monitorB.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.listChecks(actors.dev, monitorB.id, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.projectStatus(actors.dev, monitorB.projectId)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await service.listMonitors(actors.dev, {})).map((monitor) => monitor.id)).toEqual([monitorA.id]);
    expect((await service.dashboard(actors.dev)).totals.total).toBe(1);
  });
  it("incidentes de otro proyecto no son visibles ni operables", async () => {
    const { service, monitorB, checker, tick } = await setup();
    checker.script("https://portal-b.example/", fail(), fail(), fail());
    for (let i = 0; i < 3; i++) await tick(monitorB.id);
    const [incident] = (await service.listIncidents(actors.gerente, {})).items;
    expect(incident).toBeDefined();
    expect((await service.listIncidents(actors.dev, {})).total).toBe(0);
    await expect(service.getIncident(actors.dev, incident!.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.acknowledge(actors.dev, incident!.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await service.acknowledge(actors.otherDev, incident!.id)).status).toBe("ACKNOWLEDGED");
  });
  it("gerente ve todo; programador sin userId no ve nada (deny by default)", async () => {
    const { service } = await setup();
    expect((await service.listMonitors(actors.gerente, {}))).toHaveLength(2);
    expect(await service.listMonitors({ userId: null, role: "PROGRAMADOR" }, {})).toHaveLength(0);
  });
  it("permisos finos: programador no deshabilita monitores ni reasigna; ventas sólo resumen sanitizado", async () => {
    const { service, monitorA, checker, tick } = await setup();
    await expect(service.setEnabled(actors.dev, monitorA.id, false)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.listMonitors(actors.ventas, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.dashboard(actors.ventas)).rejects.toBeInstanceOf(ForbiddenException);
    checker.script("https://www.zyteron.cl/", fail(), fail(), fail());
    for (let i = 0; i < 3; i++) await tick(monitorA.id);
    const summary = await service.clientStatus(actors.ventas, ids.client);
    expect(summary.monitors[0]!.url).toBe("www.zyteron.cl");
    expect(summary.monitors[0]!.statusReason).toBeNull();
    expect(summary.openIncidents[0]!.description).toBeNull();
    expect(summary.openIncidents[0]!.title).toBe("Incidente HIGH");
  });
  it("usuario sin rol es rechazado por el guard global", async () => {
    process.env.AUTH_MODE = "development";
    const guard = new RoleGuard(new Reflector());
    const context = (role?: string) => ({ getHandler: () => MonitoringController.prototype.monitors, getClass: () => MonitoringController, switchToHttp: () => ({ getRequest: () => ({ headers: role ? { "x-zyteron-role": role } : {} }) }) }) as unknown as ExecutionContext;
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(await guard.canActivate(context("RRHH"))).toBe(false);
    expect(await guard.canActivate(context("PROGRAMADOR"))).toBe(true);
    expect(Reflect.getMetadata(REQUIRED_ROLES, MonitoringController.prototype.monitors)).toEqual(rolesWith("monitor.view"));
  });
  it("alertas: cada usuario sólo recibe las propias (equivalente a la política RLS de Realtime)", async () => {
    const { service, monitorA, checker, tick, store } = await setup();
    checker.script("https://www.zyteron.cl/", fail(), fail(), fail());
    for (let i = 0; i < 3; i++) await tick(monitorA.id);
    expect((await service.myAlerts(actors.dev)).length).toBe(1);
    expect((await service.myAlerts(actors.otherDev)).length).toBe(0);
    const [alert] = await service.myAlerts(actors.dev);
    await expect(service.readAlert(actors.otherDev, alert!.id)).rejects.toThrow();
    expect((await service.readAlert(actors.dev, alert!.id)).ok).toBe(true);
    expect((await store.listAlertsFor(ids.dev, "PROGRAMADOR", 5, null))[0]!.readAt).not.toBeNull();
  });
});

describe("Migración de Monitoreo", () => {
  const sql = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20261001050000_site_reliability_monitoring.sql"), "utf8");
  it("reutiliza project_endpoints, tasks y deployments sin duplicar entidades", () => {
    expect(sql).toContain("alter table public.project_endpoints add column if not exists client_id");
    expect(sql).not.toMatch(/create table if not exists public\.(projects|project_endpoints|tasks|deployments|monitoring_tasks)\b/);
    expect(sql).toContain("from public.tasks where id=new.target_id and project_id=incident_project");
  });
  it("incluye concurrencia segura: SKIP LOCKED, lease, unicidad de incidente activo e idempotencia de alertas", () => {
    expect(sql).toContain("for update of m skip locked");
    expect(sql).toContain("incidents_one_active_per_monitor");
    expect(sql).toContain("dedup_key text not null unique");
    expect(sql).toContain("monitoring_incident_number_seq");
  });
  it("RLS deny-by-default, Realtime, outbox y portal sin notas internas", () => {
    for (const table of ["monitors", "monitor_checks", "incidents", "incident_events", "maintenance_windows", "monitoring_events", "alert_delivery_events"]) expect(sql).toContain(`'${table}'`);
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("supabase_realtime");
    expect(sql).toContain("business_event_outbox");
    expect(sql).toMatch(/create or replace view public\.monitoring_portal_incidents[^;]*client_summary/);
    expect(sql).not.toMatch(/create or replace view public\.monitoring_portal_incidents[^;]*(root_cause|description)/);
  });
  it("cada permiso RBAC del módulo está sembrado en la migración", () => {
    for (const permission of monitoringPermissions) expect(sql).toContain(`'${permission}'`);
    for (const permission of monitoringPermissionsByRole.PROGRAMADOR!) expect(sql).toContain(`'${permission}'`);
  });
});

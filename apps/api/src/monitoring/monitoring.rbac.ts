import type { Role } from "@zyteron/contracts";
import type { MonitoringScope } from "@zyteron/contracts/monitoring";

// Espejo de app_permissions/role_permissions sembrados en 20261001050000_site_reliability_monitoring.sql.
// Incluye roles que Desarrollo incorpora en paralelo (TECH_LEAD, SOPORTE_TECNICO): mientras no existan en el
// catálogo de roles, el RoleGuard global los rechaza antes de llegar aquí.

export const monitoringPermissions = [
  "monitoring.dashboard.view", "monitoring.summary.view", "monitor.view", "monitor.create", "monitor.edit", "monitor.disable", "endpoint.view", "endpoint.manage",
  "incident.view", "incident.acknowledge", "incident.assign", "incident.manage", "incident.resolve", "ssl.view", "maintenance.view", "maintenance.create",
  "maintenance.manage", "alert_rule.view", "alert_rule.manage", "monitoring.export", "monitoring.settings.manage",
] as const;
export type MonitoringPermission = (typeof monitoringPermissions)[number];

const all = [...monitoringPermissions];
const developer: MonitoringPermission[] = ["monitoring.dashboard.view", "monitor.view", "monitor.create", "monitor.edit", "endpoint.view", "incident.view", "incident.acknowledge", "incident.manage", "incident.resolve", "ssl.view", "maintenance.view", "maintenance.create", "alert_rule.view", "monitoring.export"];

export const monitoringPermissionsByRole: Record<string, MonitoringPermission[]> = {
  GERENTE_GENERAL: all,
  JEFE_DESARROLLO: all,
  OPERACIONES: all.filter((permission) => !["monitoring.settings.manage", "alert_rule.manage"].includes(permission)),
  TECH_LEAD: ["monitoring.dashboard.view", "monitor.view", "monitor.create", "monitor.edit", "monitor.disable", "endpoint.view", "endpoint.manage", "incident.view", "incident.acknowledge", "incident.assign", "incident.manage", "incident.resolve", "ssl.view", "maintenance.view", "maintenance.create", "maintenance.manage", "alert_rule.view", "monitoring.export"],
  PROGRAMADOR: developer,
  DESARROLLO: developer,
  SOPORTE_TECNICO: ["monitoring.dashboard.view", "monitor.view", "endpoint.view", "incident.view", "incident.acknowledge", "incident.manage", "ssl.view", "maintenance.view", "alert_rule.view"],
  JEFE_VENTAS: ["monitoring.summary.view"],
  COMERCIAL: ["monitoring.summary.view"],
  EJECUTIVA_VENTAS: ["monitoring.summary.view"],
};

export const monitoringScopeByRole: Record<string, MonitoringScope["scope"]> = {
  GERENTE_GENERAL: "ALL", JEFE_DESARROLLO: "DEPARTMENT", OPERACIONES: "DEPARTMENT", TECH_LEAD: "PROJECT",
  PROGRAMADOR: "ASSIGNED", DESARROLLO: "ASSIGNED", SOPORTE_TECNICO: "ASSIGNED", JEFE_VENTAS: "OWN", COMERCIAL: "OWN", EJECUTIVA_VENTAS: "OWN",
};

export function hasMonitoringPermission(role: string, permission: MonitoringPermission) {
  return monitoringPermissionsByRole[role]?.includes(permission) ?? false;
}

/** Roles habilitados para un permiso, en el formato que espera @RequireRoles. */
export function rolesWith(...permissions: MonitoringPermission[]): Role[] {
  return Object.entries(monitoringPermissionsByRole).filter(([, granted]) => permissions.some((permission) => granted.includes(permission))).map(([role]) => role as Role);
}

/** ALL y DEPARTMENT ven toda la operación de delivery; el resto se limita a proyectos donde participa. */
export function hasFleetScope(role: string) {
  const scope = monitoringScopeByRole[role];
  return scope === "ALL" || scope === "DEPARTMENT";
}

export function scopeFor(role: string): MonitoringScope {
  return { role, scope: monitoringScopeByRole[role] ?? "OWN", permissions: monitoringPermissionsByRole[role] ?? [] };
}

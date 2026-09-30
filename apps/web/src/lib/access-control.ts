import type { Role } from "@zyteron/contracts";

export interface RoleProfile {
  role: Role;
  label: string;
  userName: string;
  initials: string;
}

export const roleProfiles: RoleProfile[] = [
  { role: "GERENTE_GENERAL", label: "Gerencia General", userName: "Eduardo Ávila", initials: "EA" },
  { role: "JEFE_DESARROLLO", label: "Jefatura Desarrollo", userName: "Jefatura Desarrollo", initials: "JD" },
  { role: "EJECUTIVA_VENTAS", label: "Ejecutiva de Ventas", userName: "Ejecutiva Ventas", initials: "EV" },
  { role: "PROGRAMADOR", label: "Programador", userName: "Programador Zyteron", initials: "PZ" },
  { role: "RRHH", label: "Recursos Humanos", userName: "Equipo RR.HH.", initials: "RH" },
  { role: "FINANZAS", label: "Finanzas", userName: "Equipo Finanzas", initials: "FI" },
];

const accessByRole: Record<Role, string[]> = {
  GERENTE_GENERAL: ["*"],
  JEFE_DESARROLLO: ["control", "operations", "development", "monitoring", "audits", "documents", "security", "reports"],
  EJECUTIVA_VENTAS: ["control", "commercial", "clients", "documents"],
  PROGRAMADOR: ["control", "operations", "development", "monitoring", "audits", "documents", "security"],
  RRHH: ["control", "hr", "documents", "reports"],
  FINANZAS: ["control", "finance", "documents", "reports"],
  COMERCIAL: ["control", "commercial", "clients", "documents"],
  DESARROLLO: ["control", "operations", "development", "monitoring", "audits", "documents"],
  OPERACIONES: ["control", "operations", "monitoring", "support", "documents"],
};

export function canAccessGroup(role: Role, groupId: string) {
  const access = accessByRole[role] ?? [];
  return access.includes("*") || access.includes(groupId);
}

export function groupForPath(pathname: string) {
  if (["/", "/dashboard", "/command-center", "/activity", "/notifications"].includes(pathname)) return "control";
  if (pathname.startsWith("/crm")) return "commercial";
  if (pathname.startsWith("/clients")) return "clients";
  if (["/tasks", "/milestones", "/worklogs", "/deployments"].some((path) => pathname.startsWith(path)) || pathname.startsWith("/work-orders") || pathname.startsWith("/projects")) return "operations";
  if (pathname.startsWith("/development")) return "development";
  if (pathname.startsWith("/monitoring")) return "monitoring";
  if (pathname.startsWith("/audits")) return "audits";
  if (pathname.startsWith("/support")) return "support";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/hr")) return "hr";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/security")) return "security";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/settings")) return "settings";
  return "control";
}


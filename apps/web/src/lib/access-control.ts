import type { Role } from "@zyteron/contracts";

export interface RoleProfile {
  role: Role;
  label: string;
  userName: string;
  initials: string;
}

export const roleProfiles: RoleProfile[] = [
  { role: "GERENTE_GENERAL", label: "Gerencia General", userName: "Eduardo Ávila", initials: "EA" },
  { role: "JEFE_VENTAS", label: "Jefatura de Ventas", userName: "Jefatura Ventas", initials: "JV" },
  { role: "JEFE_DESARROLLO", label: "Jefatura Desarrollo", userName: "Jefatura Desarrollo", initials: "JD" },
  { role: "EJECUTIVA_VENTAS", label: "Ejecutiva de Ventas", userName: "Ejecutiva Ventas", initials: "EV" },
  { role: "PROGRAMADOR", label: "Programador", userName: "Programador Zyteron", initials: "PZ" },
  { role: "TECH_LEAD", label: "Tech Lead", userName: "Tech Lead Zyteron", initials: "TL" },
  { role: "QA", label: "Quality Assurance", userName: "QA Zyteron", initials: "QA" },
  { role: "SOPORTE_TECNICO", label: "Soporte Técnico", userName: "Soporte Zyteron", initials: "ST" },
  { role: "RRHH", label: "Recursos Humanos", userName: "Equipo RR.HH.", initials: "RH" },
  { role: "FINANZAS", label: "Finanzas", userName: "Equipo Finanzas", initials: "FI" },
  { role: "CONTADOR", label: "Contabilidad", userName: "Contador Zyteron", initials: "CT" },
  { role: "COMERCIAL", label: "Administración Comercial", userName: "Equipo Comercial", initials: "CO" },
  { role: "SECURITY_ADMIN", label: "Security Admin", userName: "Security Operations", initials: "SA" },
];

const accessByRole: Record<Role, string[]> = {
  GERENTE_GENERAL: ["*"],
  JEFE_DESARROLLO: ["control", "operations", "development", "monitoring", "audits", "support", "documents", "reports"],
  EJECUTIVA_VENTAS: ["control", "commercial", "clients", "support", "documents"],
  JEFE_VENTAS: ["control", "commercial", "clients", "finance", "support", "documents", "reports"],
  PROGRAMADOR: ["control", "operations", "development", "monitoring", "audits", "support", "documents"],
  TECH_LEAD: ["control", "operations", "development", "monitoring", "audits", "support", "documents", "reports"],
  QA: ["control", "operations", "development", "audits", "support", "documents"],
  SOPORTE_TECNICO: ["control", "operations", "development", "monitoring", "support", "documents"],
  RRHH: ["control", "hr", "support", "documents", "reports"],
  FINANZAS: ["control", "finance", "support", "documents", "reports"],
  CONTADOR: ["control", "finance", "support", "documents", "reports"],
  COMERCIAL: ["control", "commercial", "clients", "finance", "support", "documents"],
  PORTAL_CLIENT: [],
  DESARROLLO: ["control", "operations", "development", "monitoring", "audits", "support", "documents"],
  OPERACIONES: ["control", "operations", "monitoring", "support", "documents"],
  SECURITY_ADMIN: ["control", "security", "audits", "documents", "reports", "settings"],
};

export function canAccessGroup(role: Role, groupId: string) {
  const access = accessByRole[role] ?? [];
  return access.includes("*") || access.includes(groupId);
}

export function groupForPath(pathname: string) {
  if (["/", "/dashboard", "/command-center", "/activity", "/notifications"].includes(pathname)) return "control";
  if (pathname.startsWith("/crm") || pathname.startsWith("/commercial")) return "commercial";
  if (pathname.startsWith("/clients")) return "clients";
  if (["/operations", "/tasks", "/milestones", "/worklogs", "/deliverables", "/deployments"].some((path) => pathname.startsWith(path)) || pathname.startsWith("/work-orders") || pathname.startsWith("/projects")) return "operations";
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

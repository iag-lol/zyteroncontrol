import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CircleGauge,
  Code2,
  FileStack,
  Headphones,
  Landmark,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  badge?: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

export const enterpriseNavigation: NavigationGroup[] = [
  {
    id: "control",
    label: "Centro de control",
    icon: CircleGauge,
    items: [
      { label: "Resumen ejecutivo", href: "/dashboard" },
      { label: "Command Center", href: "/command-center" },
      { label: "Actividad", href: "/activity" },
      { label: "Notificaciones", href: "/notifications" },
    ],
  },
  {
    id: "commercial",
    label: "Comercial",
    icon: ChartNoAxesCombined,
    items: [
      { label: "CRM", href: "/crm" },
      { label: "Leads", href: "/crm/leads" },
      { label: "Oportunidades", href: "/crm/opportunities" },
      { label: "Cotizaciones", href: "/crm/quotes" },
      { label: "Ventas", href: "/crm/sales" },
      { label: "Seguimientos", href: "/crm/follow-ups" },
      { label: "Pipeline", href: "/crm/pipeline" },
      { label: "Comisiones", href: "/crm/commissions" },
    ],
  },
  {
    id: "clients",
    label: "Clientes",
    icon: Building2,
    items: [
      { label: "Todos los clientes", href: "/clients" },
      { label: "Cliente 360°", href: "/clients/360" },
      { label: "Contactos", href: "/clients/contacts" },
      { label: "Contratos", href: "/clients/contracts" },
      { label: "Servicios contratados", href: "/clients/services" },
      { label: "Renovaciones", href: "/clients/renewals" },
    ],
  },
  {
    id: "operations",
    label: "Operaciones",
    icon: BriefcaseBusiness,
    items: [
      { label: "Órdenes de trabajo", href: "/work-orders" },
      { label: "Proyectos", href: "/projects" },
      { label: "Tareas", href: "/tasks" },
      { label: "Hitos", href: "/milestones" },
      { label: "Worklogs", href: "/worklogs" },
      { label: "Deployments", href: "/deployments" },
    ],
  },
  {
    id: "development",
    label: "Desarrollo",
    icon: Code2,
    items: [
      { label: "Panel desarrollo", href: "/development" },
      { label: "Proyectos por asignar", href: "/development/assignments" },
      { label: "Equipo desarrollo", href: "/development/team" },
      { label: "Carga de trabajo", href: "/development/workload" },
      { label: "Repositorios", href: "/development/repositories" },
      { label: "Ambientes", href: "/development/environments" },
      { label: "Deployments", href: "/development/deployments" },
      { label: "QA", href: "/development/qa" },
      { label: "Bugs", href: "/development/bugs" },
    ],
  },
  {
    id: "monitoring",
    label: "Monitoreo",
    icon: Activity,
    items: [
      { label: "Sitios monitoreados", href: "/monitoring/websites" },
      { label: "Estado en tiempo real", href: "/monitoring/realtime" },
      { label: "Uptime", href: "/monitoring/uptime" },
      { label: "Incidentes", href: "/monitoring/incidents" },
      { label: "Certificados SSL", href: "/monitoring/ssl" },
      { label: "Ventanas mantenimiento", href: "/monitoring/maintenance" },
    ],
  },
  {
    id: "audits",
    label: "Auditorías",
    icon: ShieldCheck,
    items: [
      { label: "Programadas", href: "/audits/scheduled" },
      { label: "Realizadas", href: "/audits" },
      { label: "Hallazgos", href: "/audits/findings" },
      { label: "Planes de acción", href: "/audits/action-plans" },
      { label: "Evidencias", href: "/audits/evidence" },
      { label: "Informes", href: "/audits/reports" },
    ],
  },
  {
    id: "support",
    label: "Soporte",
    icon: Headphones,
    items: [
      { label: "Tickets", href: "/support" },
      { label: "SLA", href: "/support/sla" },
      { label: "Incidencias", href: "/support/incidents" },
      { label: "Solicitudes cliente", href: "/support/requests" },
    ],
  },
  {
    id: "documents",
    label: "Documentos",
    icon: FileStack,
    items: [
      { label: "Todos", href: "/documents" },
      { label: "Clientes", href: "/documents/clients" },
      { label: "Proyectos", href: "/documents/projects" },
      { label: "Cotizaciones", href: "/documents/quotes" },
      { label: "Órdenes de trabajo", href: "/documents/work-orders" },
      { label: "Informes", href: "/documents/reports" },
      { label: "Contratos", href: "/documents/contracts" },
      { label: "Evidencias", href: "/documents/evidence" },
    ],
  },
  {
    id: "hr",
    label: "RR.HH.",
    icon: Users,
    items: [
      { label: "Personal", href: "/hr/employees" },
      { label: "Organigrama", href: "/hr/org-chart" },
      { label: "Contratos", href: "/hr/contracts" },
      { label: "Vacaciones", href: "/hr/vacations" },
      { label: "Permisos", href: "/hr/leave" },
      { label: "Licencias", href: "/hr/licenses" },
      { label: "Evaluaciones", href: "/hr/reviews" },
      { label: "Onboarding", href: "/hr/onboarding" },
      { label: "Offboarding", href: "/hr/offboarding" },
      { label: "Activos asignados", href: "/hr/assets" },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    icon: Landmark,
    items: [
      { label: "Resumen", href: "/finance" },
      { label: "Facturas", href: "/finance/invoices" },
      { label: "Pagos", href: "/finance/payments" },
      { label: "Cuentas por cobrar", href: "/finance/receivables" },
      { label: "Cuentas por pagar", href: "/finance/payables" },
      { label: "Ingresos", href: "/finance/income" },
      { label: "Gastos", href: "/finance/expenses" },
      { label: "Comisiones", href: "/finance/commissions" },
    ],
  },
  {
    id: "security",
    label: "Seguridad",
    icon: ShieldCheck,
    items: [
      { label: "Centro de seguridad", href: "/security" },
      { label: "Usuarios", href: "/security/users" },
      { label: "Roles", href: "/security/roles" },
      { label: "Permisos", href: "/security/permissions" },
      { label: "Sesiones", href: "/security/sessions" },
      { label: "Dispositivos", href: "/security/devices" },
      { label: "Solicitudes de acceso", href: "/security/access-requests" },
      { label: "Vault", href: "/security/vault" },
      { label: "Eventos de seguridad", href: "/security/events" },
      { label: "Auditoría del sistema", href: "/security/audit" },
    ],
  },
  {
    id: "reports",
    label: "Informes",
    icon: BarChart3,
    items: [
      { label: "Comercial", href: "/reports/commercial" },
      { label: "Clientes", href: "/reports/clients" },
      { label: "Proyectos", href: "/reports/projects" },
      { label: "Desarrollo", href: "/reports/development" },
      { label: "Uptime", href: "/reports/uptime" },
      { label: "Auditorías", href: "/reports/audits" },
      { label: "RR.HH.", href: "/reports/hr" },
      { label: "Finanzas", href: "/reports/finance" },
      { label: "Seguridad", href: "/reports/security" },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    icon: Settings,
    items: [
      { label: "Empresa", href: "/settings/company" },
      { label: "Departamentos", href: "/settings/departments" },
      { label: "Equipos", href: "/settings/teams" },
      { label: "Roles", href: "/settings/roles" },
      { label: "Automatizaciones", href: "/settings/automations" },
      { label: "Notificaciones", href: "/settings/notifications" },
      { label: "Plantillas", href: "/settings/templates" },
      { label: "Integraciones", href: "/settings/integrations" },
      { label: "Seguridad", href: "/settings/security" },
      { label: "Sistema", href: "/settings/system" },
    ],
  },
];

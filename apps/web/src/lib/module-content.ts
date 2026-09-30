import { enterpriseNavigation } from "./navigation";
import { groupForPath } from "./access-control";

export interface ModuleDescriptor {
  group: string;
  title: string;
  description: string;
  capabilities: string[];
  emptyMessage: string;
}

const groupContent: Record<string, Omit<ModuleDescriptor, "group" | "title">> = {
  control: { description: "Visibilidad transversal de la operación empresarial.", capabilities: ["Alertas", "Actividad reciente", "Prioridades", "Eventos de seguridad"], emptyMessage: "No hay actividad operacional registrada." },
  commercial: { description: "Gestión del ciclo comercial desde lead hasta venta.", capabilities: ["Crear", "Editar", "Seguimiento", "Aprobaciones"], emptyMessage: "No existen registros comerciales." },
  clients: { description: "Vista integral de clientes, contactos y servicios.", capabilities: ["Cliente 360°", "Contactos", "Servicios", "Renovaciones"], emptyMessage: "No hay clientes registrados." },
  operations: { description: "Ejecución y seguimiento de órdenes, proyectos y tareas.", capabilities: ["Responsables", "Prioridades", "Avance", "Historial"], emptyMessage: "No existen registros operacionales." },
  development: { description: "Centro de gestión del equipo técnico y su carga de trabajo.", capabilities: ["Asignaciones", "Carga", "QA", "Deployments"], emptyMessage: "No hay actividad de desarrollo registrada." },
  monitoring: { description: "Disponibilidad, incidentes y salud de servicios digitales.", capabilities: ["Online", "Degraded", "Offline", "SSL"], emptyMessage: "No hay sitios ni incidentes registrados." },
  audits: { description: "Planificación, ejecución y trazabilidad de auditorías.", capabilities: ["Programar", "Hallazgos", "Evidencias", "Informes"], emptyMessage: "No existen auditorías registradas." },
  support: { description: "Gestión de tickets, incidencias y acuerdos SLA.", capabilities: ["Tickets", "SLA", "Prioridades", "Solicitudes"], emptyMessage: "No existen tickets registrados." },
  documents: { description: "Gestión documental transversal y clasificación empresarial.", capabilities: ["Cliente", "Proyecto", "Categoría", "Autor"], emptyMessage: "No existen documentos registrados." },
  hr: { description: "Administración del ciclo laboral y estructura organizacional.", capabilities: ["Personal", "Contratos", "Ausencias", "Evaluaciones"], emptyMessage: "No existen registros de personal." },
  finance: { description: "Control financiero, facturación, pagos y obligaciones.", capabilities: ["Facturas", "Pagos", "Cobranza", "Gastos"], emptyMessage: "No existen movimientos financieros registrados." },
  security: { description: "Identidad, acceso, sesiones y eventos de seguridad.", capabilities: ["Usuarios", "Roles", "Permisos", "Auditoría"], emptyMessage: "No existen eventos de seguridad registrados." },
  reports: { description: "Informes transversales por dominio y alcance.", capabilities: ["Filtrar", "Programar", "Exportar", "Compartir"], emptyMessage: "No existen informes generados." },
  settings: { description: "Configuración organizacional, automatizaciones e integraciones.", capabilities: ["Empresa", "Equipos", "Plantillas", "Integraciones"], emptyMessage: "No existen configuraciones adicionales." },
};

export function getModuleDescriptor(pathname: string): ModuleDescriptor {
  const group = groupForPath(pathname);
  const navItem = enterpriseNavigation.flatMap((section) => section.items).find((item) => item.href === pathname);
  const rawTitle = pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "Módulo";
  const fallbackTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
  const content = groupContent[group] ?? groupContent.control!;
  return { group, title: navItem?.label ?? fallbackTitle, ...content };
}

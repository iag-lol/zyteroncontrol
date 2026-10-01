import type { Role } from "@zyteron/contracts";
import type {
  AlertDelivery, AlertRule, ClientMonitoringSummary, Incident, IncidentDetail, IncidentEvent, IncidentLink, LatencyWindow, MaintenanceWindow, MonitorCheck,
  MonitoringDashboard, MonitoringEvent, MonitoringFleetEntry, MonitoringMonthlyReport, MonitoringScope, MonitoringSettings, MonitorStats, MonitorView, Paged,
  SeverityRule, UptimeBucket, WorkerHeartbeat,
} from "@zyteron/contracts/monitoring";
import type { OperationsTask, ProjectEndpoint } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class MonitoringApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }

async function request<T>(role: Role, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base()}/monitoring${path}`, { ...init, headers: await apiHeaders(role, init.headers), cache: "no-store" });
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try { const data = await response.json() as { message?: string | string[] }; message = Array.isArray(data.message) ? data.message.join(" ") : data.message || message; } catch { /* respuesta sin JSON */ }
    throw new MonitoringApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}
const post = (value: unknown = {}, headers?: HeadersInit): RequestInit => ({ method: "POST", body: JSON.stringify(value), headers });
const patch = (value: unknown): RequestInit => ({ method: "PATCH", body: JSON.stringify(value) });
const qs = (params: Record<string, string | number | undefined | null>) => { const search = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value)); const text = search.toString(); return text ? `?${text}` : ""; };

export interface CheckNowResult { result: { success: boolean; statusCode: number | null; latencyMs: number | null; errorMessage: string | null }; status: string; statusReason: string; incidentId: string | null; incidentNumber: string | null; monitor: MonitorView }
export interface MonitorStatsResponse { stats: MonitorStats; hourly: UptimeBucket[]; daily: UptimeBucket[]; incidents: Incident[] }
export interface EndpointDetail { endpoint: ProjectEndpoint & { clientId: string | null; clientName: string | null; projectName: string; projectNumber: string | null }; monitors: MonitorView[]; maintenance: MaintenanceWindow[]; incidents: Incident[] }
export interface StatusBoard { monitors: MonitorView[]; fleet: Record<string, MonitoringFleetEntry>; generatedAt: string }
export interface UptimeReport { period: string; granularity: "hour" | "day"; monitors: MonitorView[]; fleet: Record<string, MonitoringFleetEntry>; buckets: Record<string, UptimeBucket[]>; incidents: Incident[]; maintenancePolicy: "EXCLUDE" | "INCLUDE"; retention: { rawDays: number; dailyDays: number } }
export interface PerformanceReport { period: string; monitors: MonitorView[]; ranking: Record<string, LatencyWindow>; buckets: Record<string, UptimeBucket[]>; slowest: Array<{ monitor: MonitorView; latency: LatencyWindow }> }
export interface SslReport { monitors: MonitorView[]; counts: Record<string, number>; alertDays: number[]; warningDays: number }
export interface ProjectStatus { projectId: string; monitors: MonitorView[]; fleet: Record<string, MonitoringFleetEntry>; openIncidents: Incident[]; recentIncidents: Incident[]; maintenance: MaintenanceWindow[] }

export const monitoringApi = {
  me: (role: Role) => request<MonitoringScope>(role, "/me"),
  dashboard: (role: Role) => request<MonitoringDashboard>(role, "/dashboard"),
  monitors: (role: Role, filters: Record<string, string | undefined> = {}) => request<MonitorView[]>(role, `/monitors${qs(filters)}`),
  monitor: (role: Role, id: string) => request<MonitorView>(role, `/monitors/${id}`),
  createMonitor: (role: Role, value: Record<string, unknown>) => request<MonitorView>(role, "/monitors", post(value)),
  updateMonitor: (role: Role, id: string, value: Record<string, unknown>) => request<MonitorView>(role, `/monitors/${id}`, patch(value)),
  setEnabled: (role: Role, id: string, enabled: boolean) => request<MonitorView>(role, `/monitors/${id}/${enabled ? "enable" : "disable"}`, post()),
  checkNow: (role: Role, id: string) => request<CheckNowResult>(role, `/monitors/${id}/check-now`, post()),
  checks: (role: Role, id: string, filters: Record<string, string | number | undefined>) => request<Paged<MonitorCheck>>(role, `/monitors/${id}/checks${qs(filters)}`),
  stats: (role: Role, id: string) => request<MonitorStatsResponse>(role, `/monitors/${id}/stats`),
  endpoint: (role: Role, id: string) => request<EndpointDetail>(role, `/endpoints/${id}`),
  incidents: (role: Role, filters: Record<string, string | number | undefined> = {}) => request<Paged<Incident>>(role, `/incidents${qs(filters)}`),
  incident: (role: Role, id: string) => request<IncidentDetail>(role, `/incidents/${id}`),
  acknowledge: (role: Role, id: string) => request<Incident>(role, `/incidents/${id}/acknowledge`, post()),
  assign: (role: Role, id: string, userId: string, note?: string) => request<Incident>(role, `/incidents/${id}/assign`, post({ userId, note })),
  changeStatus: (role: Role, id: string, status: string, note?: string) => request<Incident>(role, `/incidents/${id}/change-status`, post({ status, note })),
  resolve: (role: Role, id: string, value: { resolution: string; rootCause?: string }) => request<Incident>(role, `/incidents/${id}/resolve`, post(value)),
  close: (role: Role, id: string) => request<Incident>(role, `/incidents/${id}/close`, post()),
  postmortem: (role: Role, id: string, value: Record<string, string>) => request<Incident>(role, `/incidents/${id}/postmortem`, patch(value)),
  comment: (role: Role, id: string, body: string) => request<IncidentEvent[]>(role, `/incidents/${id}/comments`, post({ body })),
  visibility: (role: Role, id: string, value: { clientVisibility: string; clientSummary?: string }) => request<Incident>(role, `/incidents/${id}/visibility`, post(value)),
  createTask: (role: Role, id: string, value: Record<string, unknown>) => request<{ task: OperationsTask; links: IncidentLink[] }>(role, `/incidents/${id}/create-task`, post(value, { "idempotency-key": crypto.randomUUID() })),
  linkBug: (role: Role, id: string, value: { bugId?: string; reference?: string }) => request<IncidentLink>(role, `/incidents/${id}/link-bug`, post(value)),
  maintenance: (role: Role, filters: Record<string, string | undefined> = {}) => request<MaintenanceWindow[]>(role, `/maintenance${qs(filters)}`),
  createMaintenance: (role: Role, value: Record<string, unknown>) => request<MaintenanceWindow>(role, "/maintenance", post(value)),
  updateMaintenance: (role: Role, id: string, value: Record<string, unknown>) => request<MaintenanceWindow>(role, `/maintenance/${id}`, patch(value)),
  cancelMaintenance: (role: Role, id: string) => request<MaintenanceWindow>(role, `/maintenance/${id}/cancel`, post()),
  status: (role: Role, filters: Record<string, string | undefined> = {}) => request<StatusBoard>(role, `/status${qs(filters)}`),
  projectStatus: (role: Role, projectId: string) => request<ProjectStatus>(role, `/status/projects/${projectId}`),
  clientStatus: (role: Role, clientId: string) => request<ClientMonitoringSummary>(role, `/status/clients/${clientId}`),
  uptime: (role: Role, filters: Record<string, string | undefined> = {}) => request<UptimeReport>(role, `/uptime${qs(filters)}`),
  performance: (role: Role, filters: Record<string, string | undefined> = {}) => request<PerformanceReport>(role, `/performance${qs(filters)}`),
  ssl: (role: Role) => request<SslReport>(role, "/ssl"),
  history: (role: Role, filters: Record<string, string | number | undefined> = {}) => request<Paged<MonitoringEvent>>(role, `/history${qs(filters)}`),
  alertRules: (role: Role) => request<AlertRule[]>(role, "/alert-rules"),
  createAlertRule: (role: Role, value: Record<string, unknown>) => request<AlertRule>(role, "/alert-rules", post(value)),
  updateAlertRule: (role: Role, id: string, value: Record<string, unknown>) => request<AlertRule>(role, `/alert-rules/${id}`, patch(value)),
  alerts: (role: Role) => request<AlertDelivery[]>(role, "/alerts"),
  readAlert: (role: Role, id: string) => request<{ ok: boolean }>(role, `/alerts/${id}/read`, post()),
  settings: (role: Role) => request<{ settings: MonitoringSettings; severityRules: SeverityRule[] }>(role, "/settings"),
  updateSettings: (role: Role, value: Record<string, unknown>) => request<MonitoringSettings>(role, "/settings", patch(value)),
  workers: (role: Role) => request<WorkerHeartbeat[]>(role, "/workers"),
  monthly: (role: Role, filters: Record<string, string | undefined>) => request<MonitoringMonthlyReport>(role, `/reports/monthly${qs(filters)}`),
  /** Descarga CSV con los mismos encabezados de autenticación que el resto del API. */
  async download(role: Role, kind: "uptime" | "incidents" | "ssl", filters: Record<string, string | undefined> = {}) {
    const response = await fetch(`${base()}/monitoring/exports/${kind}.csv${qs(filters)}`, { headers: await apiHeaders(role), cache: "no-store" });
    if (!response.ok) throw new MonitoringApiError(`Error ${response.status}`, response.status);
    const url = URL.createObjectURL(await response.blob());
    const link = Object.assign(document.createElement("a"), { href: url, download: `zyteron-${kind}.csv` });
    link.click(); URL.revokeObjectURL(url);
  },
};

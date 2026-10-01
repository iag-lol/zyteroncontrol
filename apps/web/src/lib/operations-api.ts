import type {
  ChangeRequest, OperationsEvent, OperationsPriorityItem, OperationsProject, OperationsSummary, OperationsTask,
  ProjectDeliverable, ProjectDeployment, ProjectEndpoint, ProjectMember, ProjectMilestone, ProjectOperationalSummary,
  ProjectRisk, Role, WorkLog, WorkOrder,
} from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };
async function request<T>(role: Role, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base()}${path}`, { ...init, headers: await apiHeaders(role, init.headers), cache: "no-store" });
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try { const data = await response.json() as { message?: string | string[] }; message = Array.isArray(data.message) ? data.message.join(" ") : data.message || message; } catch { /* non-json */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
const body = (method: string, value: unknown, headers?: HeadersInit): RequestInit => ({ method, headers, body: JSON.stringify(value) });
const qs = (query = "") => `?pageSize=100${query}`;

export const operationsApi = {
  summary: (role: Role) => request<OperationsSummary>(role, "/operations/summary"),
  priorities: (role: Role) => request<OperationsPriorityItem[]>(role, "/operations/priorities"),
  activity: (role: Role, projectId?: string) => request<OperationsEvent[]>(role, `/operations/activity${projectId ? `?projectId=${projectId}` : ""}`),
  workOrders: (role: Role, query = "") => request<Page<WorkOrder>>(role, `/work-orders${qs(query)}`),
  workOrder: (role: Role, id: string) => request<WorkOrder>(role, `/work-orders/${id}`),
  createWorkOrder: (role: Role, value: Partial<WorkOrder>) => request<WorkOrder>(role, "/work-orders", body("POST", value)),
  workOrderAction: (role: Role, id: string, action: string, value: unknown = {}) => request<WorkOrder | OperationsProject>(role, `/work-orders/${id}/${action}`, body("POST", value, action === "convert-to-project" ? { "idempotency-key": crypto.randomUUID() } : undefined)),
  projects: (role: Role, query = "") => request<Page<OperationsProject>>(role, `/projects${qs(query)}`),
  project: (role: Role, id: string) => request<OperationsProject>(role, `/projects/${id}`),
  projectSummary: (role: Role, id: string) => request<ProjectOperationalSummary>(role, `/projects/${id}/summary`),
  projectAction: (role: Role, id: string, action: string, value: unknown = {}) => request<unknown>(role, `/projects/${id}/${action}`, body("POST", value)),
  members: (role: Role, id: string) => request<ProjectMember[]>(role, `/projects/${id}/members`),
  addMember: (role: Role, id: string, value: unknown) => request<ProjectMember>(role, `/projects/${id}/members`, body("POST", value)),
  milestones: (role: Role, projectId?: string) => request<ProjectMilestone[]>(role, `/milestones${projectId ? `?projectId=${projectId}` : ""}`),
  createMilestone: (role: Role, projectId: string, value: unknown) => request<ProjectMilestone>(role, `/projects/${projectId}/milestones`, body("POST", value)),
  completeMilestone: (role: Role, id: string) => request<ProjectMilestone>(role, `/milestones/${id}/complete`, body("POST", {})),
  tasks: (role: Role, query = "") => request<Page<OperationsTask>>(role, `/tasks${qs(query)}`),
  createTask: (role: Role, value: Partial<OperationsTask>) => request<OperationsTask>(role, "/tasks", body("POST", value)),
  taskStatus: (role: Role, id: string, status: OperationsTask["status"], reason?: string) => request<OperationsTask>(role, `/tasks/${id}/status`, body("POST", { status, reason, type: status === "BLOCKED" ? "DEPENDENCY" : undefined })),
  worklogs: (role: Role, query = "") => request<Page<WorkLog>>(role, `/worklogs${qs(query)}`),
  createWorklog: (role: Role, value: Partial<WorkLog>) => request<WorkLog>(role, "/worklogs", body("POST", value)),
  deliverables: (role: Role, query = "") => request<Page<ProjectDeliverable>>(role, `/deliverables${qs(query)}`),
  createDeliverable: (role: Role, value: Partial<ProjectDeliverable>) => request<ProjectDeliverable>(role, "/deliverables", body("POST", value)),
  deliverableAction: (role: Role, id: string, action: string, value: unknown = {}) => request<ProjectDeliverable>(role, `/deliverables/${id}/${action}`, body("POST", value)),
  deployments: (role: Role, query = "") => request<Page<ProjectDeployment>>(role, `/deployments${qs(query)}`),
  createDeployment: (role: Role, value: Partial<ProjectDeployment>) => request<ProjectDeployment>(role, "/deployments", body("POST", value)),
  endpoints: (role: Role, projectId: string) => request<ProjectEndpoint[]>(role, `/projects/${projectId}/endpoints`),
  createEndpoint: (role: Role, projectId: string, value: unknown) => request<ProjectEndpoint>(role, `/projects/${projectId}/endpoints`, body("POST", value)),
  risks: (role: Role, projectId: string) => request<ProjectRisk[]>(role, `/projects/${projectId}/risks`),
  createRisk: (role: Role, projectId: string, value: unknown) => request<ProjectRisk>(role, `/projects/${projectId}/risks`, body("POST", value)),
  changes: (role: Role, projectId: string) => request<ChangeRequest[]>(role, `/projects/${projectId}/change-requests`),
  createChange: (role: Role, projectId: string, value: unknown) => request<ChangeRequest>(role, `/projects/${projectId}/change-requests`, body("POST", value)),
};

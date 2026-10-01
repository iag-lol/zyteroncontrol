import type { Client, ClientContact, ClientEvent, ClientListResponse, ClientPortalSettings, ClientService, CreateClientInput, RelatedAuditSnapshot, RelatedSupportSnapshot, Role } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, role: Role, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: await apiHeaders(role, init?.headers),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string; errors?: string[] };
    throw new Error(payload.errors?.join(" ") || payload.message || "No fue posible completar la operación.");
  }
  return response.json() as Promise<T>;
}

export const clientsApi = {
  list: (role: Role, params: URLSearchParams) => request<ClientListResponse>(`/clients?${params}`, role),
  auditExport: (role:Role, domain:string) => request<Record<string,unknown>>("/clients/audit-export",role,{method:"POST",body:JSON.stringify({domain})}),
  get: (role: Role, id: string) => request<Client>(`/clients/${id}`, role),
  create: (role: Role, input: CreateClientInput) => request<Client>("/clients", role, { method: "POST", body: JSON.stringify(input) }),
  update: (role: Role, id: string, input: Partial<Client>) => request<Client>(`/clients/${id}`, role, { method: "PATCH", body: JSON.stringify(input) }),
  archive: (role: Role, id: string) => request<Client>(`/clients/${id}/archive`, role, { method: "POST" }),
  summary: (role: Role, id: string) => request<Record<string, unknown>>(`/clients/${id}/summary`, role),
  contacts: (role: Role, id: string) => request<ClientContact[]>(`/clients/${id}/contacts`, role),
  addContact: (role: Role, id: string, input: NonNullable<CreateClientInput["primaryContact"]>) => request<ClientContact>(`/clients/${id}/contacts`, role, { method: "POST", body: JSON.stringify(input) }),
  services: (role: Role, id: string) => request<ClientService[]>(`/clients/${id}/services`, role),
  addService: (role: Role, id: string, input: NonNullable<CreateClientInput["initialServices"]>[number]) => request<ClientService>(`/clients/${id}/services`, role, { method: "POST", body: JSON.stringify(input) }),
  activity: (role: Role, id: string) => request<ClientEvent[]>(`/clients/${id}/activity`, role),
  portal: (role: Role, id: string) => request<ClientPortalSettings>(`/clients/${id}/portal`, role),
  updatePortal: (role: Role, id: string, input: Partial<ClientPortalSettings>) => request<ClientPortalSettings>(`/clients/${id}/portal`, role, { method: "PATCH", body: JSON.stringify(input) }),
  related: (role: Role, id: string, endpoint: string) => request<Record<string, unknown>>(`/clients/${id}/${endpoint}`, role),
  audits: (role:Role,id:string)=>request<RelatedAuditSnapshot>(`/clients/${id}/audits`,role),
  support: (role:Role,id:string)=>request<RelatedSupportSnapshot>(`/clients/${id}/support-summary`,role),
};

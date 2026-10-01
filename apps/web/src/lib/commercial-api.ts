import type { CommercialEvent, CommercialSummary, Commission, QuoteItem, Role, Sale, SalesFollowUp, SalesGoal, SalesHandoff, SalesLead, SalesOpportunity, SalesPipelineStage, SalesQuote } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";

const base = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
async function request<T>(role: Role, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base()}${path}`, { ...init, headers: await apiHeaders(role, init.headers), cache: "no-store" });
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = await response.json() as { message?: string | string[]; errors?: string[] };
      message = Array.isArray(data.message) ? data.message.join(" ") : data.errors?.join(" ") || data.message || message;
    } catch { /* Response body is not JSON. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };
export const commercialApi = {
  summary: (role: Role) => request<CommercialSummary>(role, "/commercial/summary"),
  activity: (role: Role) => request<CommercialEvent[]>(role, "/commercial/activity"),
  stages: (role: Role) => request<SalesPipelineStage[]>(role, "/commercial/pipeline-stages"),
  sources: (role: Role) => request<Array<{ id: string; code: string; name: string }>>(role, "/commercial/lead-sources"),
  search: (role: Role, query: string) => request<{ leads: SalesLead[]; opportunities: SalesOpportunity[]; quotes: SalesQuote[]; sales: Sale[] }>(role, `/commercial/search?q=${encodeURIComponent(query)}`),
  leads: (role: Role, query = "") => request<Page<SalesLead>>(role, `/leads?pageSize=100${query}`),
  leadCreate: (role: Role, body: Partial<SalesLead>) => request<{ item: SalesLead; warnings: string[] }>(role, "/leads", { method: "POST", body: JSON.stringify(body) }),
  leadAction: (role: Role, id: string, action: string, body: unknown = {}) => request<unknown>(role, `/leads/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  opportunities: (role: Role, query = "") => request<Page<SalesOpportunity>>(role, `/opportunities?pageSize=100${query}`),
  opportunityCreate: (role: Role, body: Partial<SalesOpportunity>) => request<SalesOpportunity>(role, "/opportunities", { method: "POST", body: JSON.stringify(body) }),
  moveOpportunity: (role: Role, id: string, stageId: string, reason?: string) => request<SalesOpportunity>(role, `/opportunities/${id}/change-stage`, { method: "POST", body: JSON.stringify({ stageId, reason }) }),
  followUps: (role: Role, query = "") => request<Page<SalesFollowUp>>(role, `/follow-ups?pageSize=100${query}`),
  followUpCreate: (role: Role, body: Partial<SalesFollowUp>) => request<SalesFollowUp>(role, "/follow-ups", { method: "POST", body: JSON.stringify(body) }),
  followUpAction: (role: Role, id: string, action: string, body: unknown) => request<SalesFollowUp>(role, `/follow-ups/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  quotes: (role: Role, query = "") => request<Page<SalesQuote>>(role, `/quotes?pageSize=100${query}`),
  catalog: (role: Role) => request<Array<{ id: string; name: string; code: string; default_price: number | null; currency: string }>>(role, "/quotes/catalog"),
  quoteCreate: (role: Role, body: Partial<SalesQuote> & { items: Partial<QuoteItem>[] }) => request<SalesQuote>(role, "/quotes", { method: "POST", body: JSON.stringify(body) }),
  quoteAction: (role: Role, id: string, action: string, body: unknown = {}, idempotent = false) => request<any>(role, `/quotes/${id}/${action}`, { method: "POST", headers: idempotent ? { "idempotency-key": crypto.randomUUID() } : undefined, body: JSON.stringify(body) }),
  sales: (role: Role, query = "") => request<Page<Sale>>(role, `/sales?pageSize=100${query}`),
  salesSummary: (role: Role) => request<Record<string, number>>(role, "/sales/summary"),
  goals: (role: Role) => request<SalesGoal[]>(role, "/sales-goals"),
  goalCreate: (role: Role, body: Partial<SalesGoal>) => request<SalesGoal>(role, "/sales-goals", { method: "POST", body: JSON.stringify(body) }),
  commissions: (role: Role) => request<Commission[]>(role, "/commissions"),
  handoffs: (role: Role) => request<SalesHandoff[]>(role, "/sales-handoffs"),
  handoffCreate: (role: Role, body: Partial<SalesHandoff>) => request<SalesHandoff>(role, "/sales-handoffs", { method: "POST", body: JSON.stringify(body) }),
};

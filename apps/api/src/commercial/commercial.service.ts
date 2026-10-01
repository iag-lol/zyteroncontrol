import { Injectable } from "@nestjs/common";
import type { CommercialSummary } from "@zyteron/contracts";
import { CommercialRepository } from "./commercial.repository.js";

@Injectable()
export class CommercialService {
  constructor(private readonly repository: CommercialRepository) {}

  async summary(): Promise<CommercialSummary> {
    const [leads, opportunities, followUps, quotes, sales] = await Promise.all([
      this.repository.listLeads({ page: 1, pageSize: 100 }),
      this.repository.listOpportunities({ page: 1, pageSize: 100 }),
      this.repository.listFollowUps({ page: 1, pageSize: 100 }),
      this.repository.listQuotes({ page: 1, pageSize: 100 }),
      this.repository.listSales({ page: 1, pageSize: 100 }),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    return {
      newLeads: leads.items.filter((item) => item.status === "NEW").length,
      uncontactedLeads: leads.items.filter((item) => ["NEW", "ASSIGNED", "CONTACT_PENDING"].includes(item.status)).length,
      overdueFollowUps: followUps.items.filter((item) => item.status === "OVERDUE").length,
      todayFollowUps: followUps.items.filter((item) => item.status === "PENDING" && item.scheduledAt.startsWith(today)).length,
      openOpportunities: opportunities.items.filter((item) => item.status === "OPEN").length,
      staleOpportunities: opportunities.items.filter((item) => item.status === "OPEN" && Date.now() - new Date(item.updatedAt).getTime() > 14 * 86_400_000).length,
      pendingQuotes: quotes.items.filter((item) => ["DRAFT", "PENDING_APPROVAL", "APPROVED", "READY_TO_SEND"].includes(item.status)).length,
      expiringQuotes: quotes.items.filter((item) => item.validUntil && item.validUntil >= today && item.validUntil <= in7 && ["SENT", "NEGOTIATING"].includes(item.status)).length,
      approvalQuotes: quotes.items.filter((item) => item.status === "PENDING_APPROVAL").length,
      monthSales: sales.items.filter((item) => item.closedAt.startsWith(month)).reduce((sum, item) => sum + item.amount, 0),
      activePipeline: opportunities.items.filter((item) => item.status === "OPEN").reduce((sum, item) => sum + item.estimatedValue, 0),
      weightedPipeline: opportunities.items.filter((item) => item.status === "OPEN").reduce((sum, item) => sum + item.estimatedValue * item.probability / 100, 0),
      wonClients: new Set(sales.items.map((item) => item.clientId).filter(Boolean)).size,
      lostOpportunities: opportunities.items.filter((item) => item.status === "LOST").length,
    };
  }

  activity() { return this.repository.activity(); }
  sources() { return this.repository.leadSources(); }
  stages() { return this.repository.stages(); }

  async search(term: string) {
    const [leads, opportunities, quotes, sales] = await Promise.all([
      this.repository.listLeads({ page: 1, pageSize: 8, search: term }),
      this.repository.listOpportunities({ page: 1, pageSize: 8, search: term }),
      this.repository.listQuotes({ page: 1, pageSize: 8, search: term }),
      this.repository.listSales({ page: 1, pageSize: 100 }),
    ]);
    const needle = term.trim().toLowerCase();
    return {
      leads: leads.items,
      opportunities: opportunities.items,
      quotes: quotes.items,
      sales: sales.items.filter((sale) => [sale.id, sale.quoteId, sale.clientId].some((value) => value?.toLowerCase().includes(needle))).slice(0, 8),
    };
  }
}

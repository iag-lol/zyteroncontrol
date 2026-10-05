import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { CreateClientInput } from "@zyteron/contracts";
import { ClientEventsService } from "./client-events.service.js";
import { ClientHealthService } from "./client-health.service.js";
import { ClientIntegrationsService } from "./client-integrations.service.js";
import { parsePagination, validateCreateClient } from "./clients.dto.js";
import { ClientsRepository } from "./clients.repository.js";
import { AuditReadService } from "../audits/audits.service.js";
import { SupportReadService } from "../support/support.service.js";
import { DocumentReadService } from "../documents/documents.service.js";

@Injectable()
export class ClientsService {
  constructor(
    private readonly repository: ClientsRepository,
    private readonly health: ClientHealthService,
    private readonly events: ClientEventsService,
    private readonly integrations: ClientIntegrationsService,
    private readonly audits: AuditReadService,
    private readonly support: SupportReadService,
    @Optional() private readonly documents?: DocumentReadService,
  ) {}

  async list(query: Record<string, string | undefined>, includeFinance=false) {
    const { page, pageSize } = parsePagination(query.page, query.pageSize);
    const result=await this.repository.list({ page, pageSize, search: query.search, status: query.status, health: query.health });
    const portfolio=await this.integrations.portfolio(result.items.map(item=>item.id),includeFinance);
    return{...result,summary:portfolio.summary,items:result.items.map(item=>({...item,...portfolio.byClient[item.id]}))};
  }
  private async ensureClient(id:string){const client=await this.repository.findById(id);if(!client)throw new NotFoundException("Cliente no encontrado.");return client;}
  async get(id: string) {
    const client = await this.ensureClient(id);
    const health = this.health.evaluate(await this.repository.domainHealthSignals(id));
    return { ...client, health: health.status, healthFactors: health.factors };
  }
  async create(input: CreateClientInput) {
    const valid = validateCreateClient(input);
    const health = this.health.evaluate();
    const client = await this.repository.create(valid, health.status, health.factors);
    if (valid.primaryContact) await this.repository.addContact(client.id, valid.primaryContact);
    for (const service of valid.initialServices ?? []) await this.repository.addService(client.id, service);
    await this.events.publish(client.id, "CLIENT_CREATED", "Cliente creado", `${client.legalName} fue incorporado a la cartera.`);
    return client;
  }
  async update(id: string, patch: Record<string, unknown>) {
    await this.ensureClient(id);
    const client = await this.repository.update(id, patch);
    await this.events.publish(id, "CLIENT_UPDATED", "Información del cliente actualizada");
    return client;
  }
  async archive(id: string) {
    await this.ensureClient(id);
    const client = await this.repository.update(id, { status: "ARCHIVED", archivedAt: new Date().toISOString() });
    await this.events.publish(id, "CLIENT_ARCHIVED", "Cliente archivado");
    return client;
  }
  async summary(id: string, includeFinance=false) {
    const client = await this.ensureClient(id);
    const [contacts, services, activity, domainSummary] = await Promise.all([
      this.repository.contactsFor(id), this.repository.servicesFor(id), this.repository.eventsFor(id), this.integrations.summary(id, includeFinance),
    ]);
    return { client, contacts: contacts.length, activeServices: services.filter((item) => item.status === "ACTIVE").length,
      lastActivity: activity[0]?.occurredAt ?? null,
      ...domainSummary,
      integrations: this.integrations.describe() };
  }
  async contacts(id: string) { await this.ensureClient(id); return this.repository.contactsFor(id); }
  async addContact(id: string, input: NonNullable<CreateClientInput["primaryContact"]>) {
    await this.ensureClient(id); const contact = await this.repository.addContact(id, input);
    await this.events.publish(id, "CONTACT_ADDED", "Contacto agregado", contact.name); return contact;
  }
  async services(id: string) { await this.ensureClient(id); return this.repository.servicesFor(id); }
  async addService(id: string, input: NonNullable<CreateClientInput["initialServices"]>[number]) {
    await this.ensureClient(id); const service = await this.repository.addService(id, input);
    await this.events.publish(id, "SERVICE_ACTIVATED", "Servicio agregado", service.serviceName); return service;
  }
  async activity(id: string) { await this.ensureClient(id); return this.events.list(id); }
  async related(id: string, domain: string) { await this.ensureClient(id); if(domain==="audits")return this.audits.related({clientId:id});if(domain==="support")return this.support.related({clientId:id});if(domain==="documents"&&this.documents)return this.documents.related({clientId:id});return { clientId: id, domain, items: [], available: true }; }
  async integrationSummary(id:string, includeFinance=false){await this.ensureClient(id);return this.integrations.summary(id,includeFinance);}
  async portal(id: string) { await this.ensureClient(id); return this.repository.portalFor(id); }
  async updatePortal(id: string, patch: Parameters<ClientsRepository["updatePortal"]>[1]) {
    await this.ensureClient(id); const settings = await this.repository.updatePortal(id, patch);
    await this.events.publish(id, settings.enabled ? "CLIENT_PORTAL_ENABLED" : "CLIENT_PORTAL_UPDATED", settings.enabled ? "Portal Cliente habilitado" : "Configuración de portal actualizada");
    return settings;
  }
  auditExport(domain:string){const allowed=["contacts","contracts","services","renewals"];if(!allowed.includes(domain))throw new NotFoundException("Dominio de exportación no válido.");return this.repository.addAudit("EXPORT",domain.toUpperCase(),null,null,{domain});}
}

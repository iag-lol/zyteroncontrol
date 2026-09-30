import { Injectable, NotFoundException } from "@nestjs/common";
import type { ClientContact, ClientService, CreateClientInput } from "@zyteron/contracts";
import { ClientEventsService } from "./client-events.service.js";
import { ClientHealthService } from "./client-health.service.js";
import { ClientIntegrationsService } from "./client-integrations.service.js";
import { parsePagination, validateCreateClient } from "./clients.dto.js";
import { ClientsRepository } from "./clients.repository.js";

@Injectable()
export class ClientsService {
  constructor(
    private readonly repository: ClientsRepository,
    private readonly health: ClientHealthService,
    private readonly events: ClientEventsService,
    private readonly integrations: ClientIntegrationsService,
  ) {}

  list(query: Record<string, string | undefined>) {
    const { page, pageSize } = parsePagination(query.page, query.pageSize);
    return this.repository.list({ page, pageSize, search: query.search, status: query.status, health: query.health });
  }
  async get(id: string) {
    const client = await this.repository.findById(id);
    if (!client) throw new NotFoundException("Cliente no encontrado.");
    return client;
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
    await this.get(id);
    const client = await this.repository.update(id, patch);
    await this.events.publish(id, "CLIENT_UPDATED", "Información del cliente actualizada");
    return client;
  }
  async archive(id: string) {
    await this.get(id);
    const client = await this.repository.update(id, { status: "ARCHIVED", archivedAt: new Date().toISOString() });
    await this.events.publish(id, "CLIENT_ARCHIVED", "Cliente archivado");
    return client;
  }
  async summary(id: string) {
    const client = await this.get(id);
    const [contacts, services, activity] = await Promise.all([
      this.repository.contactsFor(id), this.repository.servicesFor(id), this.repository.eventsFor(id),
    ]);
    return { client, contacts: contacts.length, activeServices: services.filter((item) => item.status === "ACTIVE").length,
      lastActivity: activity[0]?.occurredAt ?? null,
      projects: null, quotes: null, workOrders: null, finance: null, support: null, monitoring: null, audits: null,
      integrations: this.integrations.describe() };
  }
  async contacts(id: string) { await this.get(id); return this.repository.contactsFor(id); }
  async addContact(id: string, input: Omit<ClientContact, "id" | "clientId" | "createdAt">) {
    await this.get(id); const contact = await this.repository.addContact(id, input);
    await this.events.publish(id, "CONTACT_ADDED", "Contacto agregado", contact.name); return contact;
  }
  async services(id: string) { await this.get(id); return this.repository.servicesFor(id); }
  async addService(id: string, input: Omit<ClientService, "id" | "clientId">) {
    await this.get(id); const service = await this.repository.addService(id, input);
    await this.events.publish(id, "SERVICE_ACTIVATED", "Servicio agregado", service.serviceName); return service;
  }
  async activity(id: string) { await this.get(id); return this.events.list(id); }
  async related(id: string, domain: string) { await this.get(id); return { clientId: id, domain, items: [], available: true }; }
  async unavailableSummary(id: string, domain: string) { await this.get(id); return { clientId: id, domain, available: false, reason: `El módulo ${domain} aún no entrega agregados para este cliente.` }; }
  async portal(id: string) { await this.get(id); return this.repository.portalFor(id); }
  async updatePortal(id: string, patch: Parameters<ClientsRepository["updatePortal"]>[1]) {
    await this.get(id); const settings = await this.repository.updatePortal(id, patch);
    await this.events.publish(id, settings.enabled ? "CLIENT_PORTAL_ENABLED" : "CLIENT_PORTAL_UPDATED", settings.enabled ? "Portal Cliente habilitado" : "Configuración de portal actualizada");
    return settings;
  }
}

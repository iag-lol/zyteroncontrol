import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { ServiceCatalogItem } from "@zyteron/contracts";
import { ClientEventsService } from "../clients/client-events.service.js";
import { pagination } from "../domain/server-supabase.js";
import { validateClientService, type ClientServiceInput } from "./client-services.dto.js";
import { ClientServicesRepository } from "./client-services.repository.js";

@Injectable()
export class ClientServicesService {
  constructor(private readonly repository: ClientServicesRepository, private readonly events: ClientEventsService) {}

  catalog() { return this.repository.catalogList(); }
  createCatalog(input: Omit<ServiceCatalogItem, "id" | "createdAt" | "updatedAt">) { return this.repository.catalogCreate(input); }
  list(query: Record<string, string | undefined>) { return this.repository.list({ ...query, ...pagination(query) }); }

  async get(id: string) {
    const item = await this.repository.get(id);
    if (!item) throw new NotFoundException("Servicio no encontrado.");
    return item;
  }

  async create(input: ClientServiceInput) {
    const item = await this.repository.create(validateClientService(input));
    await this.events.publish(item.clientId, "SERVICE_CREATED", "Servicio contratado", item.serviceName);
    return item;
  }

  async update(id: string, patch: Partial<ClientServiceInput>) {
    const current = await this.get(id) as Awaited<ReturnType<ClientServicesRepository["get"]>> & { requirements?: Record<string, boolean> };
    const item = await this.repository.update(id, validateClientService({ ...current, ...patch }));
    await this.events.publish(item.clientId, "SERVICE_UPDATED", "Servicio actualizado", item.serviceName);
    return item;
  }

  async activate(id: string) {
    const current = await this.get(id) as Awaited<ReturnType<ClientServicesRepository["get"]>> & { requirements?: Record<string, boolean> };
    const errors: string[] = [];
    if (!current.responsibleUserId) errors.push("Asigna un responsable comercial desde el directorio de usuarios.");
    if (!current.contractId && !current.projectId) errors.push("Vincula un contrato o proyecto antes de activar el servicio.");
    if (current.requirements?.project && !current.projectId) errors.push("Este servicio requiere un proyecto vinculado.");
    if (current.requirements?.support && !current.sla) errors.push("Este servicio requiere un SLA antes de activarse.");
    if (errors.length) throw new BadRequestException({ message:"El servicio no está listo para activarse.", errors });
    const item = await this.repository.activate(id);
    if (!item) throw new NotFoundException("Servicio no encontrado.");
    return item;
  }

  async suspend(id: string) {
    const item = await this.repository.suspend(id);
    if (!item) throw new NotFoundException("Servicio no encontrado.");
    await this.events.publish(item.clientId, "SERVICE_SUSPENDED", "Servicio suspendido", item.serviceName);
    return item;
  }
}

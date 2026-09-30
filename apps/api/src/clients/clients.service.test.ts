import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { ClientEventsService } from "./client-events.service.js";
import { ClientHealthService } from "./client-health.service.js";
import { ClientIntegrationsService } from "./client-integrations.service.js";
import { ClientsPolicy } from "./clients.policy.js";
import { ClientsRepository } from "./clients.repository.js";
import { ClientsService } from "./clients.service.js";

describe("Client 360 service", () => {
  let service: ClientsService;
  beforeEach(() => {
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const repository = new ClientsRepository();
    service = new ClientsService(repository, new ClientHealthService(), new ClientEventsService(repository), new ClientIntegrationsService());
  });

  it("crea, busca, edita y archiva sin borrar el historial", async () => {
    const client = await service.create({ legalName: "Fenice SpA", rut: "18.866.264-1", country: "Chile", primaryContact: { name: "Ana Pérez", position: "Gerente", department: null, email: "ana@example.cl", phone: null, whatsapp: null, isPrimary: true, billingContact: true, technicalContact: false, commercialContact: true, portalAccess: false, status: "ACTIVE" } });
    expect(client.health).toBe("INSUFFICIENT_DATA");
    expect((await service.list({ search: "Fenice" })).total).toBe(1);
    expect((await service.contacts(client.id))).toHaveLength(1);
    expect((await service.update(client.id, { tradeName: "Fenice" }))?.tradeName).toBe("Fenice");
    expect((await service.archive(client.id))?.status).toBe("ARCHIVED");
    expect((await service.activity(client.id)).map((event) => event.type)).toContain("CLIENT_ARCHIVED");
  });

  it("evita RUT duplicado y pagina en servidor", async () => {
    await service.create({ legalName: "Fenice SpA", rut: "18.866.264-1", country: "Chile" });
    await expect(service.create({ legalName: "Duplicado", rut: "188662641", country: "Chile" })).rejects.toBeInstanceOf(ConflictException);
    const result = await service.list({ page: "1", pageSize: "1" });
    expect(result.pageSize).toBe(1); expect(result.total).toBe(1);
  });

  it("agrega servicios y mantiene health explicable", async () => {
    const client = await service.create({ legalName: "Fenice SpA", rut: "18.866.264-1", country: "Chile" });
    await service.addService(client.id, { serviceId: "hosting", catalogServiceId: null, serviceName: "Hosting", contractId: null, projectId: null, startDate: "2026-09-30", renewalDate: null, endDate: null, billingFrequency: "ANNUAL", agreedPrice: null, currency: "CLP", status: "PENDING_ACTIVATION", responsibleUserId: null, technicalOwnerId: null, sla: null, notes: null, portalVisible: false });
    expect(await service.services(client.id)).toHaveLength(1);
    expect(client.healthFactors.every((factor) => factor.reason.length > 0)).toBe(true);
  });

  it("aplica permisos sensibles por rol", () => {
    const policy = new ClientsPolicy();
    expect(policy.canViewFinance("GERENTE_GENERAL")).toBe(true);
    expect(policy.canViewFinance("PROGRAMADOR")).toBe(false);
    expect(policy.canManagePortal("EJECUTIVA_VENTAS")).toBe(false);
  });

  it("configura Portal Cliente sin duplicar registros", async () => {
    const client = await service.create({ legalName: "Fenice SpA", rut: "18.866.264-1", country: "Chile" });
    const settings = await service.updatePortal(client.id, { enabled: true, projectsVisible: true });
    expect(settings.enabled).toBe(true);
    expect((await service.portal(client.id)).projectsVisible).toBe(true);
    expect((await service.activity(client.id)).map((event) => event.type)).toContain("CLIENT_PORTAL_ENABLED");
  });
});

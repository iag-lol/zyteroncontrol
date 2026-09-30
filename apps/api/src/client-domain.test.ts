import { BadRequestException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ClientServicesRepository } from "./client-services/client-services.repository.js";
import { ClientServicesService } from "./client-services/client-services.service.js";
import { ClientHealthService } from "./clients/client-health.service.js";
import { ClientEventsService } from "./clients/client-events.service.js";
import { ClientsRepository } from "./clients/clients.repository.js";
import { clientPermissions, ClientsPolicy } from "./clients/clients.policy.js";
import { ContactsRepository } from "./contacts/contacts.repository.js";
import { ContactsService } from "./contacts/contacts.service.js";
import { ContractsRepository } from "./contracts/contracts.repository.js";
import { ContractsService } from "./contracts/contracts.service.js";
import { RenewalsRepository } from "./renewals/renewals.repository.js";
import { RenewalsService } from "./renewals/renewals.service.js";

const clientId = "11111111-1111-4111-8111-111111111111";
const sourceId = "22222222-2222-4222-8222-222222222222";
const eventService = () => new ClientEventsService(new ClientsRepository());

describe("dominio completo de Clientes", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("crea, edita y detecta posibles duplicados de contactos", async () => {
    const service = new ContactsService(new ContactsRepository(), eventService());
    const input = {
      clientId, name:"Ana Pérez", position:"Gerenta", department:"Compras", email:"ana@example.cl", phone:"+56911111111", whatsapp:null,
      isPrimary:true, billingContact:false, technicalContact:false, commercialContact:true, portalAccess:false, status:"ACTIVE" as const,
      contactTypes:["PRINCIPAL", "COMERCIAL"] as const, notes:null,
    };
    const first = await service.create(input as never);
    expect(first.item.name).toBe("Ana Pérez");
    expect((await service.update(first.item.id, { position:"Directora" })).position).toBe("Directora");
    const duplicate = await service.create({ ...input, name:"Ana Pérez II" } as never);
    expect(duplicate.duplicateWarnings[0]).toContain("duplicado");
  });

  it("valida email y cliente en backend", async () => {
    const service = new ContactsService(new ContactsRepository(), eventService());
    await expect(service.create({ clientId:"incorrecto", name:"A", email:"sin-email", phone:null, whatsapp:null, position:null, department:null, isPrimary:false, billingContact:false, technicalContact:false, commercialContact:false, portalAccess:false, status:"ACTIVE", contactTypes:[], notes:null } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("crea contratos, controla transiciones y calcula vencimientos", async () => {
    const service = new ContractsService(new ContractsRepository(), eventService());
    const endDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const contract = await service.create({ clientId, name:"Mantención anual", description:null, contractType:"MANTENCION", status:"DRAFT", startDate:"2026-01-01", endDate, renewalType:"MANUAL", renewalNoticeDays:30, billingFrequency:"ANNUAL", currency:"CLP", subtotal:100000, tax:19000, total:119000, responsibleUserId:null, portalVisible:false });
    expect(contract.contractNumber).toMatch(/^CTR-\d{4}-\d{6}$/);
    await expect(service.transition(contract.id, "ACTIVE")).rejects.toBeInstanceOf(BadRequestException);
    await service.transition(contract.id, "IN_REVIEW");
    expect((await service.transition(contract.id, "ACTIVE")).status).toBe("ACTIVE");
    const list = await service.list({ page:"1", pageSize:"25" });
    expect(list.summary.expiring).toBe(1);
  });

  it("impide sobrescribir un contrato activo", async () => {
    const service = new ContractsService(new ContractsRepository(), eventService());
    const contract = await service.create({ clientId, name:"Hosting", description:null, contractType:"HOSTING", status:"IN_REVIEW", startDate:"2026-01-01", endDate:"2027-01-01", renewalType:"AUTOMATIC", renewalNoticeDays:60, billingFrequency:"ANNUAL", currency:"CLP", subtotal:1, tax:0, total:1, responsibleUserId:null, portalVisible:false });
    await service.transition(contract.id, "ACTIVE");
    await expect(service.update(contract.id, { name:"Sobrescrito" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("crea, activa y suspende servicios contratados", async () => {
    const service = new ClientServicesService(new ClientServicesRepository(), eventService());
    const created = await service.create({ clientId, catalogServiceId:null, serviceId:"hosting", serviceName:"Hosting", contractId:sourceId, projectId:null, startDate:"2026-09-30", renewalDate:"2027-09-30", endDate:null, billingFrequency:"ANNUAL", agreedPrice:120000, currency:"CLP", status:"PENDING_ACTIVATION", responsibleUserId:"33333333-3333-4333-8333-333333333333", technicalOwnerId:null, sla:"99.9%", notes:null, portalVisible:false });
    expect((await service.activate(created.id)).status).toBe("ACTIVE");
    expect((await service.suspend(created.id)).status).toBe("SUSPENDED");
  });

  it("crea, contacta, convierte y completa renovaciones", async () => {
    const service = new RenewalsService(new RenewalsRepository(), eventService());
    const created = await service.create({ clientId, sourceType:"SERVICE", sourceId, title:"Renovar hosting", renewalDate:"2027-09-30", noticeDate:"2027-06-30", assignedTo:null, status:"UPCOMING", estimatedValue:120000, currency:"CLP", autoRenew:false, notes:null });
    expect((await service.contact(created.id)).status).toBe("CONTACTED");
    const negotiating = await service.opportunity(created.id);
    expect(negotiating.opportunityId).toMatch(/^[0-9a-f-]{36}$/);
    expect(negotiating.status).toBe("NEGOTIATING");
    expect((await service.renew(created.id, { nextRenewalDate:"2028-09-30" })).status).toBe("RENEWED");
  });

  it("calcula Client Health solamente con señales explicables", () => {
    const health = new ClientHealthService();
    expect(health.evaluate().status).toBe("INSUFFICIENT_DATA");
    const risk = health.evaluate({ totalContracts:1, expiredContracts:1, totalServices:1, suspendedServices:0, totalRenewals:1, overdueRenewals:0 });
    expect(risk.status).toBe("RISK");
    expect(risk.factors.find((factor) => factor.key === "contracts")?.reason).toContain("vencido");
  });

  it("declara los permisos mínimos y mantiene RBAC sensible", () => {
    expect(clientPermissions).toContain("client.contracts.approve");
    expect(clientPermissions).toContain("client.renewals.complete");
    const policy = new ClientsPolicy();
    expect(policy.canManageClient("EJECUTIVA_VENTAS")).toBe(true);
    expect(policy.canManageClient("PROGRAMADOR")).toBe(false);
  });
});

describe("migración final del dominio Clientes", () => {
  const sql = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20260930120000_complete_client_domain.sql"), "utf8");

  it("habilita RLS para todas las nuevas tablas y conserva deny-by-default", () => {
    for (const table of ["client_contracts", "client_contract_versions", "client_contract_signers", "service_catalog", "client_contract_services", "client_renewals", "renewal_notification_events", "client_domain_notifications", "client_domain_audit_events"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("client_contract_versions_scoped_read");
    expect(sql).toContain("renewal_notification_events_scoped_read");
  });

  it("crea renovaciones y alertas transaccionales", () => {
    expect(sql).toContain("sync_client_domain_renewal");
    expect(sql).toContain("client_contracts_sync_renewal");
    expect(sql).toContain("client_services_sync_renewal");
    expect(sql).toContain("array[90,60,30,15,7,1]");
  });

  it("retira la restricción antigua antes de migrar los estados de servicios", () => {
    const dropConstraint = sql.indexOf("drop constraint if exists client_services_status_check");
    const migrateLegacyStatus = sql.indexOf("set status = 'PENDING_ACTIVATION' where status = 'PENDING'");

    expect(dropConstraint).toBeGreaterThan(-1);
    expect(migrateLegacyStatus).toBeGreaterThan(-1);
    expect(dropConstraint).toBeLessThan(migrateLegacyStatus);
  });

  it("publica solamente los cuatro agregados en Realtime", () => {
    expect(sql).toContain("array['client_contacts','client_contracts','client_services','client_renewals']");
    expect(sql).toContain("supabase_realtime");
  });
});

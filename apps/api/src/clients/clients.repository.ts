import { ConflictException, Injectable } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Client, ClientContact, ClientEvent, ClientListResponse, ClientPortalSettings, ClientService, CreateClientInput } from "@zyteron/contracts";
import { randomUUID } from "node:crypto";

type ClientPatch = Partial<Omit<Client, "id" | "createdAt" | "health" | "healthFactors">>;
type InitialContact = NonNullable<CreateClientInput["primaryContact"]>;
type InitialService = NonNullable<CreateClientInput["initialServices"]>[number];

@Injectable()
export class ClientsRepository {
  private readonly supabase?: SupabaseClient;
  private readonly clients = new Map<string, Client>();
  private readonly contacts = new Map<string, ClientContact[]>();
  private readonly services = new Map<string, ClientService[]>();
  private readonly events = new Map<string, ClientEvent[]>();
  private readonly portalSettings = new Map<string, ClientPortalSettings>();

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceRole) this.supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async list(input: { page: number; pageSize: number; search?: string; status?: string; health?: string }): Promise<ClientListResponse> {
    if (this.supabase) {
      const from = (input.page - 1) * input.pageSize;
      let query = this.supabase.from("clients").select("*", { count: "exact" });
      if (input.search) {
        const term = input.search.replace(/[,()]/g, " ");
        query = query.or(`legal_name.ilike.%${term}%,trade_name.ilike.%${term}%,rut.ilike.%${term}%,general_email.ilike.%${term}%,website.ilike.%${term}%`);
      }
      if (input.status) query = query.eq("status", input.status);
      if (input.health) query = query.eq("health_status", input.health);
      const { data, error, count } = await query.order("legal_name").range(from, from + input.pageSize - 1);
      if (error) throw error;
      return this.listResponse((data ?? []).map((row) => this.fromRow(row)), count ?? 0, input.page, input.pageSize);
    }
    const search = input.search?.toLocaleLowerCase("es-CL");
    const all = [...this.clients.values()].filter((client) => {
      const matchesSearch = !search || [client.legalName, client.tradeName, client.rut, client.generalEmail, client.website]
        .filter(Boolean).some((value) => value!.toLocaleLowerCase("es-CL").includes(search));
      return matchesSearch && (!input.status || client.status === input.status) && (!input.health || client.health === input.health);
    }).sort((a, b) => a.legalName.localeCompare(b.legalName, "es-CL"));
    const start = (input.page - 1) * input.pageSize;
    return this.listResponse(all.slice(start, start + input.pageSize), all.length, input.page, input.pageSize, all);
  }

  async findById(id: string) {
    if (this.supabase) {
      const { data, error } = await this.supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? this.fromRow(data) : undefined;
    }
    return this.clients.get(id);
  }

  async domainHealthSignals(clientId: string) {
    if (!this.supabase) {
      const services = this.services.get(clientId) ?? [];
      return { totalContracts:0, expiredContracts:0, totalServices:services.length, suspendedServices:services.filter((item)=>item.status==="SUSPENDED").length, totalRenewals:0, overdueRenewals:0, openSupportTickets:0, criticalSupportTickets:0, supportSlaBreaches:0 };
    }
    const today = new Date().toISOString().slice(0, 10);
    const queries = await Promise.allSettled([
      this.supabase.from("client_contracts").select("id", { count:"exact", head:true }).eq("client_id", clientId).is("archived_at", null),
      this.supabase.from("client_contracts").select("id", { count:"exact", head:true }).eq("client_id", clientId).is("archived_at", null).or(`status.eq.EXPIRED,end_date.lt.${today}`),
      this.supabase.from("client_services").select("id", { count:"exact", head:true }).eq("client_id", clientId),
      this.supabase.from("client_services").select("id", { count:"exact", head:true }).eq("client_id", clientId).eq("status", "SUSPENDED"),
      this.supabase.from("client_renewals").select("id", { count:"exact", head:true }).eq("client_id", clientId),
      this.supabase.from("client_renewals").select("id", { count:"exact", head:true }).eq("client_id", clientId).lt("renewal_date", today).not("status", "in", "(RENEWED,NOT_RENEWED,CANCELLED)"),
      this.supabase.from("support_tickets").select("id", { count:"exact", head:true }).eq("client_id",clientId).is("archived_at",null).not("status","in","(RESOLVED,CLOSED,CANCELLED)"),
      this.supabase.from("support_tickets").select("id", { count:"exact", head:true }).eq("client_id",clientId).eq("severity","CRITICAL").is("archived_at",null).not("status","in","(RESOLVED,CLOSED,CANCELLED)"),
      this.supabase.from("support_tickets").select("id", { count:"exact", head:true }).eq("client_id",clientId).is("resolved_at",null).lt("resolution_due_at",new Date().toISOString()),
      this.supabase.from("invoices").select("id",{count:"exact",head:true}).eq("client_id",clientId).in("status",["ISSUED","PARTIALLY_PAID"]),
      this.supabase.from("invoices").select("id",{count:"exact",head:true}).eq("client_id",clientId).in("status",["ISSUED","PARTIALLY_PAID"]).lt("due_date",today),
      this.supabase.from("incidents").select("id",{count:"exact",head:true}).eq("client_id",clientId).in("status",["DETECTED","CONFIRMED","ACKNOWLEDGED","INVESTIGATING","MITIGATING","MONITORING"]),
      this.supabase.from("incidents").select("id",{count:"exact",head:true}).eq("client_id",clientId).eq("severity","CRITICAL").in("status",["DETECTED","CONFIRMED","ACKNOWLEDGED","INVESTIGATING","MITIGATING","MONITORING"]),
      this.supabase.from("monitors").select("id",{count:"exact",head:true}).eq("client_id",clientId).eq("enabled",true).eq("status","OFFLINE"),
      this.supabase.from("projects").select("id",{count:"exact",head:true}).eq("client_id",clientId).not("status","in","(COMPLETED,CANCELLED,ARCHIVED)"),
      this.supabase.from("projects").select("id",{count:"exact",head:true}).eq("client_id",clientId).not("status","in","(COMPLETED,CANCELLED,ARCHIVED)").lt("target_date",today),
      this.supabase.from("projects").select("id",{count:"exact",head:true}).eq("client_id",clientId).in("health",["AT_RISK","CRITICAL"]).not("status","in","(COMPLETED,CANCELLED,ARCHIVED)"),
    ]);
    const count=(index:number)=>{const result=queries[index];return result?.status==="fulfilled"&&!result.value.error?result.value.count??0:undefined;};
    return {
      totalContracts:count(0)??0,expiredContracts:count(1)??0,totalServices:count(2)??0,suspendedServices:count(3)??0,totalRenewals:count(4)??0,overdueRenewals:count(5)??0,
      openSupportTickets:count(6),criticalSupportTickets:count(7),supportSlaBreaches:count(8),openInvoices:count(9),overdueInvoices:count(10),activeMonitoringIncidents:count(11),criticalMonitoringIncidents:count(12),downMonitors:count(13),activeProjects:count(14),overdueProjects:count(15),atRiskProjects:count(16),
    };
  }

  async create(input: CreateClientInput, health: Client["health"], healthFactors: Client["healthFactors"]) {
    const now = new Date().toISOString();
    const client: Client = {
      id: randomUUID(), legalName: input.legalName, tradeName: input.tradeName ?? null, rut: input.rut,
      businessActivity: input.businessActivity ?? null, website: input.website ?? null, phone: input.phone ?? null,
      generalEmail: input.generalEmail ?? null, country: input.country, region: input.region ?? null,
      commune: input.commune ?? null, address: input.address ?? null, accountExecutiveId: input.accountExecutiveId ?? null,
      clientLeadId: input.clientLeadId ?? null, developmentLeadId: input.developmentLeadId ?? null,
      source: input.source ?? null, clientType: input.clientType ?? null, status: input.status ?? "ONBOARDING",
      billingLegalName: input.billingLegalName ?? input.legalName, billingRut: input.billingRut ?? input.rut,
      billingActivity: input.billingActivity ?? input.businessActivity ?? null, billingAddress: input.billingAddress ?? input.address ?? null,
      dteEmail: input.dteEmail ?? input.generalEmail ?? null, paymentTerms: input.paymentTerms ?? null,
      creditDays: input.creditDays ?? 0, currency: input.currency ?? "CLP", paymentCustomerReference: null,
      health, healthFactors, createdAt: now, updatedAt: now, archivedAt: null,
    };
    if (this.supabase) {
      const { data, error } = await this.supabase.from("clients").insert(this.toRow(client)).select("*").single();
      if (error?.code === "23505") throw new ConflictException("Ya existe un cliente con ese RUT.");
      if (error) throw error;
      return this.fromRow(data);
    }
    if ([...this.clients.values()].some((item) => item.rut === client.rut)) throw new ConflictException("Ya existe un cliente con ese RUT.");
    this.clients.set(client.id, client);
    return client;
  }

  async update(id: string, patch: ClientPatch) {
    if (this.supabase) {
      const { data, error } = await this.supabase.from("clients").update(this.toRowPatch(patch)).eq("id", id).select("*").single();
      if (error) throw error;
      return this.fromRow(data);
    }
    const current = this.clients.get(id);
    if (!current) return undefined;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.clients.set(id, next);
    return next;
  }

  async contactsFor(clientId: string) {
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_contacts").select("*").eq("client_id", clientId).order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => this.contactFromRow(row));
    }
    return this.contacts.get(clientId) ?? [];
  }

  async addContact(clientId: string, input: InitialContact) {
    const now = new Date().toISOString();
    const contact: ClientContact = { ...input, contactTypes: input.contactTypes ?? [], notes: input.notes ?? null, id: randomUUID(), clientId, portalStatus: input.portalAccess ? "PENDING_INVITATION" : "DISABLED", createdAt: now, updatedAt: now, archivedAt: null };
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_contacts").insert(this.contactToRow(contact)).select("*").single();
      if (error) throw error;
      return this.contactFromRow(data);
    }
    if (contact.isPrimary) this.contacts.set(clientId, (this.contacts.get(clientId) ?? []).map((item) => ({ ...item, isPrimary: false })));
    this.contacts.set(clientId, [...(this.contacts.get(clientId) ?? []), contact]);
    return contact;
  }

  async servicesFor(clientId: string) {
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_services").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => this.serviceFromRow(row));
    }
    return this.services.get(clientId) ?? [];
  }

  async addService(clientId: string, input: InitialService) {
    const now = new Date().toISOString();
    const service: ClientService = { ...input, id: randomUUID(), clientId, activationDate: null, createdAt: now, updatedAt: now };
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_services").insert(this.serviceToRow(service)).select("*").single();
      if (error) throw error;
      return this.serviceFromRow(data);
    }
    this.services.set(clientId, [...(this.services.get(clientId) ?? []), service]);
    return service;
  }

  async eventsFor(clientId: string) {
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_events").select("*").eq("client_id", clientId).order("occurred_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => this.eventFromRow(row));
    }
    return [...(this.events.get(clientId) ?? [])].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async addEvent(event: Omit<ClientEvent, "id" | "occurredAt">) {
    const created: ClientEvent = { ...event, id: randomUUID(), occurredAt: new Date().toISOString() };
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_events").insert({
        id: created.id, client_id: created.clientId, event_type: created.type, title: created.title,
        description: created.description, actor_id: created.actorId, visibility: created.visibility,
        metadata: created.metadata, occurred_at: created.occurredAt,
      }).select("*").single();
      if (error) throw error;
      await this.supabase.from("business_event_outbox").insert({ aggregate_type: "CLIENT", aggregate_id: created.clientId, event_type: created.type, payload: created });
      await this.addAudit(created.type, "CLIENT_DOMAIN_EVENT", created.id, created.clientId, created.metadata);
      return this.eventFromRow(data);
    }
    this.events.set(created.clientId, [created, ...(this.events.get(created.clientId) ?? [])]);
    return created;
  }

  async addAudit(action:string,entityType:string,entityId:string|null,clientId:string|null,metadata:Record<string,unknown>={}) {
    if (!this.supabase) return { action,entityType,entityId,clientId,metadata };
    const { error } = await this.supabase.from("client_domain_audit_events").insert({ client_id:clientId,actor_id:null,action,entity_type:entityType,entity_id:entityId,metadata });
    if (error) throw error;
    return { action,entityType,entityId,clientId,metadata };
  }

  async portalFor(clientId: string): Promise<ClientPortalSettings> {
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_portal_settings").select("*").eq("client_id", clientId).maybeSingle();
      if (error) throw error;
      if (data) return this.portalFromRow(data);
    }
    return this.portalSettings.get(clientId) ?? this.emptyPortal(clientId);
  }

  async updatePortal(clientId: string, patch: Partial<Omit<ClientPortalSettings, "clientId" | "updatedAt">>) {
    const next = { ...(await this.portalFor(clientId)), ...patch, clientId, updatedAt: new Date().toISOString() };
    if (this.supabase) {
      const { data, error } = await this.supabase.from("client_portal_settings").upsert({
        client_id: clientId, enabled: next.enabled, projects_visible: next.projectsVisible,
        documents_visible: next.documentsVisible, invoices_visible: next.invoicesVisible,
        tickets_visible: next.ticketsVisible, monitoring_visible: next.monitoringVisible,
        audits_visible: next.auditsVisible, updated_at: next.updatedAt,
      }).select("*").single();
      if (error) throw error;
      return this.portalFromRow(data);
    }
    this.portalSettings.set(clientId, next);
    return next;
  }

  private listResponse(items: Client[], total: number, page: number, pageSize: number, all = items): ClientListResponse {
    const startOfMonth = new Date(); startOfMonth.setUTCDate(1); startOfMonth.setUTCHours(0, 0, 0, 0);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize), summary: {
      active: all.filter((item) => item.status === "ACTIVE").length,
      newThisMonth: all.filter((item) => new Date(item.createdAt) >= startOfMonth).length,
      onboarding: all.filter((item) => item.status === "ONBOARDING").length,
      activeProjects: null, criticalIncidents: null, pendingPayments: null, upcomingRenewals: null, inactiveRelationship: null,
    } };
  }

  private fromRow(row: Record<string, any>): Client { return {
    id: row.id, legalName: row.legal_name, tradeName: row.trade_name, rut: row.rut, businessActivity: row.business_activity,
    website: row.website, phone: row.phone, generalEmail: row.general_email, country: row.country, region: row.region,
    commune: row.commune, address: row.address, accountExecutiveId: row.account_executive_id, clientLeadId: row.client_lead_id,
    developmentLeadId: row.development_lead_id, source: row.source, clientType: row.client_type, status: row.status,
    billingLegalName: row.billing_legal_name, billingRut: row.billing_rut, billingActivity: row.billing_activity,
    billingAddress: row.billing_address, dteEmail: row.dte_email, paymentTerms: row.payment_terms, creditDays: row.credit_days,
    currency: row.currency, paymentCustomerReference: row.payment_customer_reference, health: row.health_status ?? "INSUFFICIENT_DATA",
    healthFactors: row.health_factors ?? [], createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at,
  }; }
  private toRow(client: Client) { return {
    id: client.id, legal_name: client.legalName, trade_name: client.tradeName, rut: client.rut, business_activity: client.businessActivity,
    website: client.website, phone: client.phone, general_email: client.generalEmail, country: client.country, region: client.region,
    commune: client.commune, address: client.address, account_executive_id: client.accountExecutiveId, client_lead_id: client.clientLeadId,
    development_lead_id: client.developmentLeadId, source: client.source, client_type: client.clientType, status: client.status,
    billing_legal_name: client.billingLegalName, billing_rut: client.billingRut, billing_activity: client.billingActivity,
    billing_address: client.billingAddress, dte_email: client.dteEmail, payment_terms: client.paymentTerms, credit_days: client.creditDays,
    currency: client.currency, payment_customer_reference: client.paymentCustomerReference, health_status: client.health,
    health_factors: client.healthFactors, created_at: client.createdAt, updated_at: client.updatedAt, archived_at: client.archivedAt,
  }; }
  private toRowPatch(patch: ClientPatch) { const row: Record<string, unknown> = {}; const map: Record<string, string> = {
    legalName:"legal_name",tradeName:"trade_name",rut:"rut",businessActivity:"business_activity",website:"website",phone:"phone",generalEmail:"general_email",
    country:"country",region:"region",commune:"commune",address:"address",accountExecutiveId:"account_executive_id",clientLeadId:"client_lead_id",
    developmentLeadId:"development_lead_id",source:"source",clientType:"client_type",status:"status",billingLegalName:"billing_legal_name",
    billingRut:"billing_rut",billingActivity:"billing_activity",billingAddress:"billing_address",dteEmail:"dte_email",paymentTerms:"payment_terms",
    creditDays:"credit_days",currency:"currency",paymentCustomerReference:"payment_customer_reference",archivedAt:"archived_at",updatedAt:"updated_at",
  }; for (const [key,value] of Object.entries(patch)) if (key in map) row[map[key]!] = value; row.updated_at = new Date().toISOString(); return row; }
  private contactFromRow(row: Record<string, any>): ClientContact { return { id:row.id,clientId:row.client_id,name:row.name,position:row.position,department:row.department,email:row.email,phone:row.phone,whatsapp:row.whatsapp,isPrimary:row.is_primary,billingContact:row.billing_contact,technicalContact:row.technical_contact,commercialContact:row.commercial_contact,portalAccess:row.portal_access,status:row.status,contactTypes:row.contact_types??[],notes:row.notes,portalStatus:row.portal_status??"DISABLED",createdAt:row.created_at,updatedAt:row.updated_at??row.created_at,archivedAt:row.archived_at??null }; }
  private contactToRow(c: ClientContact) { return { id:c.id,client_id:c.clientId,name:c.name,position:c.position,department:c.department,email:c.email,phone:c.phone,whatsapp:c.whatsapp,is_primary:c.isPrimary,billing_contact:c.billingContact,technical_contact:c.technicalContact,commercial_contact:c.commercialContact,portal_access:c.portalAccess,status:c.status,contact_types:c.contactTypes,notes:c.notes,portal_status:c.portalStatus,created_at:c.createdAt,updated_at:c.updatedAt,archived_at:c.archivedAt }; }
  private serviceFromRow(row: Record<string, any>): ClientService { return { id:row.id,clientId:row.client_id,catalogServiceId:row.catalog_service_id??null,serviceId:row.service_id,serviceName:row.service_name,contractId:row.contract_id,projectId:row.project_id??null,startDate:row.start_date,activationDate:row.activation_date??null,renewalDate:row.renewal_date,endDate:row.end_date??null,billingFrequency:row.billing_type??row.billing_frequency,agreedPrice:row.agreed_price===null||row.agreed_price===undefined?null:Number(row.agreed_price),currency:row.currency,status:row.status==="PENDING"?"PENDING_ACTIVATION":row.status,responsibleUserId:row.responsible_user_id,technicalOwnerId:row.technical_owner_id??null,sla:row.sla,notes:row.notes,portalVisible:row.portal_visible??false,createdAt:row.created_at,updatedAt:row.updated_at??row.created_at }; }
  private serviceToRow(s: ClientService) { return { id:s.id,client_id:s.clientId,catalog_service_id:s.catalogServiceId,service_id:s.serviceId,service_name:s.serviceName,contract_id:s.contractId,project_id:s.projectId,start_date:s.startDate,activation_date:s.activationDate,renewal_date:s.renewalDate,end_date:s.endDate,billing_frequency:s.billingFrequency,billing_type:s.billingFrequency,agreed_price:s.agreedPrice,currency:s.currency,status:s.status,responsible_user_id:s.responsibleUserId,technical_owner_id:s.technicalOwnerId,sla:s.sla,notes:s.notes,portal_visible:s.portalVisible,created_at:s.createdAt,updated_at:s.updatedAt }; }
  private eventFromRow(row: Record<string, any>): ClientEvent { return { id:row.id,clientId:row.client_id,type:row.event_type,title:row.title,description:row.description,actorId:row.actor_id,visibility:row.visibility,metadata:row.metadata ?? {},occurredAt:row.occurred_at }; }
  private emptyPortal(clientId: string): ClientPortalSettings { return { clientId,enabled:false,projectsVisible:false,documentsVisible:false,invoicesVisible:false,ticketsVisible:false,monitoringVisible:false,auditsVisible:false,updatedAt:new Date().toISOString() }; }
  private portalFromRow(row: Record<string, any>): ClientPortalSettings { return { clientId:row.client_id,enabled:row.enabled,projectsVisible:row.projects_visible,documentsVisible:row.documents_visible,invoicesVisible:row.invoices_visible,ticketsVisible:row.tickets_visible,monitoringVisible:row.monitoring_visible,auditsVisible:row.audits_visible,updatedAt:row.updated_at }; }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ClientContactDirectoryItem, ContactDirectorySummary, ContactMutationResult } from "@zyteron/contracts";
import { cleanSearch, createServerSupabase, pageBounds } from "../domain/server-supabase.js";
import type { ContactInput } from "./contacts.dto.js";

@Injectable()
export class ContactsRepository {
  private readonly supabase = createServerSupabase();
  private readonly memory = new Map<string, ClientContactDirectoryItem>();

  async list(input: Record<string, string | number | undefined> & { page: number; pageSize: number }) {
    if (!this.supabase) return this.memoryList(input);
    const { from, to } = pageBounds(input.page, input.pageSize);
    const search = cleanSearch(String(input.search??""));
    let query = this.supabase.from("client_contacts").select("*,clients!inner(legal_name,trade_name,rut)", { count: "exact" }).is("archived_at", null);
    if (search) {
      const { data: matchingClients, error: clientSearchError } = await this.supabase.from("clients").select("id").or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%,rut.ilike.%${search}%`).limit(100);
      if (clientSearchError) throw clientSearchError;
      const clientIds = (matchingClients ?? []).map((client) => client.id);
      const companyFilter = clientIds.length ? `,client_id.in.(${clientIds.join(",")})` : "";
      query = query.or(`name.ilike.%${search}%,position.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%${companyFilter}`);
    }
    if (input.clientId) query = query.eq("client_id", String(input.clientId));
    if (input.type) query = query.contains("contact_types", [String(input.type)]);
    if (input.status) query = query.eq("status", String(input.status));
    if (input.missing === "email") query = query.or("email.is.null,email.eq.");
    if (input.missing === "phone") query = query.or("phone.is.null,phone.eq.");
    const { data, error, count } = await query.order(input.sort === "company" ? "client_id" : "name", { ascending: input.order !== "desc" }).range(from, to);
    if (error) throw error;
    const items = (data ?? []).map((row) => this.fromRow(row));
    const summary = await this.summary();
    return { items, page: input.page, pageSize: input.pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / input.pageSize), summary };
  }

  async get(id: string) {
    if (!this.supabase) return this.memory.get(id);
    const { data, error } = await this.supabase.from("client_contacts").select("*,clients!inner(legal_name,trade_name,rut)").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? this.fromRow(data) : undefined;
  }

  async create(input: ContactInput): Promise<ContactMutationResult> {
    const warnings = await this.duplicates(input.clientId, input.email, input.phone);
    const now = new Date().toISOString();
    const row = this.toRow({ ...input, id: randomUUID(), createdAt: now, updatedAt: now, archivedAt: null, portalStatus: input.portalAccess ? "PENDING_INVITATION" : "DISABLED" });
    if (!this.supabase) {
      const item = this.fromRow({ ...row, clients: { legal_name: "Cliente", trade_name: null, rut: "" } });
      if (item.isPrimary) for (const contact of this.memory.values()) if (contact.clientId === item.clientId) contact.isPrimary = false;
      this.memory.set(item.id, item); return { item, duplicateWarnings: warnings };
    }
    if (input.isPrimary) await this.supabase.rpc("set_primary_client_contact", { target_contact_id: null, target_client_id: input.clientId });
    const { data, error } = await this.supabase.from("client_contacts").insert(row).select("*,clients!inner(legal_name,trade_name,rut)").single();
    if (error) throw error;
    const item = this.fromRow(data);
    if (item.isPrimary) await this.supabase.rpc("set_primary_client_contact", { target_contact_id: item.id, target_client_id: item.clientId });
    if (item.portalAccess) await this.configurePortal(item, true);
    return { item, duplicateWarnings: warnings };
  }

  async update(id: string, patch: Partial<ContactInput>) {
    const current = await this.get(id); if (!current) throw new NotFoundException("Contacto no encontrado.");
    if (!this.supabase) { const next = { ...current, ...patch, updatedAt: new Date().toISOString() }; this.memory.set(id, next); return next; }
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const map: Record<string, string> = { name:"name",position:"position",department:"department",email:"email",phone:"phone",whatsapp:"whatsapp",isPrimary:"is_primary",billingContact:"billing_contact",technicalContact:"technical_contact",commercialContact:"commercial_contact",portalAccess:"portal_access",status:"status",contactTypes:"contact_types",notes:"notes" };
    for (const [key, value] of Object.entries(patch)) if (map[key]) row[map[key]!] = value;
    const { data, error } = await this.supabase.from("client_contacts").update(row).eq("id", id).select("*,clients!inner(legal_name,trade_name,rut)").single();
    if (error) throw error;
    const item = this.fromRow(data);
    if (patch.isPrimary) await this.supabase.rpc("set_primary_client_contact", { target_contact_id: id, target_client_id: item.clientId });
    if (patch.portalAccess !== undefined) await this.configurePortal(item, patch.portalAccess);
    return item;
  }

  async archive(id: string) {
    const current = await this.get(id); if (!current) throw new NotFoundException("Contacto no encontrado.");
    if (!this.supabase) { const next = { ...current, status: "INACTIVE" as const, archivedAt: new Date().toISOString() }; this.memory.set(id, next); return next; }
    const { data, error } = await this.supabase.from("client_contacts").update({ status:"INACTIVE",archived_at:new Date().toISOString(),portal_access:false,portal_status:"DISABLED" }).eq("id", id).select("*,clients!inner(legal_name,trade_name,rut)").single();
    if (error) throw error;
    await this.supabase.from("client_portal_users").update({ status:"DISABLED" }).eq("contact_id", id);
    return this.fromRow(data);
  }

  async setPrimary(id: string) {
    const current = await this.get(id); if (!current) throw new NotFoundException("Contacto no encontrado.");
    if (!this.supabase) { for (const item of this.memory.values()) if (item.clientId === current.clientId) item.isPrimary = item.id === id; return { ...current, isPrimary:true }; }
    const { error } = await this.supabase.rpc("set_primary_client_contact", { target_contact_id:id,target_client_id:current.clientId }); if (error) throw error;
    return this.get(id);
  }

  private async configurePortal(contact: ClientContactDirectoryItem, enabled: boolean) {
    if (!this.supabase) return;
    await this.supabase.from("client_contacts").update({ portal_status:enabled?"PENDING_INVITATION":"DISABLED" }).eq("id",contact.id);
    if (enabled) await this.supabase.from("client_portal_users").upsert({ client_id:contact.clientId,contact_id:contact.id,auth_user_id:null,invited_email:contact.email,status:"PENDING_INVITATION" }, { onConflict:"client_id,contact_id" });
    else await this.supabase.from("client_portal_users").update({ status:"DISABLED" }).eq("contact_id",contact.id);
  }

  private async duplicates(clientId: string, email: string, phone: string | null) {
    if (!this.supabase) return [...this.memory.values()].filter((item) => item.clientId===clientId && (item.email===email || Boolean(phone&&item.phone===phone))).map((item) => `Posible duplicado: ${item.name}.`);
    let query = this.supabase.from("client_contacts").select("name,email,phone").eq("client_id",clientId).is("archived_at",null).eq("email",email);
    if (phone) query = this.supabase.from("client_contacts").select("name,email,phone").eq("client_id",clientId).is("archived_at",null).or(`email.eq.${email},phone.eq.${phone}`);
    const { data } = await query;
    return (data ?? []).map((item) => `Posible duplicado: ${item.name} comparte email o teléfono.`);
  }

  private async summary(): Promise<ContactDirectorySummary> {
    if (!this.supabase) return this.summaryFrom([...this.memory.values()]);
    const { data, error } = await this.supabase.from("client_contacts").select("is_primary,commercial_contact,technical_contact,billing_contact,portal_access,email,phone").is("archived_at",null);
    if (error) throw error; return this.summaryFrom((data ?? []) as never[]);
  }
  private summaryFrom(items: Array<any>): ContactDirectorySummary { return { total:items.length,primary:items.filter((i)=>i.isPrimary??i.is_primary).length,commercial:items.filter((i)=>i.commercialContact??i.commercial_contact).length,technical:items.filter((i)=>i.technicalContact??i.technical_contact).length,billing:items.filter((i)=>i.billingContact??i.billing_contact).length,portal:items.filter((i)=>i.portalAccess??i.portal_access).length,withoutEmail:items.filter((i)=>!i.email).length,withoutPhone:items.filter((i)=>!i.phone).length }; }
  private memoryList(input: Record<string,string|number|undefined>&{page:number;pageSize:number}) { const search=cleanSearch(String(input.search??""))?.toLowerCase(); const all=[...this.memory.values()].filter((i)=>!i.archivedAt&&(!search||[i.name,i.clientName,i.position,i.email,i.phone,i.clientRut].filter(Boolean).some((v)=>String(v).toLowerCase().includes(search)))&&(!input.type||i.contactTypes.includes(input.type as never))&&(!input.clientId||i.clientId===input.clientId)); const start=(input.page-1)*input.pageSize; return {items:all.slice(start,start+input.pageSize),page:input.page,pageSize:input.pageSize,total:all.length,totalPages:Math.ceil(all.length/input.pageSize),summary:this.summaryFrom(all)}; }
  private fromRow(row: Record<string, any>): ClientContactDirectoryItem { const client=Array.isArray(row.clients)?row.clients[0]:row.clients; return { id:row.id,clientId:row.client_id,clientName:client?.trade_name||client?.legal_name||"Cliente",clientRut:client?.rut||"",name:row.name,position:row.position,department:row.department,email:row.email,phone:row.phone,whatsapp:row.whatsapp,isPrimary:row.is_primary,billingContact:row.billing_contact,technicalContact:row.technical_contact,commercialContact:row.commercial_contact,portalAccess:row.portal_access,status:row.status,contactTypes:row.contact_types??[],notes:row.notes,portalStatus:row.portal_status??"DISABLED",createdAt:row.created_at,updatedAt:row.updated_at,archivedAt:row.archived_at }; }
  private toRow(item: Omit<ClientContactDirectoryItem,"clientName"|"clientRut">) { return { id:item.id,client_id:item.clientId,name:item.name,position:item.position,department:item.department,email:item.email,phone:item.phone,whatsapp:item.whatsapp,is_primary:item.isPrimary,billing_contact:item.billingContact,technical_contact:item.technicalContact,commercial_contact:item.commercialContact,portal_access:item.portalAccess,status:item.status,contact_types:item.contactTypes,notes:item.notes,portal_status:item.portalStatus,created_at:item.createdAt,updated_at:item.updatedAt,archived_at:item.archivedAt }; }
}

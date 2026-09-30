import { Injectable, NotFoundException } from "@nestjs/common";
import { ClientEventsService } from "../clients/client-events.service.js";
import { pagination } from "../domain/server-supabase.js";
import { ContactsRepository } from "./contacts.repository.js";
import { validateContact, type ContactInput } from "./contacts.dto.js";

@Injectable()
export class ContactsService {
  constructor(private readonly repository: ContactsRepository, private readonly events: ClientEventsService) {}
  list(query: Record<string,string|undefined>) { return this.repository.list({ ...query, ...pagination(query) }); }
  async get(id:string) { const item=await this.repository.get(id); if(!item) throw new NotFoundException("Contacto no encontrado."); return item; }
  async create(input:ContactInput) { const result=await this.repository.create(validateContact(input)); await this.events.publish(result.item.clientId,"CONTACT_CREATED","Contacto creado",result.item.name); return result; }
  async update(id:string,patch:Partial<ContactInput>) { const current=await this.get(id); const validated=validateContact({ ...current, ...patch }); const item=await this.repository.update(id,validated); await this.events.publish(current.clientId,"CONTACT_UPDATED","Contacto actualizado",item.name); return item; }
  async archive(id:string) { const current=await this.get(id); const item=await this.repository.archive(id); await this.events.publish(current.clientId,"CONTACT_ARCHIVED","Contacto archivado",current.name); return item; }
  async setPrimary(id:string) { const item=await this.repository.setPrimary(id); if(!item) throw new NotFoundException("Contacto no encontrado."); await this.events.publish(item.clientId,"CONTACT_UPDATED","Contacto principal actualizado",item.name); return item; }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import type { ContactInput } from "./contacts.dto.js";
import { ContactsService } from "./contacts.service.js";

const readers = ["GERENTE_GENERAL","EJECUTIVA_VENTAS","COMERCIAL","JEFE_DESARROLLO","PROGRAMADOR","FINANZAS"] as const;
const managers = ["GERENTE_GENERAL","EJECUTIVA_VENTAS","COMERCIAL"] as const;
@Controller("contacts")
export class ContactsController {
  constructor(private readonly service:ContactsService) {}
  @Get() @RequireRoles(...readers) list(@Query() query:Record<string,string|undefined>){return this.service.list(query);}
  @Post() @RequireRoles(...managers) create(@Body() body:ContactInput){return this.service.create(body);}
  @Get(":id") @RequireRoles(...readers) get(@Param("id") id:string){return this.service.get(id);}
  @Patch(":id") @RequireRoles(...managers) update(@Param("id") id:string,@Body() body:Partial<ContactInput>){return this.service.update(id,body);}
  @Post(":id/archive") @RequireRoles(...managers) archive(@Param("id") id:string){return this.service.archive(id);}
  @Post(":id/set-primary") @RequireRoles(...managers) setPrimary(@Param("id") id:string){return this.service.setPrimary(id);}
}

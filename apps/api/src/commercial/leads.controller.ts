import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import type { SalesLead } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import { actor, scopedPageQuery } from "./commercial.validation.js";
import { LeadsService } from "./leads.service.js";
const readers=["GERENTE_GENERAL","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"] as const;
@Controller("leads") export class LeadsController{constructor(private readonly service:LeadsService){}
  @Get() @RequireRoles(...readers) list(@Query() q:Record<string,string|undefined>,@Headers()h:Record<string,string|undefined>){return this.service.list(scopedPageQuery(q,h));}
  @Post() @RequireRoles(...readers) create(@Body() b:Partial<SalesLead>,@Headers() h:Record<string,string|undefined>){return this.service.create(b,actor(h));}
  @Get(":id") @RequireRoles(...readers) get(@Param("id")id:string){return this.service.get(id);}
  @Patch(":id") @RequireRoles(...readers) update(@Param("id")id:string,@Body()b:Partial<SalesLead>,@Headers()h:Record<string,string|undefined>){return this.service.update(id,b,actor(h));}
  @Post(":id/assign") @RequireRoles("GERENTE_GENERAL","JEFE_VENTAS","COMERCIAL") assign(@Param("id")id:string,@Body()b:{assignedTo:string},@Headers()h:Record<string,string|undefined>){return this.service.assign(id,b.assignedTo,actor(h));}
  @Post(":id/qualify") @RequireRoles(...readers) qualify(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.service.qualify(id,actor(h));}
  @Post(":id/disqualify") @RequireRoles(...readers) disqualify(@Param("id")id:string,@Body()b:{reason:string},@Headers()h:Record<string,string|undefined>){return this.service.disqualify(id,b.reason,actor(h));}
  @Post(":id/convert") @RequireRoles(...readers) convert(@Param("id")id:string,@Body()b:any,@Headers()h:Record<string,string|undefined>){return this.service.convert(id,b,actor(h));}
}

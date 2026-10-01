import { Body,Controller,Get,Headers,Param,Patch,Post,Query } from "@nestjs/common";
import type { SalesFollowUp } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import { actor,scopedPageQuery } from "./commercial.validation.js";
import { FollowUpsService } from "./followups.service.js";
const roles=["GERENTE_GENERAL","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"]as const;
@Controller("follow-ups") export class FollowUpsController{constructor(private readonly s:FollowUpsService){}
  @Get() @RequireRoles(...roles) list(@Query()q:Record<string,string|undefined>,@Headers()h:Record<string,string|undefined>){return this.s.list(scopedPageQuery(q,h));}
  @Post() @RequireRoles(...roles) create(@Body()b:Partial<SalesFollowUp>,@Headers()h:Record<string,string|undefined>){return this.s.create(b,actor(h));}
  @Patch(":id") @RequireRoles(...roles) update(@Param("id")id:string,@Body()b:Partial<SalesFollowUp>,@Headers()h:Record<string,string|undefined>){return this.s.update(id,b,actor(h));}
  @Post(":id/complete") @RequireRoles(...roles) complete(@Param("id")id:string,@Body()b:{outcome:string},@Headers()h:Record<string,string|undefined>){return this.s.complete(id,b.outcome,actor(h));}
  @Post(":id/reschedule") @RequireRoles(...roles) reschedule(@Param("id")id:string,@Body()b:{scheduledAt:string},@Headers()h:Record<string,string|undefined>){return this.s.reschedule(id,b.scheduledAt,actor(h));}
}

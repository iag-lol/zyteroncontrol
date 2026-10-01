import { Body,Controller,Get,Headers,Param,Patch,Post,Query } from "@nestjs/common";
import type { SalesOpportunity } from "@zyteron/contracts";
import { RequireRoles } from "../auth/roles.decorator.js";
import { actor,scopedPageQuery } from "./commercial.validation.js";
import { OpportunitiesService } from "./opportunities.service.js";
const roles=["GERENTE_GENERAL","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"]as const;
@Controller("opportunities") export class OpportunitiesController{constructor(private readonly s:OpportunitiesService){}
  @Get() @RequireRoles(...roles) list(@Query()q:Record<string,string|undefined>,@Headers()h:Record<string,string|undefined>){return this.s.list(scopedPageQuery(q,h));}
  @Get("stages") @RequireRoles(...roles) stages(){return this.s.stages();}
  @Post() @RequireRoles(...roles) create(@Body()b:Partial<SalesOpportunity>,@Headers()h:Record<string,string|undefined>){return this.s.create(b,actor(h));}
  @Get(":id") @RequireRoles(...roles) get(@Param("id")id:string){return this.s.get(id);}
  @Patch(":id") @RequireRoles(...roles) update(@Param("id")id:string,@Body()b:Partial<SalesOpportunity>,@Headers()h:Record<string,string|undefined>){return this.s.update(id,b,actor(h));}
  @Post(":id/change-stage") @RequireRoles(...roles) stage(@Param("id")id:string,@Body()b:{stageId:string;reason?:string},@Headers()h:Record<string,string|undefined>){return this.s.changeStage(id,b.stageId,b.reason||null,actor(h));}
  @Post(":id/win") @RequireRoles(...roles) win(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.win(id,actor(h));}
  @Post(":id/lose") @RequireRoles(...roles) lose(@Param("id")id:string,@Body()b:{reason:string},@Headers()h:Record<string,string|undefined>){return this.s.lose(id,b.reason,actor(h));}
}

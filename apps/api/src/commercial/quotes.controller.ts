import { Body,Controller,Get,Headers,Param,Patch,Post,Query } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { actor,scopedPageQuery } from "./commercial.validation.js";
import { QuotesService } from "./quotes.service.js";
const roles=["GERENTE_GENERAL","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"]as const;
@Controller("quotes") export class CommercialQuotesController{constructor(private readonly s:QuotesService){}
  @Get() @RequireRoles(...roles) list(@Query()q:Record<string,string|undefined>,@Headers()h:Record<string,string|undefined>){return this.s.list(scopedPageQuery(q,h));}
  @Get("catalog") @RequireRoles(...roles) catalog(){return this.s.catalog();}
  @Post() @RequireRoles(...roles) create(@Body()b:any,@Headers()h:Record<string,string|undefined>){return this.s.create(b,actor(h),h["x-zyteron-role"]||"EJECUTIVA_VENTAS");}
  @Get(":id") @RequireRoles(...roles) get(@Param("id")id:string){return this.s.get(id);}
  @Patch(":id") @RequireRoles(...roles) update(@Param("id")id:string,@Body()b:any,@Headers()h:Record<string,string|undefined>){return this.s.update(id,b,actor(h));}
  @Post(":id/duplicate") @RequireRoles(...roles) duplicate(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.duplicate(id,actor(h),h["x-zyteron-role"]||"EJECUTIVA_VENTAS");}
  @Post(":id/cancel") @RequireRoles(...roles) cancel(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.cancel(id,actor(h));}
  @Post(":id/version") @RequireRoles(...roles) version(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.version(id,actor(h));}
  @Post(":id/submit-approval") @RequireRoles(...roles) submit(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.submit(id,actor(h));}
  @Post(":id/approve") @RequireRoles("GERENTE_GENERAL","JEFE_VENTAS","COMERCIAL") approve(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.approve(id,actor(h));}
  @Post(":id/reject") @RequireRoles("GERENTE_GENERAL","JEFE_VENTAS","COMERCIAL") reject(@Param("id")id:string,@Body()b:{reason:string},@Headers()h:Record<string,string|undefined>){return this.s.reject(id,b.reason,actor(h));}
  @Post(":id/preview") @RequireRoles(...roles) preview(@Param("id")id:string){return this.s.preview(id);}
  @Post(":id/pdf") @RequireRoles(...roles) pdf(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.generatePdf(id,actor(h));}
  @Post(":id/send") @RequireRoles(...roles) send(@Param("id")id:string,@Body()b:{to:string},@Headers("idempotency-key")key:string,@Headers()h:Record<string,string|undefined>){return this.s.send(id,b.to,key,actor(h));}
  @Post(":id/accept") @RequireRoles("GERENTE_GENERAL","JEFE_VENTAS","COMERCIAL") accept(@Param("id")id:string,@Headers("idempotency-key")key:string,@Headers()h:Record<string,string|undefined>){return this.s.accept(id,key,actor(h));}
  @Post(":id/decline") @RequireRoles(...roles) decline(@Param("id")id:string,@Body()b:{reason:string},@Headers()h:Record<string,string|undefined>){return this.s.decline(id,b.reason,actor(h));}
  @Post(":id/convert-to-client") @RequireRoles("GERENTE_GENERAL","JEFE_VENTAS","COMERCIAL") client(@Param("id")id:string,@Body()b:any,@Headers()h:Record<string,string|undefined>){return this.s.createClient(id,b,actor(h));}
  @Post(":id/convert-to-contract") @RequireRoles("GERENTE_GENERAL","JEFE_VENTAS","COMERCIAL") contract(@Param("id")id:string,@Headers()h:Record<string,string|undefined>){return this.s.contract(id,actor(h));}
  @Post(":id/convert-to-work-order") @RequireRoles("GERENTE_GENERAL","JEFE_VENTAS","COMERCIAL","JEFE_DESARROLLO") ot(@Param("id")id:string,@Body()b:{overrideReason?:string},@Headers("idempotency-key")key:string,@Headers()h:Record<string,string|undefined>){return this.s.workOrder(id,key,b.overrideReason||null,actor(h));}
}

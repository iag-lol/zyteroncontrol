import { Controller,Get,Query } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { CommercialService } from "./commercial.service.js";
const roles=["GERENTE_GENERAL","JEFE_VENTAS","EJECUTIVA_VENTAS","COMERCIAL"]as const;
@Controller("commercial") export class CommercialController{constructor(private readonly s:CommercialService){}
  @Get("summary") @RequireRoles(...roles) summary(){return this.s.summary();}
  @Get("activity") @RequireRoles(...roles) activity(){return this.s.activity();}
  @Get("lead-sources") @RequireRoles(...roles) sources(){return this.s.sources();}
  @Get("pipeline-stages") @RequireRoles(...roles) stages(){return this.s.stages();}
  @Get("search") @RequireRoles(...roles) search(@Query("q")q:string){return this.s.search(q||"");}
}

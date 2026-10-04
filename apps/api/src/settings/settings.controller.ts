import { Body,Controller,Get,Headers,Param,Patch,Post,Query } from "@nestjs/common";
import { RequireAal2,RequirePermissions,RequireRoles } from "../auth/roles.decorator.js";
import { SettingsService,type SettingsActor } from "./settings.service.js";

type HeaderMap=Record<string,string|string[]|undefined>;
const header=(h:HeaderMap,key:string)=>{const value=h[key];return Array.isArray(value)?value[0]:value;};
const actor=(h:HeaderMap):SettingsActor=>({userId:header(h,"x-zyteron-user-id")??null,role:header(h,"x-zyteron-role")??"",aal:header(h,"x-zyteron-aal")==="aal2"?"aal2":"aal1",requestId:header(h,"x-request-id")??null});
const readers=["GERENTE_GENERAL","SECURITY_ADMIN","RRHH","FINANZAS","JEFE_VENTAS","JEFE_DESARROLLO","OPERACIONES"]as const;
const admins=["GERENTE_GENERAL","SECURITY_ADMIN"]as const;

@Controller("settings")
export class SettingsController{
 constructor(private readonly settings:SettingsService){}
 @Get()@RequireRoles(...readers)@RequirePermissions("settings.dashboard.view")index(){return this.settings.workspace();}
 @Get("summary")@RequireRoles(...readers)@RequirePermissions("settings.dashboard.view")async summary(){return(await this.settings.workspace()).summary;}
 @Get("workspace")@RequireRoles(...readers)@RequirePermissions("settings.dashboard.view")workspace(@Query("force")force?:string){return this.settings.workspace(force==="true");}
 @Get("configuration")@RequireRoles(...readers)@RequirePermissions("settings.company.view")configuration(@Query("namespace")namespace?:string){return this.settings.configuration(namespace);}
 @Get("configuration/:namespace/:key")@RequireRoles(...readers)@RequirePermissions("settings.company.view")getConfiguration(@Param("namespace")namespace:string,@Param("key")key:string){return this.settings.getConfiguration(namespace,key);}
 @Patch("configuration/:namespace/:key")@RequireRoles(...admins,"RRHH","FINANZAS")@RequirePermissions("settings.company.manage")change(@Param("namespace")namespace:string,@Param("key")key:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.changeConfiguration(namespace,key,body,actor(headers));}
 @Get("history")@RequireRoles(...readers)@RequirePermissions("configuration_history.view")history(){return this.settings.history();}
 @Post("configuration/:id/rollback")@RequireRoles(...admins)@RequirePermissions("configuration.rollback")@RequireAal2()rollback(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.rollback(id,body,actor(headers));}
 @Post("approvals/:id/approve")@RequireRoles(...admins)@RequirePermissions("approval_policy.manage")@RequireAal2()approve(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.approve(id,body,actor(headers));}

 @Get("automations")@RequireRoles(...readers)@RequirePermissions("automation.view")async automations(){return(await this.settings.workspace()).automations;}
 @Post("automations")@RequireRoles(...admins,"JEFE_DESARROLLO","OPERACIONES")@RequirePermissions("automation.create")createAutomation(@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.createAutomation(body,actor(headers));}
 @Get("automations/:id")@RequireRoles(...readers)@RequirePermissions("automation.view")async automation(@Param("id")id:string){return(await this.settings.workspace()).automations.find(item=>item.id===id);}
 @Patch("automations/:id")@RequireRoles(...admins,"JEFE_DESARROLLO","OPERACIONES")@RequirePermissions("automation.edit")updateAutomation(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.updateAutomation(id,body,actor(headers));}
 @Post("automations/:id/test")@RequireRoles(...readers)@RequirePermissions("automation.view")testAutomation(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.testAutomation(id,body,actor(headers));}
 @Post("automations/:id/enable")@RequireRoles(...admins)@RequirePermissions("automation.enable")@RequireAal2()enableAutomation(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleAutomation(id,true,actor(headers),String(body.reason??"Habilitación autorizada"));}
 @Post("automations/:id/disable")@RequireRoles(...admins)@RequirePermissions("automation.enable")@RequireAal2()disableAutomation(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleAutomation(id,false,actor(headers),String(body.reason??"Deshabilitación autorizada"));}
 @Get("automations/:id/runs")@RequireRoles(...readers)@RequirePermissions("automation.view")async automationRuns(@Param("id")id:string){return(await this.settings.workspace()).automationRuns.filter(item=>item.ruleId===id);}

 @Get("alerts")@RequireRoles(...readers)@RequirePermissions("alert.view")async alerts(){return(await this.settings.workspace()).alerts;}
 @Post("alerts")@RequireRoles(...admins)@RequirePermissions("alert.manage")createAlert(@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.createAlert(body,actor(headers));}
 @Patch("alerts/:id")@RequireRoles(...admins)@RequirePermissions("alert.manage")updateAlert(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.updateAlert(id,body,actor(headers));}
 @Post("alerts/:id/test")@RequireRoles(...admins)@RequirePermissions("alert.manage")testAlert(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.testAlert(id,body,actor(headers));}
 @Post("alerts/:id/enable")@RequireRoles(...admins)@RequirePermissions("alert.manage")@RequireAal2()enableAlert(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleAlert(id,true,actor(headers),String(body.reason??"Habilitación autorizada"));}
 @Post("alerts/:id/disable")@RequireRoles(...admins)@RequirePermissions("alert.manage")@RequireAal2()disableAlert(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleAlert(id,false,actor(headers),String(body.reason??"Deshabilitación autorizada"));}

 @Get("integrations")@RequireRoles(...readers)@RequirePermissions("integration.view")async integrations(){return(await this.settings.workspace()).integrations;}
 @Get("integrations/:id")@RequireRoles(...readers)@RequirePermissions("integration.view")async integration(@Param("id")id:string){return(await this.settings.workspace()).integrations.find(item=>item.id===id);}
 @Post("integrations/:id/configure")@RequireRoles(...admins)@RequirePermissions("integration.manage")@RequireAal2()configureIntegration(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.configureIntegration(id,body,actor(headers));}
 @Post("integrations/:id/test")@RequireRoles(...admins)@RequirePermissions("integration.test")testIntegration(@Param("id")id:string,@Headers()headers:HeaderMap){return this.settings.testIntegration(id,actor(headers));}
 @Post("integrations/:id/enable")@RequireRoles(...admins)@RequirePermissions("integration.manage")@RequireAal2()enableIntegration(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleIntegration(id,true,actor(headers),String(body.reason??"Habilitación autorizada"));}
 @Post("integrations/:id/disable")@RequireRoles(...admins)@RequirePermissions("integration.manage")@RequireAal2()disableIntegration(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleIntegration(id,false,actor(headers),String(body.reason??"Deshabilitación autorizada"));}

 @Get("webhooks")@RequireRoles(...readers)@RequirePermissions("webhook.view")async webhooks(){return(await this.settings.workspace()).webhooks;}
 @Post("webhooks")@RequireRoles(...admins)@RequirePermissions("webhook.manage")@RequireAal2()createWebhook(@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.createWebhook(body,actor(headers));}
 @Patch("webhooks/:id")@RequireRoles(...admins)@RequirePermissions("webhook.manage")@RequireAal2()updateWebhook(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.updateWebhook(id,body,actor(headers));}
 @Post("webhooks/:id/test")@RequireRoles(...admins)@RequirePermissions("webhook.manage")testWebhook(@Param("id")id:string,@Headers()headers:HeaderMap){return this.settings.testWebhook(id,actor(headers));}
 @Get("webhooks/:id/deliveries")@RequireRoles(...readers)@RequirePermissions("webhook.view")async deliveries(@Param("id")id:string){return(await this.settings.workspace()).webhookDeliveries.filter(item=>item.webhookId===id);}

 @Get("features")@RequireRoles(...readers)@RequirePermissions("feature_flag.view")async features(){return(await this.settings.workspace()).features;}
 @Post("features")@RequireRoles(...admins)@RequirePermissions("feature_flag.manage")createFeature(@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.createFeature(body,actor(headers));}
 @Patch("features/:id")@RequireRoles(...admins)@RequirePermissions("feature_flag.manage")updateFeature(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.updateFeature(id,body,actor(headers));}
 @Post("features/:id/enable")@RequireRoles(...admins)@RequirePermissions("feature_flag.manage")@RequireAal2()enableFeature(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleFeature(id,true,actor(headers),String(body.reason??"Habilitación autorizada"));}
 @Post("features/:id/disable")@RequireRoles(...admins)@RequirePermissions("feature_flag.manage")@RequireAal2()disableFeature(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleFeature(id,false,actor(headers),String(body.reason??"Deshabilitación autorizada"));}

 @Get("diagnostics")@RequireRoles(...admins)@RequirePermissions("diagnostics.view")async diagnostics(){return(await this.settings.workspace()).diagnostics;}
 @Post("diagnostics/run")@RequireRoles(...admins)@RequirePermissions("diagnostics.run")runDiagnostics(@Headers()headers:HeaderMap){return this.settings.runDiagnostics(actor(headers));}
 @Get("diagnostics/:service")@RequireRoles(...admins)@RequirePermissions("diagnostics.view")async diagnostic(@Param("service")service:string){return(await this.settings.workspace()).diagnostics.filter(item=>item.service===service.toUpperCase());}
 @Get("jobs")@RequireRoles(...readers)@RequirePermissions("job.view")async jobs(){return(await this.settings.workspace()).jobs;}
 @Get("jobs/:id")@RequireRoles(...readers)@RequirePermissions("job.view")async job(@Param("id")id:string){return(await this.settings.workspace()).jobs.find(item=>item.id===id);}
 @Post("jobs/:id/run")@RequireRoles(...admins)@RequirePermissions("job.run")@RequireAal2()runJob(@Param("id")id:string,@Headers()headers:HeaderMap){return this.settings.runJob(id,actor(headers));}
 @Post("jobs/:id/enable")@RequireRoles(...admins)@RequirePermissions("system_settings.manage")@RequireAal2()enableJob(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleJob(id,true,actor(headers),String(body.reason??"Habilitación autorizada"));}
 @Post("jobs/:id/disable")@RequireRoles(...admins)@RequirePermissions("system_settings.manage")@RequireAal2()disableJob(@Param("id")id:string,@Body()body:Record<string,unknown>,@Headers()headers:HeaderMap){return this.settings.toggleJob(id,false,actor(headers),String(body.reason??"Deshabilitación autorizada"));}
}

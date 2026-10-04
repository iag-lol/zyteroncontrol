import { BadRequestException,ForbiddenException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach,describe,expect,it } from "vitest";
import { SettingsRepository } from "./settings.repository.js";
import { SettingsService,type SettingsActor } from "./settings.service.js";

const admin:SettingsActor={userId:"10000000-0000-4000-8000-000000000001",role:"GERENTE_GENERAL",aal:"aal2",requestId:"settings-test"};
const aal1:SettingsActor={...admin,aal:"aal1"};
describe("Enterprise Control Plane",()=>{
 let repository:SettingsRepository,service:SettingsService;
 beforeEach(()=>{delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;repository=new SettingsRepository();service=new SettingsService(repository);});
 it("crea configuración tipada, versiona y conserva historia",async()=>{const first=await service.changeConfiguration("company","legal_name",{value:"Zyteron SpA",valueType:"STRING",reason:"Alta legal"},admin)as any;expect(first.version).toBe(1);const second=await service.changeConfiguration("company","legal_name",{value:"Zyteron Tecnología SpA",valueType:"STRING",reason:"Cambio aprobado"},admin)as any;expect(second.version).toBe(2);expect(await service.history()).toHaveLength(2);});
 it("rechaza debilitar invariantes de seguridad",async()=>{await expect(service.changeConfiguration("security","rls.enabled",{value:false,valueType:"BOOLEAN",classification:"CRITICAL",reason:"QA"},admin)).rejects.toBeInstanceOf(ForbiddenException);});
 it("exige AAL2 para configuración crítica",async()=>{await expect(service.changeConfiguration("security","mfa.required",{value:true,valueType:"BOOLEAN",classification:"CRITICAL",reason:"QA"},aal1)).rejects.toBeInstanceOf(ForbiddenException);});
 it("nunca acepta secretos plaintext",async()=>{await expect(service.changeConfiguration("notifications","email",{value:"enabled",valueType:"STRING",apiKey:"secret",reason:"QA"},admin)).rejects.toBeInstanceOf(BadRequestException);});
 it("rechaza secretos plaintext aunque estén anidados",async()=>{await service.workspace();const integration=(await service.workspace()).integrations[0]!;await expect(service.configureIntegration(integration.id,{configuration:{apiKey:"secret"},reason:"QA"},admin)).rejects.toBeInstanceOf(BadRequestException);});
 it("restringe namespaces por propietario",async()=>{await expect(service.changeConfiguration("finance","tax_mode",{value:"strict",valueType:"STRING",reason:"QA"},{...admin,role:"RRHH"})).rejects.toBeInstanceOf(ForbiddenException);});
 it("prueba automatizaciones sin ejecutar side-effects",async()=>{const rule=await service.createAutomation({name:"QA",eventType:"CLIENT_CREATED",conditions:[{field:"country",operator:"equals",value:"CL"}],actions:[{type:"SEND_NOTIFICATION",config:{}}],reason:"QA"},admin);const run=await service.testAutomation(rule.id,{eventType:"CLIENT_CREATED",payload:{country:"CL"}},admin);expect(run.result).toBe("DRY_RUN");expect(run.matched).toBe(true);expect(run.actions[0]).toMatchObject({wouldExecute:true});});
 it("previene loops por profundidad máxima",async()=>{const rule=await service.createAutomation({name:"Loop guard",eventType:"CLIENT_CREATED",conditions:[],actions:[{type:"SEND_NOTIFICATION",config:{}}],maxDepth:2,reason:"QA"},admin);const run=await service.testAutomation(rule.id,{eventType:"CLIENT_CREATED",depth:2},admin);expect(run.result).toBe("SKIPPED_LOOP");expect(run.actions).toHaveLength(0);});
 it("requiere HTTPS para webhooks",async()=>{await expect(service.createWebhook({name:"QA",url:"http://localhost/hook",events:["CLIENT_CREATED"],secretReference:"vault://qa/webhook",reason:"QA"},admin)).rejects.toBeInstanceOf(BadRequestException);});
 it("requiere referencia de Vault para firmar webhooks",async()=>{await expect(service.createWebhook({name:"QA",url:"https://example.com/hook",events:["CLIENT_CREATED"],reason:"QA"},admin)).rejects.toBeInstanceOf(BadRequestException);});
 it("no declara integraciones conectadas sin prueba",async()=>{const workspace=await service.workspace();expect(workspace.integrations.every(item=>item.status==="NOT_CONFIGURED")).toBe(true);});
 it("instala el catálogo de integraciones aunque Desarrollo no se haya migrado",()=>{const sql=readFileSync(resolve(process.cwd(),"../../supabase/migrations/20261004060000_enterprise_control_plane.sql"),"utf8"),createAt=sql.indexOf("create table if not exists public.integration_connections"),alterAt=sql.indexOf("alter table public.integration_connections");expect(createAt).toBeGreaterThan(-1);expect(alterAt).toBeGreaterThan(createAt);expect(sql).toContain("unique(provider,display_name)");});
});

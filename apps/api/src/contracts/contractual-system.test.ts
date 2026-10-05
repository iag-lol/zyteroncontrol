import { BadRequestException, ConflictException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ClientEventsService } from "../clients/client-events.service.js";
import { ClientsRepository } from "../clients/clients.repository.js";
import { ContractDocumentService, renderContractText } from "./contract-document.service.js";
import { chileanContractTemplates } from "./contract-template-catalog.js";
import { CONTRACT_BUILDER_CONTACT_COLUMNS, ContractsRepository } from "./contracts.repository.js";
import { ContractsService } from "./contracts.service.js";

const clientId="11111111-1111-4111-8111-111111111111",projectId="22222222-2222-4222-8222-222222222222";
const nested=(keys:string[])=>{const result:Record<string,unknown>={};for(const key of keys){const parts=key.split(".");let node=result;parts.forEach((part,index)=>{if(index===parts.length-1)node[part]=`Valor ${key}`;else{node[part]??={};node=node[part] as Record<string,unknown>;}});}result.pi={...((result.pi as Record<string,unknown>)??{}),modalidad:"A"};return result;};
const input=(overrides:Record<string,unknown>={})=>({clientId,projectId,name:"Contrato de prueba",description:null,contractType:"DESARROLLO",status:"DRAFT" as const,startDate:"2026-10-04",endDate:"2027-10-04",renewalType:"NONE" as const,renewalNoticeDays:30,billingFrequency:"ONE_TIME" as const,currency:"CLP",subtotal:100000,tax:19000,total:119000,responsibleUserId:null,portalVisible:false,independentReason:"Proyecto independiente autorizado para prueba",templateCodes:["ZT-PROYECTO-CL","ZT-CONDICIONES-CL"],builderValues:nested(chileanContractTemplates.filter(item=>["ZT-PROYECTO-CL","ZT-CONDICIONES-CL"].includes(item.code)).flatMap(item=>item.variables.map(variable=>variable.key))),...overrides});

describe("sistema contractual chileno",()=>{
  beforeEach(()=>{delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SIGNATURE_PROVIDER;});

  it("incorpora las seis plantillas completas como revisión legal requerida",()=>{
    expect(chileanContractTemplates.map(item=>item.code)).toEqual(["ZT-PROYECTO-CL","ZT-CONDICIONES-CL","ZT-NDA-CL","ZT-RECURRENTES-CL","ZT-DATOS-CL","ZT-CAMBIO-CL"]);
    expect(chileanContractTemplates.every(item=>item.status==="LEGAL_REVIEW_REQUIRED"&&item.body.length>500)).toBe(true);
    expect(chileanContractTemplates.find(item=>item.code==="ZT-PROYECTO-CL")?.body).toContain("No se exigirá automáticamente todo el saldo");
  });

  it("consulta el directorio de contactos con las columnas canónicas de Client 360",()=>{
    expect(CONTRACT_BUILDER_CONTACT_COLUMNS).toBe("id,name,email,position,contact_types,is_primary");
  });

  it("selecciona una sola modalidad de propiedad intelectual en el documento",async()=>{
    const repository=new ContractsRepository(),contract=await repository.create(input() as never),text=renderContractText(contract).find(item=>item.code==="ZT-CONDICIONES-CL")!.text;
    expect(text).toContain("MODALIDAD A");expect(text).not.toContain("MODALIDAD B");expect(text).not.toContain("MODALIDAD C");
    const pdf=await new ContractDocumentService().render(contract);expect(pdf.hash).toMatch(/^[0-9a-f]{64}$/);expect(pdf.bytes.byteLength).toBeGreaterThan(1000);
  });

  it("bloquea aprobación con variables esenciales vacías",async()=>{
    const repository=new ContractsRepository(),service=new ContractsService(repository,new ClientEventsService(new ClientsRepository()));const contract=await service.create(input({builderValues:{pi:{modalidad:"A"}}}) as never),validation=await service.validate(contract.id);
    expect(validation.valid).toBe(false);expect(validation.errors.some(error=>error.startsWith("Completa "))).toBe(true);
  });

  it("mantiene inmutable el snapshot congelado y exige nueva versión",async()=>{
    const repository=new ContractsRepository(),contract=await repository.create(input() as never);await repository.approveBuilder(contract.id,{hash:"a".repeat(64),documentId:"33333333-3333-4333-8333-333333333333",actorId:null});
    await expect(repository.builderPatch(contract.id,{builderValues:{cambio:"silencioso"}})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("no simula firma si el proveedor documental no está disponible",async()=>{
    const repository=new ContractsRepository(),service=new ContractsService(repository,new ClientEventsService(new ClientsRepository()));const contract=await repository.create(input() as never);await repository.approveBuilder(contract.id,{hash:"b".repeat(64),documentId:"33333333-3333-4333-8333-333333333333",actorId:null});
    await expect(service.requestSignature(contract.id,{signers:[{name:"Representante",email:"firma@example.cl",order:1}]},{userId:null,role:"GERENTE_GENERAL"})).rejects.toBeInstanceOf(ConflictException);
  });

  it("crea obligaciones solo como borradores idempotentes y no convierte firma en pago",async()=>{
    const repository=new ContractsRepository(),base=input(),values=base.builderValues as Record<string,any>;values.tabla={...(values.tabla??{}),pagos:[{title:"Anticipo",amount:50000,dueDate:"2026-10-10"}],servicios_recurrentes:[{title:"Hosting",amount:20000,activationCondition:"Dominio en producción"}]};const contract=await repository.create({...base,builderValues:values} as never),first=await repository.createObligationDrafts(contract),second=await repository.createObligationDrafts(contract);
    expect(first).toHaveLength(2);expect(second).toHaveLength(2);expect(second.every(item=>item.status==="DRAFT")).toBe(true);expect(contract.collectionStatus).toBe("NOT_DUE");
  });

  it("registra revisión separada de facultades para ambas partes",async()=>{
    const repository=new ContractsRepository(),contract=await repository.create(input() as never);await repository.recordReview(contract.id,{party:"ZYTERON",representativeName:"Representante Z",authorityBasis:"Personería revisada",status:"VERIFIED"},null);await repository.recordReview(contract.id,{party:"CLIENT",representativeName:"Representante C",authorityBasis:"Mandato revisado",status:"VERIFIED"},null);expect(new Set((await repository.reviews(contract.id)).map(item=>item.party))).toEqual(new Set(["ZYTERON","CLIENT"]));
  });

  it("la migración valida cruce de cliente, idempotencia y evita cobros automáticos",()=>{
    const sql=readFileSync(resolve(process.cwd(),"../../supabase/migrations/20261004180000_contractual_system_cl.sql"),"utf8");
    expect(sql).toContain("El proyecto pertenece a otro cliente");expect(sql).toContain("unique(contract_id,idempotency_key)");expect(sql).toContain("RECURRING_SERVICE_DRAFT");expect(sql).not.toContain("insert into public.invoices");expect(sql).not.toContain("insert into public.payments");
  });
});

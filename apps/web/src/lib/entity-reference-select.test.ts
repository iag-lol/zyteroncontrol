import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";

describe("selectores de referencias empresariales",()=>{
 const component=readFileSync(resolve(process.cwd(),"src/components/entity-reference-select.tsx"),"utf8");
 const documents=readFileSync(resolve(process.cwd(),"src/components/documents/documents-workspace.tsx"),"utf8");
 const support=readFileSync(resolve(process.cwd(),"src/components/support/support-workspace.tsx"),"utf8");
 const security=readFileSync(resolve(process.cwd(),"src/components/security/security-workspace.tsx"),"utf8");

 it("resuelve las referencias desde sus dominios canónicos",()=>{
  for(const source of ["clientsApi.list","operationsApi.projects","contractsApi.list","commercialApi.quotes","operationsApi.workOrders","auditsApi.audits","supportApi.tickets","documentsApi.list","documentsApi.users"])expect(component).toContain(source);
 });

 it("no solicita UUID manuales en documentos ni soporte",()=>{
  expect(documents).toContain("Registro relacionado<EntityReferenceSelect");
  expect(support).toContain('type="CLIENT"');
  expect(documents).not.toContain("UUID real de la entidad");
  expect(support).not.toContain("UUID desde Client 360");
 });

 it("usa catálogos para recurso y permiso en solicitudes de acceso",()=>{
  expect(security).toContain('placeholder="Seleccionar recurso"');
  expect(security).toContain("permissions.map");
  expect(security).toContain("resourceId:\"\"");
  expect(security).not.toMatch(/resourceId[^<]{0,120}<input/);
 });
});

import { describe,expect,it } from "vitest";
import type { ContractTemplateVariable } from "./client-domain-api";
import { applyContractDefaults,contractValue,friendlyContractLabel,missingEssentialContractFields,withContractValue,withoutContractNamespaces } from "./contract-builder-model";

const variable=(key:string,origin:ContractTemplateVariable["origin"]="HUMAN_DECISION"):ContractTemplateVariable=>({key,label:key,origin,required:true,visibility:"CLIENT",editableBy:["CREATOR"]});
const context={
  client:{legal_name:"Cliente SpA",rut:"76.111.222-3",address:"Av. Principal 100",commune:"Santiago",region:"Metropolitana",dte_email:"dte@cliente.cl"},
  company:{company_legal_name:"Zyteron SpA",company_rut:"78.398.774-0",company_address:"Antonio Bellet 193",company_commune:"Providencia",company_city:"Santiago"},
  project:{project_number:"PRJ-2026-000001",name:"Portal cliente",scope:"Diseño y desarrollo del portal"},
  quote:{quote_number:"COT-2026-10000",version:1,accepted_at:"2026-10-05T10:00:00Z",payment_terms:"50% anticipo y 50% contra entrega"},
  contact:{name:"Ana Pérez",position:"Gerente General",email:"ana@cliente.cl"},
  currency:"CLP",subtotal:100000,tax:19000,total:119000,today:"2026-10-05",
};

describe("modelo guiado del constructor contractual",()=>{
  it("precarga fuentes canónicas y condiciones legibles sin sobrescribir decisiones humanas",()=>{
    const variables=[variable("cliente.razon_social","CLIENT"),variable("cliente.representante_nombre","CLIENT"),variable("cliente.representante_rut","CLIENT"),variable("proyecto.objetivo","PROJECT"),variable("precio.total","QUOTE"),variable("calendario.revision")];
    const source=withContractValue({},"cliente.representante_rut","11.111.111-1");
    const values=applyContractDefaults(source,variables,context);
    expect(contractValue(values,"cliente.razon_social")).toBe("Cliente SpA");
    expect(contractValue(values,"cliente.representante_nombre")).toBe("Ana Pérez");
    expect(contractValue(values,"cliente.representante_rut")).toBe("11.111.111-1");
    expect(contractValue(values,"proyecto.objetivo")).toBe("Diseño y desarrollo del portal");
    expect(contractValue(values,"precio.total")).toBe("CLP 119.000");
    expect(contractValue(values,"calendario.revision")).toContain("5 días hábiles");
  });

  it("reduce la captura obligatoria a representantes y personería",()=>{
    const values=applyContractDefaults({},[variable("cliente.representante_nombre"),variable("cliente.representante_cargo"),variable("empresa.representante_cargo")],context);
    const missing=missingEssentialContractFields(values);
    expect(missing).toHaveLength(5);
    expect(missing.join(" ")).toContain("rut del representante del cliente");
    expect(missing.join(" ")).toContain("facultad para representar a zyteron");
  });

  it("presenta etiquetas humanas en vez de claves internas",()=>{
    expect(friendlyContractLabel("tabla.aportes_cliente")).toBe("Aportes requeridos al cliente");
    expect(friendlyContractLabel("nda.canal_incidentes_y_condiciones")).toBe("Canal incidentes y condiciones");
  });

  it("actualiza montos canónicos y permite limpiar el contexto al cambiar de cliente",()=>{
    const variables=[variable("precio.total","QUOTE"),variable("proyecto.objetivo","PROJECT")];
    const first=applyContractDefaults({},variables,context),second=applyContractDefaults(first,variables,{...context,total:250000,project:{...context.project,scope:"Nuevo alcance"}});
    expect(contractValue(second,"precio.total")).toBe("CLP 250.000");
    expect(contractValue(second,"proyecto.objetivo")).toBe("Nuevo alcance");
    expect(contractValue(withoutContractNamespaces(second,["precio","proyecto"]),"precio.total")).toBeUndefined();
  });
});

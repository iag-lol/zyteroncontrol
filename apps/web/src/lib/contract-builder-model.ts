import type { ContractTemplateVariable } from "./client-domain-api";

export type ContractValues=Record<string,unknown>;

export interface ContractDefaultContext{
  client?:Record<string,unknown>|null;
  company?:Record<string,unknown>|null;
  project?:Record<string,unknown>|null;
  quote?:Record<string,unknown>|null;
  contact?:Record<string,unknown>|null;
  currency:string;
  subtotal:number;
  tax:number;
  total:number;
  today:string;
}

export const contractValue=(source:ContractValues,key:string)=>key.split(".").reduce<unknown>((value,part)=>value&&typeof value==="object"?(value as ContractValues)[part]:undefined,source);

export const withContractValue=(source:ContractValues,key:string,value:unknown)=>{
  const copy=structuredClone(source),parts=key.split(".");let node=copy;
  parts.forEach((part,index)=>{if(index===parts.length-1)node[part]=value;else{if(!node[part]||typeof node[part]!=="object")node[part]={};node=node[part] as ContractValues;}});
  return copy;
};

export const withoutContractNamespaces=(source:ContractValues,namespaces:string[])=>{
  const copy=structuredClone(source);for(const namespace of namespaces)delete copy[namespace];return copy;
};

const clean=(value:unknown)=>String(value??"").trim();
const money=(value:number,currency:string)=>`${currency} ${new Intl.NumberFormat("es-CL").format(value)}`;

export const essentialContractFields=[
  {key:"cliente.representante_nombre",label:"Nombre del representante del cliente",placeholder:"Nombre y apellidos",help:"Persona autorizada para representar al cliente."},
  {key:"cliente.representante_cargo",label:"Cargo del representante del cliente",placeholder:"Ej.: Gerente General",help:"Cargo vigente de la persona que firmará."},
  {key:"cliente.representante_rut",label:"RUT del representante del cliente",placeholder:"12.345.678-9",help:"RUT de la persona natural que firmará."},
  {key:"cliente.personeria",label:"Facultad para representar al cliente",placeholder:"Ej.: escritura pública de fecha…, otorgada en la Notaría…",help:"Documento o antecedente donde constan sus poderes. No ingreses una contraseña ni un secreto."},
  {key:"empresa.representante_nombre",label:"Representante de Zyteron",placeholder:"Nombre y apellidos",help:"Persona autorizada que firmará por Zyteron."},
  {key:"empresa.representante_cargo",label:"Cargo en Zyteron",placeholder:"Ej.: Gerente General",help:"Cargo vigente de quien firmará por Zyteron."},
  {key:"empresa.representante_rut",label:"RUT del representante de Zyteron",placeholder:"12.345.678-9",help:"RUT de la persona natural que firmará."},
  {key:"empresa.personeria",label:"Facultad para representar a Zyteron",placeholder:"Ej.: escritura pública de fecha…, otorgada en la Notaría…",help:"Documento o antecedente donde constan sus poderes."},
] as const;

export const missingEssentialContractFields=(values:ContractValues)=>essentialContractFields.filter(field=>!clean(contractValue(values,field.key))).map(field=>`Completa ${field.label.toLowerCase()}.`);

const labels:Record<string,string>={
  "bloque.firmas_partes":"Bloque de firmas de ambas partes",
  "calendario.condicion_produccion":"Condición para publicar en producción",
  "calendario.correcciones":"Proceso de correcciones",
  "calendario.inicio":"Inicio del proyecto",
  "calendario.revision":"Plazo de revisión del cliente",
  "cliente.email_dte":"Correo para documentos tributarios",
  "contrato.domicilio_convencional_o_regimen_legal":"Domicilio y jurisdicción aplicable",
  "datos.encargo_aplica_y_anexo":"Tratamiento de datos personales",
  "firma.modalidad":"Modalidad de firma",
  "firma.modalidad_y_referencia":"Modalidad y evidencia de firma",
  "garantia.condiciones":"Garantía y cobertura",
  "pagos.medios":"Forma y condiciones de pago",
  "pi.alcance_licencia":"Alcance de la licencia",
  "pi.alcance_suscripcion":"Alcance de la suscripción",
  "pi.componentes_y_licencias":"Componentes y licencias de terceros",
  "pi.derechos_transferidos":"Derechos que se transfieren",
  "pi.entrega_codigo":"Entrega de código y documentación",
  "pi.formalizacion":"Formalización de propiedad intelectual",
  "pi.inventario":"Inventario del desarrollo",
  "pi.plataforma":"Plataforma contratada",
  "proyecto.exclusiones":"Exclusiones del alcance",
  "proyecto.integraciones_y_requisitos":"Integraciones y requisitos conocidos",
  "proyecto.objetivo":"Objetivo del proyecto",
  "proyecto.situacion_inicial":"Situación inicial",
  "recurrentes.resumen_o_no_contratados":"Servicios recurrentes",
  "responsabilidad.pacto_expreso_o_regimen_legal":"Responsabilidad aplicable",
  "salida.liquidacion":"Liquidación al término",
  "salida.preaviso":"Aviso de término anticipado",
  "salida.transicion":"Transición y entrega de activos",
  "seguridad.compromisos":"Compromisos de seguridad",
  "tabla.activos":"Dominios, repositorios y cuentas",
  "tabla.aportes_cliente":"Aportes requeridos al cliente",
  "tabla.entregables":"Entregables y aceptación",
  "tabla.hitos":"Hitos y calendario",
  "tabla.notificaciones":"Canales de notificación",
  "tabla.pagos":"Hitos y calendario de pago",
  "tabla.responsables":"Responsables del proyecto",
};

export function friendlyContractLabel(key:string){
  if(labels[key])return labels[key];
  const value=key.split(".").pop()?.replaceAll("_"," ")??key;
  return value.charAt(0).toUpperCase()+value.slice(1);
}

const genericDefault=(key:string,context:ContractDefaultContext)=>{
  const projectName=clean(context.project?.name)||"el proyecto contratado";
  const quoteNumber=clean(context.quote?.quote_number)||"la cotización aceptada";
  if(key.startsWith("tabla."))return `Según el alcance, hitos y condiciones de ${quoteNumber}.`;
  if(key.startsWith("nda."))return `Aplicable únicamente al intercambio de información necesario para ${projectName}, sujeto a revisión legal.`;
  if(key.startsWith("recurrentes."))return "No se contratan servicios recurrentes distintos de los expresamente indicados en la cotización aceptada.";
  if(key.startsWith("datos."))return "No aplica salvo que exista un encargo de tratamiento de datos expresamente documentado.";
  if(key.startsWith("cambio."))return "Sin cambio respecto del contrato original; completar antes de emitir una orden de cambio.";
  if(key.startsWith("salida."))return "Según las obligaciones del contrato, los activos del cliente y la legislación aplicable.";
  if(key.startsWith("inactividad."))return "Mediante aviso verificable, plazo razonable de subsanación y reprogramación de las actividades efectivamente afectadas.";
  return `Según ${quoteNumber}, el alcance del proyecto y la revisión legal previa a la firma.`;
};

function defaultFor(key:string,context:ContractDefaultContext):unknown{
  const client=context.client??{},company=context.company??{},project=context.project??{},quote=context.quote??{},contact=context.contact??{};
  const projectName=clean(project.name)||"el proyecto contratado",scope=clean(project.scope)||`Ejecución de ${projectName}`;
  const quoteNumber=clean(quote.quote_number)||"la cotización aceptada",paymentTerms=clean(quote.payment_terms)||"Transferencia bancaria según los hitos de la cotización aceptada.";
  const exact:Record<string,unknown>={
    "cliente.razon_social":clean(client.legal_name)||clean(client.trade_name),
    "cliente.rut":clean(client.rut),
    "cliente.domicilio":[client.address,client.commune,client.region].map(clean).filter(Boolean).join(", "),
    "cliente.email_dte":clean(client.dte_email)||clean(contact.email),
    "cliente.representante_nombre":clean(contact.name),
    "cliente.representante_cargo":clean(contact.position),
    "empresa.razon_social":clean(company.company_legal_name)||"Zyteron SpA",
    "empresa.rut":clean(company.company_rut)||"78.398.774-0",
    "empresa.domicilio":[company.company_address,company.company_commune,company.company_city].map(clean).filter(Boolean).join(", ")||"Santiago, Chile",
    "empresa.representante_cargo":"Gerente General",
    "contrato.fecha":context.today,
    "contrato.lugar":clean(company.company_city)||"Santiago, Chile",
    "contrato.domicilio_convencional_o_regimen_legal":"Se aplicará el domicilio y competencia que correspondan conforme a la legislación chilena.",
    "proyecto.codigo":clean(project.project_number),
    "proyecto.nombre":projectName,
    "proyecto.alcance":scope,
    "proyecto.objetivo":scope,
    "proyecto.situacion_inicial":`Proyecto originado en ${quoteNumber}; no se reconoce trabajo adicional fuera del alcance aceptado.`,
    "proyecto.exclusiones":"Se excluyen las prestaciones que no estén descritas en la cotización aceptada o en el alcance del proyecto.",
    "proyecto.integraciones_y_requisitos":"Según el alcance del proyecto y los antecedentes técnicos validados por ambas partes.",
    "cotizacion.numero":clean(quote.quote_number),
    "cotizacion.version":clean(quote.version),
    "cotizacion.fecha_aceptacion":clean(quote.accepted_at).slice(0,10),
    "ot.identificacion_o_no_aplica":clean(project.work_order_number)||"OT vinculada al proyecto en Zyteron Control.",
    "calendario.inicio":clean(project.planned_start_date)||"Al cumplirse el anticipo, accesos e insumos definidos en la cotización aceptada.",
    "calendario.revision":"5 días hábiles desde la comunicación verificable de cada entrega.",
    "calendario.correcciones":"Las observaciones se consolidarán por escrito y se resolverán según el alcance aceptado.",
    "calendario.condicion_produccion":"Aprobación expresa del cliente y cumplimiento de los hitos técnicos previos.",
    "precio.moneda":context.currency,
    "precio.neto":money(context.subtotal,context.currency),
    "precio.impuestos":money(context.tax,context.currency),
    "precio.total":money(context.total,context.currency),
    "precio.conversion_o_no_aplica":context.currency==="CLP"?"No aplica conversión; valores expresados en pesos chilenos.":"La conversión se realizará con la fuente y fecha expresamente indicadas en la cotización aceptada.",
    "pagos.medios":paymentTerms,
    "tabla.pagos":paymentTerms,
    "garantia.condiciones":"Cobertura de defectos reproducibles imputables al trabajo de Zyteron, conforme al alcance y plazo indicados en la cotización aceptada.",
    "firma.modalidad":"Firma electrónica conforme a la Ley N.º 19.799, con evidencia verificable y copia íntegra para cada parte.",
    "firma.modalidad_y_referencia":"Firma electrónica conforme a la Ley N.º 19.799 mediante el proveedor configurado en Zyteron Control.",
    "bloque.firmas_partes":"Bloque de firma electrónica de los representantes individualizados, con fecha, identidad y evidencia verificables.",
    "pi.inventario":scope,
    "pi.alcance_licencia":"Uso del desarrollo identificado por el cliente, incluyendo operación, respaldo y mantenimiento autorizado.",
    "pi.entrega_codigo":"Según los entregables expresamente incluidos en la cotización aceptada.",
    "pi.componentes_y_licencias":"Se conservarán las licencias de terceros y los componentes preexistentes identificados durante la revisión técnica.",
    "pi.derechos_transferidos":"Únicamente los componentes individualizados y formalizados expresamente por ambas partes.",
    "pi.formalizacion":"Sujeta a revisión legal y a las formalidades exigibles para la transferencia acordada.",
    "pi.plataforma":projectName,
    "pi.alcance_suscripcion":"Durante la vigencia, para los usuarios, capacidades y finalidades descritos en la cotización aceptada.",
    "recurrentes.resumen_o_no_contratados":"No se contratan servicios recurrentes distintos de los expresamente indicados en la cotización aceptada.",
    "datos.encargo_aplica_y_anexo":"No aplica salvo que se seleccione y complete el anexo de tratamiento de datos.",
    "nda.identificacion_o_no_aplica":"Obligación bilateral de confidencialidad del contrato; anexo específico sólo si fue seleccionado.",
    "seguridad.compromisos":"Acceso mínimo necesario, protección de credenciales, trazabilidad de cambios y medidas proporcionales al alcance contratado.",
    "responsabilidad.pacto_expreso_o_regimen_legal":"Se aplicará el régimen legal chileno, sin limitaciones respecto de responsabilidades irrenunciables.",
  };
  return exact[key]??genericDefault(key,context);
}

const humanFacts=new Set(["cliente.representante_rut","cliente.personeria","empresa.representante_nombre","empresa.representante_rut","empresa.personeria"]);
const canonicalKeys=new Set([
  "cliente.razon_social","cliente.rut","cliente.domicilio","cliente.email_dte",
  "empresa.razon_social","empresa.rut","empresa.domicilio",
  "contrato.fecha","contrato.lugar","proyecto.codigo","proyecto.nombre","proyecto.alcance","proyecto.objetivo","proyecto.situacion_inicial","proyecto.exclusiones","proyecto.integraciones_y_requisitos",
  "cotizacion.numero","cotizacion.version","cotizacion.fecha_aceptacion","ot.identificacion_o_no_aplica",
  "calendario.inicio","pagos.medios","tabla.pagos","precio.moneda","precio.neto","precio.impuestos","precio.total","precio.conversion_o_no_aplica","pi.inventario","pi.plataforma",
]);

export function applyContractDefaults(values:ContractValues,variables:ContractTemplateVariable[],context:ContractDefaultContext){
  let next=values,changed=false;
  for(const variable of variables){
    const current=contractValue(next,variable.key),canonical=canonicalKeys.has(variable.key)||variable.key.startsWith("tabla.");
    if(variable.key==="contrato.numero"||humanFacts.has(variable.key)||(!canonical&&clean(current)))continue;
    const value=defaultFor(variable.key,context);if(value===null||value===undefined||value==="")continue;
    if(canonical&&String(current??"")===String(value))continue;
    next=withContractValue(next,variable.key,value);changed=true;
  }
  return changed?next:values;
}

export const resolvedContractVariables=(values:ContractValues,variables:ContractTemplateVariable[])=>variables.filter(variable=>variable.key==="contrato.numero"||clean(contractValue(values,variable.key))).length;

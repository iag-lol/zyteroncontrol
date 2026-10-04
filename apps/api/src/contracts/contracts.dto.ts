import { BadRequestException } from "@nestjs/common";
import { billingFrequencies, contractStatuses, type BillingFrequency, type ClientContract, type ContractStatus } from "@zyteron/contracts";

const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type ContractInput = Pick<ClientContract,"clientId"|"name"|"description"|"contractType"|"startDate"|"endDate"|"renewalType"|"renewalNoticeDays"|"billingFrequency"|"currency"|"subtotal"|"tax"|"total"|"responsibleUserId"|"portalVisible"> & { status?:ContractStatus;projectId?:string|null;quoteId?:string|null;quoteVersionId?:string|null;independentReason?:string|null;templateCodes?:string[];builderValues?:Record<string,unknown>;sourceSnapshot?:Record<string,unknown> };
export function validateContract(input:ContractInput):ContractInput {
  const errors:string[]=[];
  if(!uuidPattern.test(input.clientId??""))errors.push("Selecciona un cliente válido.");
  if(!input.name?.trim())errors.push("El nombre del contrato es obligatorio.");
  if(!input.contractType?.trim())errors.push("El tipo de contrato es obligatorio.");
  if(input.startDate&&input.endDate&&input.endDate<input.startDate)errors.push("La fecha de término no puede ser anterior al inicio.");
  if([input.subtotal,input.tax,input.total].some((value)=>Number(value)<0))errors.push("Los montos no pueden ser negativos.");
  if(input.status&&!contractStatuses.includes(input.status))errors.push("El estado contractual no es válido.");
  if(input.billingFrequency&&!billingFrequencies.includes(input.billingFrequency as BillingFrequency))errors.push("La frecuencia de facturación no es válida.");
  if(input.responsibleUserId&&!uuidPattern.test(input.responsibleUserId))errors.push("El responsable debe seleccionarse desde Usuarios.");
  if(input.projectId&&!uuidPattern.test(input.projectId))errors.push("Selecciona un proyecto válido.");
  if(input.quoteId&&!uuidPattern.test(input.quoteId))errors.push("Selecciona una cotización válida.");
  if(input.quoteVersionId&&!uuidPattern.test(input.quoteVersionId))errors.push("Selecciona una versión de cotización válida.");
  if(input.templateCodes?.length&&!input.quoteId&&!input.independentReason?.trim())errors.push("Asocia una cotización aceptada o justifica el contrato independiente.");
  if(input.templateCodes&&!input.templateCodes.includes("ZT-PROYECTO-CL"))errors.push("El contrato base ZT-PROYECTO-CL es obligatorio.");
  if(Math.abs(Number(input.subtotal||0)+Number(input.tax||0)-Number(input.total||0))>0.01)errors.push("Subtotal, impuestos y total no son consistentes.");
  if(errors.length)throw new BadRequestException({message:"Revisa los datos del contrato.",errors});
  return {...input,name:input.name.trim(),description:input.description?.trim()||null,contractType:input.contractType.trim(),currency:input.currency||"CLP",subtotal:Number(input.subtotal||0),tax:Number(input.tax||0),total:Number(input.total||0),renewalNoticeDays:Number(input.renewalNoticeDays??30),responsibleUserId:input.responsibleUserId||null,projectId:input.projectId||null,quoteId:input.quoteId||null,quoteVersionId:input.quoteVersionId||null,independentReason:input.independentReason?.trim()||null,templateCodes:input.templateCodes??[],builderValues:input.builderValues??{},sourceSnapshot:input.sourceSnapshot??{},status:input.status??"DRAFT"};
}

import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

export abstract class LaborAuthorityProvider {
  abstract readonly status:string;
  abstract validateRequiredFields(input:Record<string,unknown>):Promise<{valid:boolean;missing:string[]}>;
  abstract prepareContractRegistration(input:Record<string,unknown>):Promise<{status:string;checklist:string[];officialUrl:string|null}>;
  abstract getRegistrationStatus(reference:string):Promise<{status:string;reference:string}>;
}
@Injectable() export class ExternalLaborAuthorityProvider implements LaborAuthorityProvider {
  readonly status="EXTERNAL_MANUAL_WITH_EVIDENCE";
  async validateRequiredFields(input:Record<string,unknown>){const required=["employeeId","contractId","startDate"],missing=required.filter(key=>!input[key]);return{valid:missing.length===0,missing};}
  async prepareContractRegistration(){return{status:"PENDING_EXTERNAL_REGISTRATION",checklist:["Validar datos del contrato","Realizar el trámite en el mecanismo oficial habilitado","Adjuntar comprobante y referencia oficial"],officialUrl:"https://midt.dirtrab.cl"};}
  async getRegistrationStatus(reference:string){return{status:"REQUIRES_MANUAL_EVIDENCE",reference};}
}

export abstract class AttendanceProvider { abstract readonly status:string;abstract getMarks(employeeId:string,from:string,to:string):Promise<unknown[]>;abstract getDailyAttendance(employeeId:string,date:string):Promise<unknown|null>;abstract getExceptions(from:string,to:string):Promise<unknown[]>;abstract sync():Promise<{status:string}>; }
@Injectable() export class DeferredAttendanceProvider implements AttendanceProvider { readonly status="NOT_CONFIGURED";async getMarks(){return[];}async getDailyAttendance(){return null;}async getExceptions(){return[];}async sync(){return{status:this.status};} }

export abstract class PayrollSubmissionProvider { abstract readonly status:string;abstract prepare(input:Record<string,unknown>):Promise<{status:string;instructions:string[]}>; }
@Injectable() export class DeferredPayrollSubmissionProvider implements PayrollSubmissionProvider { readonly status="EXTERNAL_EXPORT_ONLY";async prepare(){return{status:this.status,instructions:["Descargar archivo validado","Presentar mediante proveedor o portal autorizado","Registrar comprobante en Documents"]};} }

export interface PayrollRuleInput{baseSalary:number;earnings?:number;deductions?:number;employerContributions?:number;currency?:string;}
@Injectable() export class PayrollRuleEngine {
  calculate(input:PayrollRuleInput,ruleSnapshot:Record<string,unknown>){const base=Number(input.baseSalary||0),earnings=Number(input.earnings||0),deductions=Number(input.deductions||0),employer=Number(input.employerContributions||0),gross=base+earnings;if([base,earnings,deductions,employer].some(value=>!Number.isFinite(value)||value<0))throw new Error("Valores de remuneración inválidos.");return{grossTotal:gross,deductionTotal:deductions,employerContributionTotal:employer,taxableTotal:gross,netTotal:gross-deductions,employerCost:gross+employer,currency:input.currency||"CLP",ruleSnapshot};}
}

@Injectable() export class LeavePolicyEngine {
  requestedUnits(startDate:string,endDate:string){const start=new Date(`${startDate}T12:00:00Z`),end=new Date(`${endDate}T12:00:00Z`);if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start)throw new Error("Rango de ausencia inválido.");return Math.floor((end.getTime()-start.getTime())/86400000)+1;}
}

@Injectable() export class HrDocumentRenderer {
  pdf(title:string,lines:string[],filename:string){const safe=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[()\\]/g," ").replace(/[^\x20-\x7E]/g,"?").slice(0,110),content=["BT","/F1 11 Tf","52 790 Td",`(${safe(title)}) Tj`,...lines.slice(0,32).flatMap(line=>["0 -20 Td",`(${safe(line)}) Tj`]),"ET"].join("\n"),objects=["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj","2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj","3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",`4 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"];let pdf="%PDF-1.4\n";const offsets=[0];for(const object of objects){offsets.push(Buffer.byteLength(pdf));pdf+=`${object}\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,"0")+" 00000 n ").join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;const bytes=Buffer.from(pdf);return{bytes,sha256:createHash("sha256").update(bytes).digest("hex"),filename};}
}

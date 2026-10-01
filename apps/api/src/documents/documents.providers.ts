import { Injectable } from "@nestjs/common";

export interface FileScanResult { status:"CLEAN"|"SUSPICIOUS"|"INFECTED"|"SCAN_FAILED"|"NOT_CONFIGURED"; provider:string; details:string|null; }
export abstract class FileSecurityScanner { abstract scan(input:{bytes:Buffer;filename:string;mimeType:string;sha256:string}):Promise<FileScanResult>; }
@Injectable() export class DeferredFileSecurityScanner implements FileSecurityScanner { async scan(){return{status:"NOT_CONFIGURED" as const,provider:"NOT_CONFIGURED",details:"Antivirus no configurado; el archivo no se declara limpio."};} }

export abstract class DocumentTextExtractor { abstract readonly status:string; abstract extract(input:{bytes:Buffer;mimeType:string}):Promise<string|null>; }
@Injectable() export class DeferredTextExtractor implements DocumentTextExtractor { readonly status="NOT_CONFIGURED";async extract(){return null;} }
export abstract class DocumentOcrProvider { abstract readonly status:string; }
@Injectable() export class DeferredOcrProvider implements DocumentOcrProvider { readonly status="NOT_CONFIGURED"; }
export abstract class DocumentRenderingService { abstract readonly status:string; abstract preview(bodyHtml:string,variables:Record<string,unknown>):Promise<{html:string;watermark:string}>; }
@Injectable() export class SafePreviewRenderer implements DocumentRenderingService { readonly status="PREVIEW_ONLY";async preview(bodyHtml:string,variables:Record<string,unknown>){const escaped=Object.fromEntries(Object.entries(variables).map(([key,value])=>[key,String(value??"").replace(/[<>&"']/g,char=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;"}[char]!))]));let html=bodyHtml;for(const[key,value]of Object.entries(escaped))html=html.replaceAll(`{{${key}}}`,value);return{html,watermark:"PREVIEW — NO ES UN DOCUMENTO EMITIDO"};} }
export interface SignatureProviderInput { documentId:string;versionId:string;sha256:string;signers:Array<{name:string;email:string;order:number}>;callbackUrl:string|null; }
export abstract class EnterpriseSignatureProvider { abstract readonly name:string;abstract readonly configured:boolean;abstract create(input:SignatureProviderInput):Promise<{providerRequestId:string;status:string}>;abstract status(providerRequestId:string):Promise<{status:string;evidence:Record<string,unknown>}>;abstract cancel(providerRequestId:string):Promise<void>;abstract verifyWebhook(headers:Record<string,string|undefined>,rawBody:string):boolean; }
@Injectable() export class DeferredSignatureProvider implements EnterpriseSignatureProvider { readonly name="NOT_CONFIGURED";readonly configured=false;async create():Promise<never>{throw new Error("Proveedor de firma electrónica no configurado.");}async status(){return{status:"NOT_CONFIGURED",evidence:{}};}async cancel(){return;}verifyWebhook(){return false;} }

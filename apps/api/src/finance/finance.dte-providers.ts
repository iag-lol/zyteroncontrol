import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { createHash, createPrivateKey, createPublicKey, createSign, X509Certificate, type KeyObject } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join,resolve } from "node:path";
import type { DteRequirement } from "@zyteron/contracts";
import { validateXML } from "xmllint-wasm";
import { child, descendants, local, parseXml, path, textOf, type XmlNode } from "./finance.formats.js";
import { formatRut, normalizeRut, type Row, validRut } from "./finance.util.js";

export const SII_NS="http://www.sii.cl/SiiDte",DSIG_NS="http://www.w3.org/2000/09/xmldsig#",XSI_NS="http://www.w3.org/2001/XMLSchema-instance";
export const siiHost=(environment:string)=>environment==="PRODUCTION"?"palena.sii.cl":"maullin.sii.cl";
/** SOAP 1.1 RPC/encoded compatible con los WSDL oficiales de CrSeed, GetTokenFromSeed y QueryEstUp. */
export function siiSoapEnvelope(environment:string,service:string,method:string,params:Record<string,string>){const namespace=`https://${siiHost(environment)}/DTEWS/${service}.jws`;return`<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soapenv:Body><m:${method} xmlns:m="${namespace}">${Object.entries(params).map(([key,value])=>`<${key} xsi:type="xsd:string">${c14nText(value)}</${key}>`).join("")}</m:${method}></soapenv:Body></soapenv:Envelope>`;}

// =========================================================================================== Contrato del proveedor
export interface DteCompany { rut:string; legalName:string; businessActivity:string; activityCode:number; address:string; commune:string; city:string|null; resolutionNumber:number; resolutionDate:string; }
export interface DteLine { lineNumber:number; description:string; quantity:number; unitPrice:number; discountAmount:number; netAmount:number; isExempt:boolean; }
export interface DteReference { documentTypeCode:number; folio:number; date:string; code:number; reason:string; }
export interface DteDocumentInput { taxDocumentId:string; documentTypeCode:number; folio:number; issueDate:string; dueDate:string|null; environment:"CERTIFICATION"|"PRODUCTION"; company:DteCompany; receiver:{rut:string;legalName:string;businessActivity:string|null;address:string|null;commune:string|null;city:string|null;email:string|null}; lines:DteLine[]; totals:{net:number;exempt:number;taxRate:number|null;tax:number;total:number}; reference:DteReference|null; caf:CafData|null; }
export interface DteStatus { status:"SUBMITTED"|"RECEIVED_BY_SII"|"ACCEPTED"|"ACCEPTED_WITH_REPAIRS"|"REJECTED"; code:string|null; message:string; detail:Row; }
export interface DteIssueResult { folio?:number|null; unsignedXml:string|null; signedXml:string|null; envelopeXml:string|null; trackId:string|null; submissionId:string|null; status:DteStatus["status"]; message:string; pdf:Buffer|null; }
/** Interfaz común (spec): SII directo y proveedor certificado externo. Ninguno simula respuestas del SII. */
export abstract class TaxDocumentProvider {
  abstract readonly name:"SII_DIRECT"|"EXTERNAL";
  abstract requirements(environment:string,documentTypeCode:number):Promise<DteRequirement[]>;
  abstract createDraft(input:DteDocumentInput):Promise<string>;
  abstract validate(xml:string,input:DteDocumentInput):Promise<string[]>;
  abstract sign(xml:string,input:DteDocumentInput):Promise<string>;
  abstract send(signed:string,input:DteDocumentInput):Promise<{trackId:string;envelopeXml:string|null}>;
  abstract issue(input:DteDocumentInput):Promise<DteIssueResult>;
  issueCreditNote(input:DteDocumentInput){if(input.documentTypeCode!==61||!input.reference)throw new UnprocessableEntityException("La nota de crédito requiere referencia.");return this.issue(input);}
  issueDebitNote(input:DteDocumentInput){if(input.documentTypeCode!==56||!input.reference)throw new UnprocessableEntityException("La nota de débito requiere referencia.");return this.issue(input);}
  abstract getSubmissionStatus(trackId:string,environment:string,companyRut:string):Promise<DteStatus>;
  abstract getDocumentStatus(document:Row,companyRut:string):Promise<DteStatus>;
  abstract downloadXml(document:Row):Promise<Buffer|null>;
  abstract downloadPdf(document:Row):Promise<Buffer|null>;
  /** En Chile un DTE aceptado no se "anula": se corrige con nota de crédito o débito referenciada. */
  async cancelOrCorrect():Promise<never>{throw new UnprocessableEntityException("Un DTE emitido no se anula: emite una nota de crédito (código 1 anula, 3 corrige montos) o de débito.");}
  abstract syncReceivedDocuments(since:string):Promise<Array<{xml:string;source:string}>>;
}

// =========================================================================================== Certificado digital (sólo servidor)
export interface LoadedCertificate { key:KeyObject; certificate:X509Certificate; certificateBase64:string; modulus:string; exponent:string; }
/** El PEM (llave privada + certificado) vive en un secreto del servidor (variable de entorno referenciada por secret_ref).
 * Nunca se recibe por API, ni se guarda en la base, Git, logs o frontend. */
@Injectable()
export class DteCertificateProvider {
  available(secretRef:string){return Boolean(process.env[secretRef]?.includes("PRIVATE KEY"));}
  load(secretRef:string):LoadedCertificate{
    const bundle=process.env[secretRef];if(!bundle)throw new ServiceUnavailableException(`El secreto ${secretRef} no está configurado en el servidor.`);
    const keyPem=/-----BEGIN (?:RSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |ENCRYPTED )?PRIVATE KEY-----/.exec(bundle)?.[0];const certPem=/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.exec(bundle)?.[0];
    if(!keyPem||!certPem)throw new ServiceUnavailableException(`El secreto ${secretRef} debe contener la llave privada y el certificado en PEM.`);
    const key=createPrivateKey({key:keyPem,passphrase:process.env[`${secretRef}_PASSPHRASE`]});const certificate=new X509Certificate(certPem);
    if(!certificate.checkPrivateKey(key))throw new ServiceUnavailableException("La llave privada no corresponde al certificado.");
    const jwk=createPublicKey(key).export({format:"jwk"}) as {n:string;e:string};
    return{key,certificate,certificateBase64:certificate.raw.toString("base64"),modulus:Buffer.from(jwk.n,"base64url").toString("base64"),exponent:Buffer.from(jwk.e,"base64url").toString("base64")};
  }
  metadata(secretRef:string){const{certificate}=this.load(secretRef);return{subject:certificate.subject.replace(/\n/g,", "),issuer:certificate.issuer.replace(/\n/g,", "),serialNumber:certificate.serialNumber,validFrom:new Date(certificate.validFrom).toISOString(),expiresAt:new Date(certificate.validTo).toISOString(),fingerprintSha256:certificate.fingerprint256.replace(/:/g,"").toLowerCase()};}
}

// =========================================================================================== CAF (Código de Autorización de Folios)
export interface CafData { documentTypeCode:number; rangeFrom:number; rangeTo:number; authorizedAt:string; companyRut:string; companyName:string; cafXml:string; privateKeyPem:string; }
export function parseCaf(xml:string):CafData{
  const root=parseXml(xml);if(local(root.name)!=="AUTORIZACION")throw new UnprocessableEntityException("El archivo no es un CAF del SII (AUTORIZACION).");
  const caf=child(root,"CAF");const da=child(caf,"DA");const privateKeyPem=textOf(root,"RSASK");if(!caf||!da||!privateKeyPem.includes("PRIVATE KEY"))throw new UnprocessableEntityException("CAF incompleto: falta DA o la llave RSASK.");
  const start=xml.indexOf("<CAF"),end=xml.indexOf("</CAF>");if(start<0||end<0)throw new UnprocessableEntityException("CAF sin bloque <CAF>.");
  const rangeFrom=Number(textOf(da,"RNG","D")),rangeTo=Number(textOf(da,"RNG","H"));if(!(rangeFrom>0&&rangeTo>=rangeFrom))throw new UnprocessableEntityException("Rango de folios inválido en el CAF.");
  createPrivateKey(privateKeyPem);
  return{documentTypeCode:Number(textOf(da,"TD")),rangeFrom,rangeTo,authorizedAt:textOf(da,"FA"),companyRut:formatRut(textOf(da,"RE")),companyName:textOf(da,"RS"),cafXml:xml.slice(start,end+6).replace(/>\s+</g,"><"),privateKeyPem};
}

// =========================================================================================== XML canónico (C14N inclusivo) para lo que generamos
const c14nText=(value:unknown)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\r/g,"&#xD;");
const c14nAttr=(value:unknown)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;").replace(/\t/g,"&#x9;").replace(/\n/g,"&#xA;").replace(/\r/g,"&#xD;");
/** Elemento en forma canónica: sin autocierre, atributos ordenados y texto escapado según C14N. */
export function el(name:string,content:string|number|null|undefined|Array<string>,attrs:Record<string,string|number>={}):string{const attrText=Object.keys(attrs).sort().map((key)=>` ${key}="${c14nAttr(attrs[key])}"`).join("");const body=Array.isArray(content)?content.join(""):c14nText(content);return`<${name}${attrText}>${body}</${name}>`;}
const opt=(name:string,value:unknown)=>value===null||value===undefined||value===""?"":el(name,String(value));
const clip=(value:unknown,max:number)=>String(value??"").replace(/\s+/g," ").trim().slice(0,max);
const siiRut=(value:string)=>formatRut(value).replace(/^0+/,"");
const timestamp=()=>new Date().toLocaleString("sv-SE",{timeZone:"America/Santiago"}).replace(" ","T");
const sha1=(value:string)=>createHash("sha1").update(value,"utf8").digest("base64");
/** Firma XMLDSig RSA-SHA1 (estándar exigido por el SII) sobre el elemento con `ID`, con los namespaces en alcance declarados. */
export function xmlSignature(canonicalTarget:string,referenceUri:string,certificate:LoadedCertificate,inScope:string,transformsEnveloped=false){
  const digest=sha1(canonicalTarget);
  const signedInfoBody=`<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="${referenceUri}">${transformsEnveloped?`<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform></Transforms>`:""}<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digest}</DigestValue></Reference>`;
  const canonicalSignedInfo=`<SignedInfo xmlns="${DSIG_NS}"${inScope}>${signedInfoBody}</SignedInfo>`;
  const value=createSign("RSA-SHA1").update(canonicalSignedInfo,"utf8").sign(certificate.key,"base64");
  return`<Signature xmlns="${DSIG_NS}"><SignedInfo>${signedInfoBody}</SignedInfo><SignatureValue>${value}</SignatureValue><KeyInfo><KeyValue><RSAKeyValue><Modulus>${certificate.modulus}</Modulus><Exponent>${certificate.exponent}</Exponent></RSAKeyValue></KeyValue><X509Data><X509Certificate>${certificate.certificateBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;
}

// =========================================================================================== Validación estructural y XSD oficial
export function structuralErrors(input:DteDocumentInput):string[]{
  const errors:string[]=[];const need=(ok:unknown,message:string)=>{if(!ok)errors.push(message);};
  need(validRut(input.company.rut),"RUT emisor inválido.");need(input.company.legalName,"Razón social emisor obligatoria.");need(input.company.businessActivity,"Giro emisor obligatorio.");need(input.company.activityCode,"Código de actividad económica (Acteco) obligatorio.");need(input.company.address&&input.company.commune,"Dirección y comuna de origen obligatorias.");
  need(validRut(input.receiver.rut),"RUT receptor inválido.");need(input.receiver.legalName,"Razón social receptor obligatoria.");if([33,56,61].includes(input.documentTypeCode)){need(input.receiver.businessActivity,"Giro del receptor obligatorio.");need(input.receiver.address&&input.receiver.commune,"Dirección y comuna del receptor obligatorias.");}
  need(input.lines.length>0&&input.lines.length<=60,"El detalle debe tener entre 1 y 60 líneas.");need(input.folio>0,"Folio no asignado.");
  if(input.caf){need(input.caf.documentTypeCode===input.documentTypeCode,"El CAF no corresponde al tipo de documento.");need(input.folio>=input.caf.rangeFrom&&input.folio<=input.caf.rangeTo,"El folio está fuera del rango autorizado por el CAF.");need(normalizeRut(input.caf.companyRut)===normalizeRut(input.company.rut),"El CAF pertenece a otro RUT emisor.");}
  const net=input.lines.filter((l)=>!l.isExempt).reduce((t,l)=>t+l.netAmount,0),exempt=input.lines.filter((l)=>l.isExempt).reduce((t,l)=>t+l.netAmount,0);
  need(Math.round(net)===Math.round(input.totals.net)&&Math.round(exempt)===Math.round(input.totals.exempt),"Los totales no cuadran con el detalle.");need(Math.round(input.totals.net+input.totals.exempt+input.totals.tax)===Math.round(input.totals.total),"MntTotal ≠ MntNeto + MntExe + IVA.");
  if([56,61].includes(input.documentTypeCode))need(input.reference,"Las notas requieren referencia al documento original.");
  return errors;
}
/** Validación offline contra los cuatro XSD oficiales publicados por el SII, mediante libxml2/WASM. */
@Injectable()
export class DteSchemaValidator {
  directory(){const configured=process.env.DTE_XSD_DIR?.trim();if(configured)return configured;for(const candidate of [resolve(process.cwd(),"apps/api/resources/sii/xsd"),resolve(process.cwd(),"resources/sii/xsd")])if(existsSync(join(candidate,"EnvioDTE_v10.xsd")))return candidate;return null;}
  available(){const dir=this.directory();return Boolean(dir&&["EnvioDTE_v10.xsd","DTE_v10.xsd","SiiTypes_v10.xsd","xmldsignature_v10.xsd"].every((file)=>existsSync(join(dir,file))));}
  async validate(xml:string,schema="EnvioDTE_v10.xsd"):Promise<string[]>{
    const dir=this.directory();if(!dir||!this.available())return["Los cuatro esquemas XSD oficiales del SII no están disponibles en el servidor."];
    const allowed=new Set(["EnvioDTE_v10.xsd","DTE_v10.xsd"]);if(!allowed.has(schema))return["Esquema DTE no permitido."];
    try{const main=await readFile(join(dir,schema)),dependencies=await Promise.all(["DTE_v10.xsd","SiiTypes_v10.xsd","xmldsignature_v10.xsd"].filter((file)=>file!==schema).map(async(file)=>({fileName:file,contents:await readFile(join(dir,file))})));const result=await validateXML({xml:{fileName:"envio.xml",contents:Buffer.from(xml,"latin1")},schema:[{fileName:schema,contents:main}],preload:dependencies,maxMemoryPages:1024});return result.valid?[]:result.errors.map((error)=>error.message).filter(Boolean).slice(0,20);}
    catch(error){return[String((error as Error).message||error).slice(0,1000)];}
  }
}

// =========================================================================================== Proveedor: integración directa con servicios oficiales del SII
@Injectable()
export class SiiDirectDteProvider extends TaxDocumentProvider {
  readonly name="SII_DIRECT" as const;
  private token:{value:string;environment:string;expires:number}|null=null;
  constructor(private readonly certificates:DteCertificateProvider,private readonly schema:DteSchemaValidator){super();}
  secretRef(){return process.env.DTE_CERTIFICATE_SECRET_REF?.trim()||"DTE_CERTIFICATE_PEM";}
  async requirements():Promise<DteRequirement[]>{
    const ref=this.secretRef();let certificate:DteRequirement;try{const meta=this.certificates.metadata(ref);const days=Math.floor((Date.parse(meta.expiresAt)-Date.now())/86400000);certificate={key:"certificate_secret",label:"Certificado digital en secreto del servidor",satisfied:days>0,detail:days>0?`Vigente, vence en ${days} días.`:"Certificado vencido."};}
    catch(error){certificate={key:"certificate_secret",label:"Certificado digital en secreto del servidor",satisfied:false,detail:(error as Error).message};}
    return[certificate,{key:"xsd",label:"Validación XSD oficial (libxml2/WASM + esquemas SII)",satisfied:this.schema.available(),detail:this.schema.available()?"Los cuatro esquemas oficiales están disponibles y la validación no depende del sistema operativo.":"Incluye los XSD oficiales o configura DTE_XSD_DIR."}];
  }
  async createDraft(input:DteDocumentInput){
    if(!input.caf)throw new UnprocessableEntityException("Falta el CAF para timbrar el documento.");const id=`F${input.folio}T${input.documentTypeCode}`;const first=input.lines[0]!;
    const idDoc=[el("TipoDTE",input.documentTypeCode),el("Folio",input.folio),el("FchEmis",input.issueDate),...(input.dueDate&&[33,34,56].includes(input.documentTypeCode)?[el("FmaPago",input.dueDate>input.issueDate?2:1),el("FchVenc",input.dueDate)]:[])];
    const emisor=[el("RUTEmisor",siiRut(input.company.rut)),el("RznSoc",clip(input.company.legalName,100)),el("GiroEmis",clip(input.company.businessActivity,80)),el("Acteco",input.company.activityCode),el("DirOrigen",clip(input.company.address,70)),el("CmnaOrigen",clip(input.company.commune,20)),opt("CiudadOrigen",clip(input.company.city,20))];
    const receptor=[el("RUTRecep",siiRut(input.receiver.rut)),el("RznSocRecep",clip(input.receiver.legalName,100)),opt("GiroRecep",clip(input.receiver.businessActivity,40)),opt("DirRecep",clip(input.receiver.address,70)),opt("CmnaRecep",clip(input.receiver.commune,20)),opt("CiudadRecep",clip(input.receiver.city,20))];
    const totales=[...(input.totals.net>0?[el("MntNeto",Math.round(input.totals.net))]:[]),...(input.totals.exempt>0?[el("MntExe",Math.round(input.totals.exempt))]:[]),...(input.totals.net>0&&input.totals.taxRate!==null?[el("TasaIVA",(input.totals.taxRate*100).toFixed(2).replace(/\.?0+$/,"")),el("IVA",Math.round(input.totals.tax))]:[]),el("MntTotal",Math.round(input.totals.total))];
    const detalle=input.lines.map((line)=>el("Detalle",[el("NroLinDet",line.lineNumber),...(line.isExempt?[el("IndExe",1)]:[]),el("NmbItem",clip(line.description,80)),...(line.description.length>80?[el("DscItem",clip(line.description,1000))]:[]),el("QtyItem",Number(line.quantity.toFixed(6))),el("PrcItem",Number(line.unitPrice.toFixed(6))),...(line.discountAmount>0?[el("DescuentoMonto",Math.round(line.discountAmount))]:[]),el("MontoItem",Math.round(line.netAmount))]));
    const referencia=input.reference?[el("Referencia",[el("NroLinRef",1),el("TpoDocRef",input.reference.documentTypeCode),el("FolioRef",input.reference.folio),el("FchRef",input.reference.date),el("CodRef",input.reference.code),el("RazonRef",clip(input.reference.reason,90))])]:[];
    const stamp=timestamp();const dd=el("DD",[el("RE",siiRut(input.company.rut)),el("TD",input.documentTypeCode),el("F",input.folio),el("FE",input.issueDate),el("RR",siiRut(input.receiver.rut)),el("RSR",clip(input.receiver.legalName,40)),el("MNT",Math.round(input.totals.total)),el("IT1",clip(first.description,40)),input.caf.cafXml,el("TSTED",stamp)]);
    const frmt=createSign("RSA-SHA1").update(dd,"latin1").sign(createPrivateKey(input.caf.privateKeyPem),"base64");
    const ted=el("TED",[dd,el("FRMT",frmt,{algoritmo:"SHA1withRSA"})],{version:"1.0"});
    return el("Documento",[el("Encabezado",[el("IdDoc",idDoc),el("Emisor",emisor),el("Receptor",receptor),el("Totales",totales)]),...detalle,...referencia,ted,el("TmstFirma",stamp)],{ID:id});
  }
  async validate(xml:string,input:DteDocumentInput){const errors=structuralErrors(input);try{parseXml(xml);}catch(error){errors.push((error as Error).message);}return errors;}
  /** Firma el Documento con los mismos namespaces que tendrá dentro de EnvioDTE (evita firmas inválidas al ensobrar). */
  async sign(documentXml:string,input:DteDocumentInput){const certificate=this.certificates.load(this.secretRef());const inScope=` xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}"`;const canonical=documentXml.replace(/^<Documento /,`<Documento${inScope} `);const signature=xmlSignature(canonical,`#F${input.folio}T${input.documentTypeCode}`,certificate,` xmlns:xsi="${XSI_NS}"`);return`<DTE version="1.0">${documentXml}${signature}</DTE>`;}
  /** Versión archivable del DTE firmado: declara los mismos namespaces usados al firmar. */
  standalone(signedDte:string){return`<?xml version="1.0" encoding="ISO-8859-1"?>\n${signedDte.replace(/^<DTE version="1.0">/,`<DTE xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}" version="1.0">`)}`;}
  envelope(signedDtes:string[],input:DteDocumentInput){
    const certificate=this.certificates.load(this.secretRef());const sender=formatRut(process.env.DTE_SENDER_RUT??input.company.rut);
    const counts=new Map<number,number>();counts.set(input.documentTypeCode,signedDtes.length);
    const caratula=el("Caratula",[el("RutEmisor",siiRut(input.company.rut)),el("RutEnvia",siiRut(sender)),el("RutReceptor","60803000-K"),el("FchResol",input.company.resolutionDate),el("NroResol",input.company.resolutionNumber),el("TmstFirmaEnv",timestamp()),...[...counts].map(([type,count])=>el("SubTotDTE",[el("TpoDTE",type),el("NroDTE",count)]))],{version:"1.0"});
    const setBody=caratula+signedDtes.join("");const inScope=` xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}"`;const canonicalSet=`<SetDTE${inScope} ID="SetDoc">${setBody}</SetDTE>`;
    const signature=xmlSignature(canonicalSet,"#SetDoc",certificate,` xmlns:xsi="${XSI_NS}"`);
    return`<?xml version="1.0" encoding="ISO-8859-1"?>\n<EnvioDTE xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}" version="1.0" xsi:schemaLocation="${SII_NS} EnvioDTE_v10.xsd"><SetDTE ID="SetDoc">${setBody}</SetDTE>${signature}</EnvioDTE>`;
  }
  private async soap(environment:string,service:string,method:string,params:Record<string,string>){
    const body=siiSoapEnvelope(environment,service,method,params);
    const response=await fetch(`https://${siiHost(environment)}/DTEWS/${service}.jws`,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8",SOAPAction:""},body,signal:AbortSignal.timeout(30000)});const text=await response.text();if(!response.ok)throw new ServiceUnavailableException(`SII ${service} respondió HTTP ${response.status}.`);
    const envelope=parseXml(text);const ret=descendants(envelope,`${method}Return`)[0]??descendants(envelope,"return")[0];if(!ret)throw new ServiceUnavailableException(`Respuesta SII ${service} sin contenido.`);return parseXml(ret.text.trim());
  }
  /** Autenticación oficial: semilla → semilla firmada → token (vigencia corta, se reutiliza en memoria). */
  async authenticate(environment:string){
    if(this.token&&this.token.environment===environment&&this.token.expires>Date.now())return this.token.value;
    const seedResponse=await this.soap(environment,"CrSeed","getSeed",{});const state=textOf(seedResponse,"RESP_HDR","ESTADO");const seed=textOf(seedResponse,"RESP_BODY","SEMILLA");if(state!=="00"||!seed)throw new ServiceUnavailableException(`SII no entregó semilla (estado ${state||"?"}).`);
    const certificate=this.certificates.load(this.secretRef());const content=`<item><Semilla>${c14nText(seed)}</Semilla></item>`;const canonical=`<getToken>${content}</getToken>`;
    const signed=`<?xml version="1.0"?><getToken>${content}${xmlSignature(canonical,"",certificate,"",true)}</getToken>`;
    const tokenResponse=await this.soap(environment,"GetTokenFromSeed","getToken",{pszXml:signed});const tokenState=textOf(tokenResponse,"RESP_HDR","ESTADO");const token=textOf(tokenResponse,"RESP_BODY","TOKEN");if(tokenState!=="00"||!token)throw new ServiceUnavailableException(`SII rechazó la autenticación (estado ${tokenState||"?"}: ${textOf(tokenResponse,"RESP_HDR","GLOSA")}).`);
    this.token={value:token,environment,expires:Date.now()+50*60*1000};return token;
  }
  async connectionTest(environment:string){const started=Date.now(),seedResponse=await this.soap(environment,"CrSeed","getSeed",{}),state=textOf(seedResponse,"RESP_HDR","ESTADO"),seed=textOf(seedResponse,"RESP_BODY","SEMILLA");if(state!=="00"||!seed)throw new ServiceUnavailableException(`SII no entregó semilla (estado ${state||"?"}).`);let authenticated=false,certificate:string;try{const metadata=this.certificates.metadata(this.secretRef());certificate=Date.parse(metadata.expiresAt)>Date.now()?"VALID":"EXPIRED";}catch{certificate="NOT_CONFIGURED";}if(certificate==="VALID"){await this.authenticate(environment);authenticated=true;}return{provider:this.name,environment,host:siiHost(environment),seedService:"CONNECTED",certificate,authenticated,latencyMs:Date.now()-started,checkedAt:new Date().toISOString()};}
  async send(signed:string,input:DteDocumentInput){
    const envelopeXml=this.envelope([signed],input);const xsdErrors=await this.schema.validate(envelopeXml);if(xsdErrors.length)throw new UnprocessableEntityException(`El EnvioDTE no valida contra el XSD oficial: ${xsdErrors.join(" | ")}`);
    const token=await this.authenticate(input.environment);const sender=normalizeRut(process.env.DTE_SENDER_RUT??input.company.rut).split("-");const company=normalizeRut(input.company.rut).split("-");
    const form=new FormData();form.set("rutSender",sender[0]!);form.set("dvSender",sender[1]!);form.set("rutCompany",company[0]!);form.set("dvCompany",company[1]!);form.set("archivo",new Blob([Buffer.from(envelopeXml,"latin1")],{type:"text/xml"}),`envio_${input.folio}.xml`);
    const response=await fetch(`https://${siiHost(input.environment)}/cgi_dte/UPL/DTEUpload`,{method:"POST",headers:{Cookie:`TOKEN=${token}`,"User-Agent":"Mozilla/4.0 (compatible; PROG 1.0; Windows NT 5.0; YComp 5.0.2.4)"},body:form,signal:AbortSignal.timeout(60000)});
    const result=parseXml(await response.text());const status=textOf(result,"STATUS");const trackId=textOf(result,"TRACKID");if(status!=="0"||!trackId)throw new UnprocessableEntityException(`El SII rechazó la recepción del envío (STATUS ${status||"?"}).`);return{trackId,envelopeXml};
  }
  async issue(input:DteDocumentInput):Promise<DteIssueResult>{const unsigned=await this.createDraft(input);const errors=await this.validate(unsigned,input);if(errors.length)throw new UnprocessableEntityException(errors.join(" "));const signed=await this.sign(unsigned,input);const{trackId,envelopeXml}=await this.send(signed,input);return{unsignedXml:unsigned,signedXml:signed,envelopeXml,trackId,submissionId:null,status:"SUBMITTED",message:`Envío recibido por el SII (Track ID ${trackId}); pendiente de validación.`,pdf:null};}
  async getSubmissionStatus(trackId:string,environment:string,companyRut:string):Promise<DteStatus>{
    const token=await this.authenticate(environment);const[rut,dv]=normalizeRut(companyRut).split("-");const response=await this.soap(environment,"QueryEstUp","getEstUp",{RutCompania:rut!,DvCompania:dv!,TrackId:trackId,Token:token});
    const state=textOf(response,"RESP_HDR","ESTADO"),glosa=textOf(response,"RESP_HDR","GLOSA");const body=path(response,"RESP_BODY");const accepted=Number(textOf(body,"ACEPTADOS")||0),rejected=Number(textOf(body,"RECHAZADOS")||0),repairs=Number(textOf(body,"REPAROS")||0);
    const detail={state,glosa,accepted,rejected,repairs,informados:textOf(body,"INFORMADOS")};
    if(state==="EPR")return rejected>0?{status:"REJECTED",code:state,message:glosa||"Documento rechazado por el SII.",detail}:repairs>0?{status:"ACCEPTED_WITH_REPAIRS",code:state,message:glosa||"Aceptado con reparos.",detail}:accepted>0?{status:"ACCEPTED",code:state,message:glosa||"Aceptado por el SII.",detail}:{status:"RECEIVED_BY_SII",code:state,message:glosa||"Procesado sin detalle de aceptación.",detail};
    if(["RCT","RFR","RCO","RPR","RLV","RSC","RFC","FAN","RCS"].includes(state)||state.startsWith("-"))return{status:"REJECTED",code:state,message:glosa||`Envío rechazado (${state}).`,detail};
    return{status:"RECEIVED_BY_SII",code:state||null,message:glosa||"Envío en proceso de validación en el SII.",detail};
  }
  async getDocumentStatus(document:Row,companyRut:string){if(!document.trackId)throw new UnprocessableEntityException("El documento no tiene Track ID.");return this.getSubmissionStatus(document.trackId,document.environment,companyRut);}
  async downloadXml(){return null;}
  /** La representación impresa exige el timbre PDF417 del TED; no se genera un PDF sin timbre válido. */
  async downloadPdf(){return null;}
  async syncReceivedDocuments(){return[];}
}

// =========================================================================================== Proveedor: emisor electrónico certificado externo (adaptador HTTP)
/** Contrato genérico documentado en docs/SII-DTE-CERTIFICATION.md. Se habilita con DTE_PROVIDER_URL y DTE_PROVIDER_API_KEY. */
@Injectable()
export class ExternalCertifiedDteProvider extends TaxDocumentProvider {
  readonly name="EXTERNAL" as const;
  private config(){const url=process.env.DTE_PROVIDER_URL?.trim().replace(/\/$/,"");const key=process.env.DTE_PROVIDER_API_KEY?.trim();if(!url||!key)throw new ServiceUnavailableException("Proveedor DTE externo no configurado (DTE_PROVIDER_URL, DTE_PROVIDER_API_KEY).");if(!url.startsWith("https://"))throw new ServiceUnavailableException("El proveedor DTE debe usar HTTPS.");return{url,key};}
  private async call(method:string,route:string,body?:unknown){const{url,key}=this.config();const response=await fetch(`${url}${route}`,{method,headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});const data=await response.json().catch(()=>({})) as Row;if(!response.ok)throw new UnprocessableEntityException(`Proveedor DTE: ${data.message??`HTTP ${response.status}`}`);return data;}
  async requirements():Promise<DteRequirement[]>{const configured=Boolean(process.env.DTE_PROVIDER_URL&&process.env.DTE_PROVIDER_API_KEY);return[{key:"external_provider",label:"Proveedor certificado configurado",satisfied:configured,detail:configured?"Credenciales del proveedor presentes en el servidor.":"Define DTE_PROVIDER_URL y DTE_PROVIDER_API_KEY."}];}
  async connectionTest(environment:string){const started=Date.now(),data=await this.call("GET","/health");return{provider:this.name,environment,status:String(data.status??"CONNECTED"),latencyMs:Date.now()-started,checkedAt:new Date().toISOString()};}
  async createDraft(input:DteDocumentInput){return JSON.stringify(this.payload(input));}
  private payload(input:DteDocumentInput){return{externalId:input.taxDocumentId,environment:input.environment,documentType:input.documentTypeCode,issueDate:input.issueDate,dueDate:input.dueDate,issuer:{rut:input.company.rut},receiver:input.receiver,lines:input.lines,totals:input.totals,reference:input.reference};}
  async validate(_:string,input:DteDocumentInput){return structuralErrors({...input,folio:input.folio||1,caf:null});}
  async sign(xml:string){return xml;}
  async send(payload:string){const data=await this.call("POST","/documents",JSON.parse(payload));return{trackId:String(data.trackId??data.id),envelopeXml:null};}
  async issue(input:DteDocumentInput):Promise<DteIssueResult>{const errors=await this.validate("",input);if(errors.length)throw new UnprocessableEntityException(errors.join(" "));const data=await this.call("POST","/documents",this.payload(input));
    return{folio:data.folio?Number(data.folio):null,unsignedXml:null,signedXml:data.xmlBase64?Buffer.from(String(data.xmlBase64),"base64").toString("latin1"):null,envelopeXml:null,trackId:data.trackId?String(data.trackId):null,submissionId:data.id?String(data.id):null,status:mapExternal(String(data.status??"SUBMITTED")),message:String(data.message??"Documento enviado al proveedor certificado."),pdf:data.pdfBase64?Buffer.from(String(data.pdfBase64),"base64"):null};}
  async getSubmissionStatus(id:string){const data=await this.call("GET",`/documents/${encodeURIComponent(id)}`);return{status:mapExternal(String(data.status)),code:data.code?String(data.code):null,message:String(data.message??data.status),detail:{folio:data.folio??null}};}
  async getDocumentStatus(document:Row){return this.getSubmissionStatus(document.submissionId??document.trackId);}
  async downloadXml(document:Row){const data=await this.call("GET",`/documents/${encodeURIComponent(document.submissionId)}/xml`);return data.xmlBase64?Buffer.from(String(data.xmlBase64),"base64"):null;}
  async downloadPdf(document:Row){const data=await this.call("GET",`/documents/${encodeURIComponent(document.submissionId)}/pdf`);return data.pdfBase64?Buffer.from(String(data.pdfBase64),"base64"):null;}
  async syncReceivedDocuments(since:string){const data=await this.call("GET",`/received?since=${encodeURIComponent(since)}`);return(Array.isArray(data.items)?data.items:[]).map((item:Row)=>({xml:Buffer.from(String(item.xmlBase64),"base64").toString("latin1"),source:"PROVIDER"}));}
}
function mapExternal(status:string):DteStatus["status"]{const s=status.toUpperCase();if(["ACCEPTED","ACEPTADO","DOK"].includes(s))return"ACCEPTED";if(["ACCEPTED_WITH_REPAIRS","REPAROS","RLV"].includes(s))return"ACCEPTED_WITH_REPAIRS";if(["REJECTED","RECHAZADO","RCH","RCT"].includes(s))return"REJECTED";if(["RECEIVED","RECEIVED_BY_SII","RECIBIDO"].includes(s))return"RECEIVED_BY_SII";return"SUBMITTED";}

// =========================================================================================== DTE recibidos: lectura de XML
export interface ParsedReceivedDte { issuerRut:string; issuerName:string; issuerBusinessActivity:string|null; receiverRut:string; documentTypeCode:number; folio:number; issueDate:string; netAmount:number; exemptAmount:number; taxAmount:number; otherTaxes:Array<{code:string;rate:number|null;amount:number}>; totalAmount:number; references:Array<Record<string,unknown>>; hasTed:boolean; errors:string[]; }
export function parseReceivedXml(xml:string|Buffer):ParsedReceivedDte[]{
  const root=parseXml(xml);const documents=local(root.name)==="Documento"?[root]:descendants(root,"Documento");if(!documents.length)throw new UnprocessableEntityException("El XML no contiene documentos tributarios (Documento).");
  return documents.map((doc:XmlNode)=>{const header=child(doc,"Encabezado");const id=child(header,"IdDoc"),issuer=child(header,"Emisor"),receiver=child(header,"Receptor"),totals=child(header,"Totales");const n=(value:string)=>Number(value||0);
    const parsed:ParsedReceivedDte={issuerRut:formatRut(textOf(issuer,"RUTEmisor")),issuerName:textOf(issuer,"RznSoc")||textOf(issuer,"RznSocEmisor"),issuerBusinessActivity:textOf(issuer,"GiroEmis")||textOf(issuer,"GiroEmisor")||null,receiverRut:formatRut(textOf(receiver,"RUTRecep")),documentTypeCode:n(textOf(id,"TipoDTE")),folio:n(textOf(id,"Folio")),issueDate:textOf(id,"FchEmis"),netAmount:n(textOf(totals,"MntNeto")),exemptAmount:n(textOf(totals,"MntExe")),taxAmount:n(textOf(totals,"IVA")),otherTaxes:(totals?.children??[]).filter((c)=>local(c.name)==="ImptoReten").map((c)=>({code:textOf(c,"TipoImp"),rate:textOf(c,"TasaImp")?Number(textOf(c,"TasaImp")):null,amount:n(textOf(c,"MontoImp"))})),totalAmount:n(textOf(totals,"MntTotal")),references:(doc.children??[]).filter((c)=>local(c.name)==="Referencia").map((c)=>({type:textOf(c,"TpoDocRef"),folio:textOf(c,"FolioRef"),date:textOf(c,"FchRef"),code:textOf(c,"CodRef"),reason:textOf(c,"RazonRef")})),hasTed:Boolean(child(doc,"TED")),errors:[]};
    if(!validRut(parsed.issuerRut))parsed.errors.push("RUT emisor inválido.");if(!parsed.folio)parsed.errors.push("Folio ausente.");if(!/^\d{4}-\d{2}-\d{2}$/.test(parsed.issueDate))parsed.errors.push("Fecha de emisión inválida.");if(!parsed.hasTed)parsed.errors.push("Documento sin timbre electrónico (TED).");
    const other=parsed.otherTaxes.reduce((t,x)=>t+x.amount,0);if(Math.round(parsed.netAmount+parsed.exemptAmount+parsed.taxAmount+other)!==Math.round(parsed.totalAmount))parsed.errors.push("Los totales del documento no cuadran.");return parsed;});
}

import { BadRequestException, ConflictException, ForbiddenException, HttpException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface FinanceActor { userId:string|null; role:string; }
export type Row = Record<string, any>;

// ------------------------------------------------------------------------------------------- montos
export const r2=(value:unknown)=>Math.round((Number(value)||0)*100)/100;
/** CLP no tiene decimales en documentos tributarios: redondeo comercial a entero. */
export const roundCurrency=(value:number,currency="CLP")=>currency==="CLP"?Math.round(value):r2(value);
export const sum=(values:Array<number|null|undefined>)=>r2(values.reduce<number>((total,value)=>total+(Number(value)||0),0));
export const money=(value:number,currency="CLP")=>`${currency==="CLP"?"$":currency+" "}${new Intl.NumberFormat("es-CL",{maximumFractionDigits:currency==="CLP"?0:2}).format(value)}`;
export function positiveAmount(value:unknown,label:string){const amount=r2(value);if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException(`${label} debe ser un monto mayor a cero.`);return amount;}
export function nonNegative(value:unknown,label:string){const amount=r2(value??0);if(!Number.isFinite(amount)||amount<0)throw new BadRequestException(`${label} no puede ser negativo.`);return amount;}

// ------------------------------------------------------------------------------------------- fechas (persistencia ISO, UI DD-MM-AAAA)
const santiago=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"});
export const todayCl=(at=new Date())=>santiago.format(at);
export const nowIso=()=>new Date().toISOString();
export const periodKeyOf=(date:string)=>date.slice(0,7);
export function isIsoDate(value:unknown):value is string{return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;}
/** Acepta AAAA-MM-DD (API) o DD-MM-AAAA (formulario) y devuelve siempre AAAA-MM-DD. */
export function isoDate(value:unknown,label:string,required=true):string{
  if(value===undefined||value===null||value===""){if(required)throw new BadRequestException(`${label} es obligatoria.`);return "";}
  const text=String(value).trim();const local=/^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(text);const candidate=local?`${local[3]}-${local[2]}-${local[1]}`:text.slice(0,10);
  if(!isIsoDate(candidate))throw new BadRequestException(`${label} no es una fecha válida (DD-MM-AAAA).`);return candidate;
}
export function addDays(date:string,days:number){const value=new Date(`${date}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);}
export function addMonths(date:string,months:number){const value=new Date(`${date}T00:00:00Z`);const day=value.getUTCDate();value.setUTCDate(1);value.setUTCMonth(value.getUTCMonth()+months);const last=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate();value.setUTCDate(Math.min(day,last));return value.toISOString().slice(0,10);}
/** Vencimiento de la cuota N de un plan mensual: día de pago del mes N (ajustado al último día del mes). Espejo de public.quote_payment_due_date. */
export function quoteDueDate(start:string,paymentDay:number,sequence:number){const value=new Date(`${start.slice(0,7)}-01T00:00:00Z`);value.setUTCMonth(value.getUTCMonth()+sequence-1);const last=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate();value.setUTCDate(Math.min(paymentDay,last));return value.toISOString().slice(0,10);}
export function daysBetween(from:string,to:string){return Math.round((Date.parse(`${to.slice(0,10)}T00:00:00Z`)-Date.parse(`${from.slice(0,10)}T00:00:00Z`))/86400000);}
export function monthRange(periodKey:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey))throw new BadRequestException("Período inválido (AAAA-MM).");const[year,month]=periodKey.split("-").map(Number) as [number,number];const end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);return{from:`${periodKey}-01`,to:end};}
export function previousPeriod(periodKey:string){return addMonths(`${periodKey}-01`,-1).slice(0,7);}
export const displayDate=(date:string|null|undefined)=>date?`${date.slice(8,10)}-${date.slice(5,7)}-${date.slice(0,4)}`:"—";
export function displayDateTime(iso:string){const parts=new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date(iso));const get=(type:string)=>parts.find((part)=>part.type===type)?.value??"";return`${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}`;}

// ------------------------------------------------------------------------------------------- RUT chileno
export function normalizeRut(value:unknown){return String(value??"").replace(/[.\s]/g,"").toUpperCase();}
export function validRut(value:unknown){const rut=normalizeRut(value);const match=/^(\d{1,8})-?([\dK])$/.exec(rut);if(!match)return false;let total=0,factor=2;for(const digit of match[1]!.split("").reverse()){total+=Number(digit)*factor;factor=factor===7?2:factor+1;}const rest=11-(total%11);const dv=rest===11?"0":rest===10?"K":String(rest);return dv===match[2];}
export function formatRut(value:unknown){const rut=normalizeRut(value).replace("-","");if(rut.length<2)return rut;return`${rut.slice(0,-1)}-${rut.slice(-1)}`;}
export function requireRut(value:unknown,label="RUT"){if(!validRut(value))throw new BadRequestException(`${label} no es válido (dígito verificador).`);return formatRut(value);}

// ------------------------------------------------------------------------------------------- texto
export function requiredText(value:unknown,label:string,max=2000){const text=typeof value==="string"?value.trim():"";if(!text)throw new BadRequestException(`${label} es obligatorio.`);if(text.length>max)throw new BadRequestException(`${label} excede ${max} caracteres.`);return text;}
export function optionalText(value:unknown,max=2000){if(value===undefined||value===null)return null;const text=String(value).trim();return text?text.slice(0,max):null;}
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function optionalUuid(value:unknown,label:string){if(value===undefined||value===null||value==="")return null;if(typeof value!=="string"||!uuidPattern.test(value))throw new BadRequestException(`${label} no es un identificador válido.`);return value;}
export function requiredUuid(value:unknown,label:string){const id=optionalUuid(value,label);if(!id)throw new BadRequestException(`${label} es obligatorio.`);return id;}
export function oneOf<T extends string>(value:unknown,allowed:readonly T[],label:string,fallback?:T):T{if((value===undefined||value===null||value==="")&&fallback)return fallback;if(!allowed.includes(value as T))throw new BadRequestException(`${label} inválido.`);return value as T;}
export function fill(template:string,values:Record<string,unknown>){return template.replace(/\{(\w+)\}/g,(_,key:string)=>values[key]===undefined||values[key]===null?"":String(values[key]));}

// ------------------------------------------------------------------------------------------- hashing y secretos
export const sha256=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
export const randomToken=()=>randomBytes(32).toString("base64url");
function encryptionKey(){const raw=process.env.FINANCE_ENCRYPTION_KEY?.trim();if(!raw)return null;const key=/^[0-9a-f]{64}$/i.test(raw)?Buffer.from(raw,"hex"):Buffer.from(raw,"base64");return key.length===32?key:null;}
export const encryptionConfigured=()=>Boolean(encryptionKey());
/** AES-256-GCM con FINANCE_ENCRYPTION_KEY (sólo backend). Sin clave configurada no se almacena el dato sensible. */
export function encryptSecret(value:string){const key=encryptionKey();if(!key)throw new ServiceUnavailableException("FINANCE_ENCRYPTION_KEY no está configurada: no se almacenan datos bancarios ni CAF completos.");const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",key,iv);const data=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return`v1.${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${data.toString("base64")}`;}
export function decryptSecret(payload:string){const key=encryptionKey();if(!key)throw new ServiceUnavailableException("FINANCE_ENCRYPTION_KEY no está configurada.");const[version,iv,tag,data]=payload.split(".");if(version!=="v1"||!iv||!tag||!data)throw new BadRequestException("Secreto cifrado con formato desconocido.");const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(iv,"base64"));decipher.setAuthTag(Buffer.from(tag,"base64"));return Buffer.concat([decipher.update(Buffer.from(data,"base64")),decipher.final()]).toString("utf8");}
/** Nunca registrar números completos: sólo los últimos 4 dígitos. */
export function last4(value:unknown){const digits=String(value??"").replace(/\D/g,"");return digits?digits.slice(-4):null;}

// ------------------------------------------------------------------------------------------- errores de dominio
const codes:Record<string,(message:string)=>HttpException>={
  FINANCE_UNBALANCED:(m)=>new UnprocessableEntityException(m),FINANCE_ACCOUNT:(m)=>new UnprocessableEntityException(m),FINANCE_AMOUNT:(m)=>new UnprocessableEntityException(m),
  FINANCE_CLIENT:(m)=>new UnprocessableEntityException(m),FINANCE_CURRENCY:(m)=>new UnprocessableEntityException(m),FINANCE_REASON:(m)=>new BadRequestException(m),
  FINANCE_STATE:(m)=>new ConflictException(m),FINANCE_IMMUTABLE:(m)=>new ConflictException(m),FINANCE_PERIOD_CLOSED:(m)=>new ConflictException(m),FINANCE_CLOSE_BLOCKED:(m)=>new ConflictException(m),
  FINANCE_NO_FOLIOS:(m)=>new ConflictException(m),FINANCE_FOLIO:(m)=>new ConflictException(m),FINANCE_TAX_OVERLAP:(m)=>new ConflictException(m),FINANCE_NOT_FOUND:(m)=>new NotFoundException(m||"Registro financiero no encontrado."),
  FINANCE_FORBIDDEN:(m)=>new ForbiddenException(m),
  QUOTE_PAYMENT_IMMUTABLE:(m)=>new ConflictException(m),QUOTE_PAYMENT_NOT_OPEN:(m)=>new ConflictException(m),QUOTE_PAYMENT_DATE:(m)=>new UnprocessableEntityException(m),QUOTE_PAYMENT_NOT_FOUND:(m)=>new NotFoundException(m||"Plan de pagos no encontrado."),
};
export class FinanceDomainError extends Error { constructor(readonly code:string,message:string){super(`${code}: ${message}`);} }
export function domainError(code:keyof typeof codes|string,message:string):never{throw toHttp(new FinanceDomainError(code,message));}
/** Traduce errores de la base (RAISE EXCEPTION 'FINANCE_*') o del modo memoria a respuestas HTTP. */
export function toHttp(error:unknown):unknown{
  if(error instanceof HttpException)return error;
  const message=String((error as {message?:string})?.message??error);const match=/((?:FINANCE|QUOTE_PAYMENT)_[A-Z_]+):?\s*(.*)$/s.exec(message);
  if(match&&codes[match[1]!])return codes[match[1]!]!(match[2]?.trim()||message);
  if((error as {code?:string})?.code==="23505")return new ConflictException("Registro duplicado: ya existe un documento con la misma identidad.");
  if((error as {code?:string})?.code==="23514")return new UnprocessableEntityException(`La base rechazó datos inconsistentes: ${message}`);
  return error;
}
export async function guarded<T>(work:()=>Promise<T>):Promise<T>{try{return await work();}catch(error){throw toHttp(error);}}

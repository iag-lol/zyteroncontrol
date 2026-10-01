import { BadRequestException } from "@nestjs/common";

export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function required(value:unknown,label:string){if(typeof value!=="string"||!value.trim())throw new BadRequestException(`${label} es obligatorio.`);return value.trim();}
export function optionalUuid(value:unknown,label:string){if(value!==null&&value!==undefined&&value!==""&&!uuidPattern.test(String(value)))throw new BadRequestException(`${label} debe seleccionarse desde el directorio.`);return value?String(value):null;}
export function pageQuery(query:Record<string,string|undefined>){return{...query,page:Math.max(1,Number(query.page)||1),pageSize:Math.min(100,Math.max(1,Number(query.pageSize)||25))};}
export function actor(headers:Record<string,string|undefined>){const value=headers["x-zyteron-user-id"];return value&&uuidPattern.test(value)?value:null;}
export function scopedPageQuery(query:Record<string,string|undefined>,headers:Record<string,string|undefined>){const parsed=pageQuery(query);return headers["x-zyteron-role"]==="EJECUTIVA_VENTAS"&&actor(headers)?{...parsed,ownerId:actor(headers)!}:parsed;}

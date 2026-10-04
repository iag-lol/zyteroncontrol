import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { LedgerAccount } from "@zyteron/contracts";
import { assertCan, clientScope, type FinancePermission } from "./finance.access.js";
import { FinanceRepository, type Filters } from "./finance.repository.js";
import { FinanceSources } from "./finance.sources.js";
import { type FinanceActor, type Row, todayCl } from "./finance.util.js";

/** Servicios compartidos del módulo: catálogo de cuentas, alcance por cliente, tasas vigentes y enriquecimiento. */
@Injectable()
export class FinanceContext {
  private accountCache:{at:number;items:LedgerAccount[]}|null=null;
  constructor(readonly repo:FinanceRepository,readonly sources:FinanceSources){}

  async accounts(){if(this.accountCache&&Date.now()-this.accountCache.at<5000)return this.accountCache.items;const items=await this.repo.list<LedgerAccount>("chart_of_accounts",{},{order:"code",ascending:true});this.accountCache={at:Date.now(),items};return items;}
  invalidateAccounts(){this.accountCache=null;}
  async accountMap(){return new Map((await this.accounts()).map((account)=>[account.id,account]));}
  async accountByCode(code:string){const account=(await this.accounts()).find((item)=>item.code===code);if(!account)throw new UnprocessableEntityException(`La cuenta ${code} no existe en el plan de cuentas.`);return account;}

  /** undefined = sin restricción; array = clientes permitidos (vacío = ninguno). */
  async clientFilter(actor:FinanceActor):Promise<string[]|undefined>{const scope=clientScope(actor);if(scope==="ALL")return undefined;if(scope==="NONE")return[];return[...await this.sources.ownClientIds(actor.userId)];}
  async scopedFilters(actor:FinanceActor,filters:Filters,clientId?:string|null):Promise<Filters>{const allowed=await this.clientFilter(actor);if(clientId){if(allowed&&!allowed.includes(clientId))throw new ForbiddenException("No tienes acceso a este cliente.");return{...filters,clientId};}return allowed?{...filters,clientId:allowed}:filters;}
  async assertClientAccess(actor:FinanceActor,clientId:string){const allowed=await this.clientFilter(actor);if(allowed&&!allowed.includes(clientId))throw new ForbiddenException("No tienes acceso a este cliente.");}
  require(actor:FinanceActor,permission:FinancePermission){assertCan(actor,permission);}
  requireAny(actor:FinanceActor,...permissions:FinancePermission[]){const errors=permissions.filter((permission)=>{try{assertCan(actor,permission);return false;}catch{return true;}});if(errors.length===permissions.length)throw new ForbiddenException(`Tu rol no tiene ninguno de los permisos: ${permissions.join(", ")}.`);}

  async withClientNames<T extends {clientId:string|null}>(rows:T[]):Promise<Array<T&{clientName:string|null}>>{const names=await this.sources.clientNames(rows.map((row)=>row.clientId));return rows.map((row)=>({...row,clientName:row.clientId?names.get(row.clientId)??null:null}));}
  async withVendorNames<T extends {vendorId:string|null}>(rows:T[]):Promise<Array<T&{vendorName:string|null}>>{const ids=[...new Set(rows.map((row)=>row.vendorId).filter((id):id is string=>Boolean(id)))];const vendors=ids.length?await this.repo.list<Row>("vendors",{id:ids}):[];const names=new Map(vendors.map((vendor)=>[vendor.id,vendor.tradeName||vendor.legalName]));return rows.map((row)=>({...row,vendorName:row.vendorId?names.get(row.vendorId)??null:null}));}

  /** Tasa vigente desde tax_rule_versions (nunca hardcodeada). */
  async taxRate(code:string,date=todayCl()){const rule=await this.repo.findOne<Row>("tax_rules",{code,active:true});if(!rule)throw new UnprocessableEntityException(`Regla tributaria ${code} no configurada.`);const versions=await this.repo.list<Row>("tax_rule_versions",{taxRuleId:rule.id,active:true});const version=versions.find((v)=>v.effectiveFrom<=date&&(!v.effectiveTo||v.effectiveTo>=date));if(!version)throw new UnprocessableEntityException(`No existe una tasa ${code} vigente al ${date.split("-").reverse().join("-")}. Configúrala en Impuestos.`);return{rate:Number(version.rate),versionId:version.id as string,sourceReference:version.sourceReference as string};}
  async optionalTaxRate(code:string,date=todayCl()){try{return await this.taxRate(code,date);}catch{return null;}}
  async must<T>(table:string,id:string,label:string):Promise<T>{const row=await this.repo.get<T>(table,id);if(!row)throw new NotFoundException(`${label} no encontrado.`);return row;}
}

import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createServerSupabase } from "../domain/server-supabase.js";
import { defaultSettings, seedAccounts, seedChecklist, seedCostCenters, seedDocumentTypes, seedExpenseCategories, seedForecastScenarios, seedReminderRules, seedRules, seedTaxRules } from "./finance.seed.js";
import { FinanceDomainError, type FinanceActor, nowIso, r2, type Row, toHttp } from "./finance.util.js";

export type FilterValue = string|number|boolean|null|undefined|Array<string|number>|{gte?:string|number;lte?:string|number;gt?:string|number;lt?:string|number;neq?:string|number|null;notIn?:Array<string|number>;ilike?:string};
export type Filters = Record<string,FilterValue>;
export interface ListOptions { order?:string; ascending?:boolean; limit?:number; offset?:number; }
export interface PageQuery { page:number; pageSize:number; search?:string; searchColumns?:string[]; order?:string; ascending?:boolean; }
export interface Paged<T> { items:T[]; page:number; pageSize:number; total:number; totalPages:number; }

const snake=(key:string)=>key.replace(/[A-Z]/g,(letter)=>`_${letter.toLowerCase()}`);
const camel=(key:string)=>key.replace(/_([a-z0-9])/g,(_,letter:string)=>letter.toUpperCase());
/** Columnas generadas por la base: nunca se escriben desde la API. */
const generated:Record<string,string[]>={invoices:["balanceDue"],payments:["netAmount","unappliedAmount"],payables:["balance"]};
const numericColumns=new Set(["amount","debit","credit","totalDebit","totalCredit","netAmount","exemptAmount","taxAmount","totalAmount","amountPaid","amountCredited","balanceDue","grossAmount","feeAmount","allocatedAmount","refundedAmount","unappliedAmount","balance","reconciledAmount","openingBalance","rate","taxRate","exchangeRate","eligibleTaxAmount","taxCreditEligibleAmount","minAmount","maxAmount","hourlyCost","unitPrice","quantity","discountAmount","originalAmount","invoiceApprovalThreshold","reconciliationAmountTolerance","clientConcentrationThreshold","collectedPercent","recurringFactor","expenseFactor","taxNonRecoverable","ppmRate","rangeFrom","rangeTo","folio","confidence"]);
const toRow=(table:string,value:Row)=>Object.fromEntries(Object.entries(value).filter(([key,item])=>item!==undefined&&!(generated[table]??[]).includes(key)).map(([key,item])=>[snake(key),item]));
const fromRow=<T>(value:Row):T=>{const result:Row={};for(const[key,item]of Object.entries(value))result[camel(key)]=numericColumns.has(camel(key))&&item!==null&&item!==undefined&&typeof item==="string"&&/^-?\d+(\.\d+)?$/.test(item)?Number(item):item;return result as T;};
const keyed:Record<string,string>={tax_document_types:"code",finance_settings:"id"};
/** Restricciones únicas replicadas en modo memoria (la base es la fuente de verdad en Supabase). */
const uniques:Record<string,Array<{keys:string[];when?:(row:Row)=>boolean}>>={
  chart_of_accounts:[{keys:["code"]}],cost_centers:[{keys:["code"]}],accounting_periods:[{keys:["periodKey"]}],journal_entries:[{keys:["entryNumber"],when:(r)=>Boolean(r.entryNumber)},{keys:["sourceEventId"],when:(r)=>Boolean(r.sourceEventId)},{keys:["reversalOfId"],when:(r)=>Boolean(r.reversalOfId)}],
  journal_entry_lines:[{keys:["journalEntryId","lineNumber"]}],accounting_rules:[{keys:["code"]}],accounting_rule_versions:[{keys:["ruleId","version"]},{keys:["ruleId"],when:(r)=>r.status==="ACTIVE"}],accounting_events:[{keys:["idempotencyKey"]}],
  tax_rules:[{keys:["code"]}],billing_schedules:[{keys:["clientServiceId"],when:(r)=>Boolean(r.active&&r.clientServiceId)}],billing_schedule_runs:[{keys:["scheduleId","periodKey"]}],invoices:[{keys:["invoiceNumber"]}],invoice_lines:[{keys:["invoiceId","lineNumber"]}],
  dte_certificates:[{keys:["fingerprintSha256"]}],tax_folio_authorizations:[{keys:["cafSha256"]},{keys:["environment","documentTypeCode","rangeFrom"]}],tax_folios:[{keys:["environment","documentTypeCode","folio"]}],
  tax_documents:[{keys:["invoiceId"],when:(r)=>!["REJECTED","CANCELLED"].includes(r.status)},{keys:["environment","documentTypeCode","folio"],when:(r)=>r.folio!==null&&r.folio!==undefined}],
  received_tax_documents:[{keys:["issuerRut","documentTypeCode","folio"]}],rcv_imports:[{keys:["registerType","periodKey","fileSha256"]}],rcv_entries:[{keys:["importId","counterpartRut","documentTypeCode","folio"]}],vendors:[{keys:["rut"]}],expense_categories:[{keys:["code"]}],
  approval_requests:[{keys:["entityType","entityId","level"]}],expenses:[{keys:["expenseNumber"]},{keys:["receivedTaxDocumentId"],when:(r)=>Boolean(r.receivedTaxDocumentId)}],payables:[{keys:["sourceType","sourceId"],when:(r)=>Boolean(r.sourceId)}],
  vendor_payments:[{keys:["paymentNumber"]}],vendor_payment_allocations:[{keys:["vendorPaymentId","payableId"]}],payments:[{keys:["paymentReference"]},{keys:["provider","externalId"],when:(r)=>Boolean(r.externalId)}],
  payment_provider_events:[{keys:["provider","eventKey"]}],payment_links:[{keys:["tokenHash"]}],collection_reminder_rules:[{keys:["offsetDays"]}],collection_reminders:[{keys:["invoiceId","offsetDays","channel"]}],
  bank_statement_imports:[{keys:["bankAccountId","fileSha256"]}],bank_transactions:[{keys:["bankAccountId","externalHash"]}],budget_lines:[{keys:["budgetId","accountId","periodKey","costCenterId","projectId"]}],commission_payments:[{keys:["commissionId"]}],
  forecast_scenarios:[{keys:["code"]}],close_checklist_items:[{keys:["code"]}],period_close_runs:[{keys:["periodId"]}],period_close_tasks:[{keys:["closeRunId","checklistItemId"]}],period_snapshots:[{keys:["periodId","version"]}],
  tax_obligations:[{keys:["code","periodKey"]}],f29_preparations:[{keys:["periodKey"]}],finance_notifications:[{keys:["eventKey"]}],finance_idempotency_keys:[{keys:["idempotencyKey","operation"]}],
};
const noDelete=new Set(["invoices","payments","tax_documents","vendor_payment_allocations","payment_refunds","cash_movements","expenses","payables","vendor_payments","received_tax_documents","commission_payments","finance_events","tax_document_events","accounting_events","rcv_entries","rcv_imports","bank_statement_imports","bank_transactions","reconciliation_matches","period_snapshots","finance_audit_events","payment_allocations","tax_folios"]);
const fail=(code:string,message:string):never=>{throw new FinanceDomainError(code,message);};
const duplicate=(table:string,keys:string[]):never=>{throw Object.assign(new Error(`duplicate key value violates unique constraint (${table}: ${keys.join(",")})`),{code:"23505"});};
const violates=(message:string):never=>{throw Object.assign(new Error(message),{code:"23514"});};
const matches=(row:Row,filters:Filters)=>Object.entries(filters).every(([key,expected])=>{
  if(expected===undefined)return true;const value=row[key];
  if(expected===null)return value===null||value===undefined;
  if(Array.isArray(expected))return expected.includes(value as never);
  if(typeof expected==="object"){const c=expected;if(c.gte!==undefined&&!(value!==null&&value!==undefined&&value>=c.gte))return false;if(c.lte!==undefined&&!(value!==null&&value!==undefined&&value<=c.lte))return false;if(c.gt!==undefined&&!(value!==null&&value!==undefined&&value>c.gt))return false;if(c.lt!==undefined&&!(value!==null&&value!==undefined&&value<c.lt))return false;if("neq" in c&&(c.neq===null?value===null||value===undefined:value===c.neq))return false;if(c.notIn&&c.notIn.includes(value as never))return false;if(c.ilike!==undefined&&!String(value??"").toLowerCase().includes(String(c.ilike).toLowerCase()))return false;return true;}
  return value===expected;
});

@Injectable()
export class FinanceRepository {
  readonly supabase=createServerSupabase();
  private readonly memory=new Map<string,Map<string,Row>>();
  private readonly files=new Map<string,{bytes:Buffer;mime:string}>();
  private readonly counters=new Map<string,number>();

  constructor(){if(!this.supabase)this.seedMemory();}
  configured(){return Boolean(this.supabase);}
  private store(table:string){let value=this.memory.get(table);if(!value){value=new Map();this.memory.set(table,value);}return value;}

  // ------------------------------------------------------------------------------------------ lectura
  async list<T=Row>(table:string,filters:Filters={},options:ListOptions={}):Promise<T[]>{
    const order=options.order??"createdAt",ascending=options.ascending??false;
    if(!this.supabase){const rows=[...this.store(table).values()].filter((row)=>matches(row,filters)).sort((a,b)=>{const x=a[order]??"",y=b[order]??"";const result=typeof x==="number"&&typeof y==="number"?x-y:String(x).localeCompare(String(y));return ascending?result:-result;});const start=options.offset??0;return structuredClone(options.limit?rows.slice(start,start+options.limit):rows.slice(start)) as T[];}
    const out:T[]=[];const pageSize=1000;let from=options.offset??0;const limit=options.limit??Number.POSITIVE_INFINITY;
    while(out.length<limit){const take=Math.min(pageSize,limit-out.length);let query=this.apply((this.supabase.from(table) as any).select("*"),filters);if(order)query=query.order(snake(order),{ascending});const{data,error}=await query.range(from,from+take-1);if(error)throw toHttp(error);const rows=(data??[]).map((row:Row)=>fromRow<T>(row));out.push(...rows);if(rows.length<take)break;from+=take;}
    return out;
  }
  async page<T=Row>(table:string,filters:Filters,query:PageQuery):Promise<Paged<T>>{
    const search=query.search?.trim();
    if(!this.supabase){let rows=await this.list<Row>(table,filters,{order:query.order,ascending:query.ascending});if(search){const needle=search.toLowerCase();rows=rows.filter((row)=>(query.searchColumns??[]).some((column)=>String(row[column]??"").toLowerCase().includes(needle)));}const start=(query.page-1)*query.pageSize;return{items:rows.slice(start,start+query.pageSize) as T[],page:query.page,pageSize:query.pageSize,total:rows.length,totalPages:Math.max(1,Math.ceil(rows.length/query.pageSize))};}
    let builder=this.apply((this.supabase.from(table) as any).select("*",{count:"exact"}),filters);
    if(search&&query.searchColumns?.length){const safe=search.replace(/[,()%*]/g," ");builder=builder.or(query.searchColumns.map((column)=>`${snake(column)}.ilike.%${safe}%`).join(","));}
    const from=(query.page-1)*query.pageSize;const{data,error,count}=await builder.order(snake(query.order??"createdAt"),{ascending:query.ascending??false}).range(from,from+query.pageSize-1);if(error)throw toHttp(error);
    return{items:(data??[]).map((row:Row)=>fromRow<T>(row)),page:query.page,pageSize:query.pageSize,total:count??0,totalPages:Math.max(1,Math.ceil((count??0)/query.pageSize))};
  }
  private apply(query:any,filters:Filters){
    for(const[key,value]of Object.entries(filters)){if(value===undefined)continue;const column=snake(key);
      if(value===null)query=query.is(column,null);else if(Array.isArray(value))query=query.in(column,value.length?value:["00000000-0000-0000-0000-000000000000"]);
      else if(typeof value==="object"){if(value.gte!==undefined)query=query.gte(column,value.gte);if(value.lte!==undefined)query=query.lte(column,value.lte);if(value.gt!==undefined)query=query.gt(column,value.gt);if(value.lt!==undefined)query=query.lt(column,value.lt);if("neq" in value)query=value.neq===null?query.not(column,"is",null):query.neq(column,value.neq);if(value.notIn?.length)query=query.not(column,"in",`(${value.notIn.join(",")})`);if(value.ilike!==undefined)query=query.ilike(column,`%${String(value.ilike).replace(/[%*]/g,"")}%`);}
      else query=query.eq(column,value);}
    return query;
  }
  async get<T=Row>(table:string,id:string|number):Promise<T|undefined>{
    if(!this.supabase){const row=this.store(table).get(String(id));return row?structuredClone(row) as T:undefined;}
    const{data,error}=await(this.supabase.from(table) as any).select("*").eq(keyed[table]??"id",id).maybeSingle();if(error)throw toHttp(error);return data?fromRow<T>(data):undefined;
  }
  async findOne<T=Row>(table:string,filters:Filters):Promise<T|undefined>{return(await this.list<T>(table,filters,{limit:1}))[0];}
  async count(table:string,filters:Filters={}){if(!this.supabase)return[...this.store(table).values()].filter((row)=>matches(row,filters)).length;const{count,error}=await this.apply((this.supabase.from(table) as any).select("id",{count:"exact",head:true}),filters);if(error)throw toHttp(error);return count??0;}

  // ------------------------------------------------------------------------------------------ escritura
  async create<T=Row>(table:string,input:Row):Promise<T>{
    const now=nowIso();
    if(!this.supabase){const item:Row={...input};const key=keyed[table];if(!key)item.id=item.id??randomUUID();if(!item.createdAt&&table!=="tax_document_types")item.createdAt=now;if("updatedAt" in item||this.hasUpdatedAt(table))item.updatedAt=item.updatedAt??now;this.numberFor(table,item);this.derive(table,item);this.guardInsert(table,item);this.unique(table,item);this.store(table).set(String(key?item[key]:item.id),item);return structuredClone(item) as T;}
    const{data,error}=await(this.supabase.from(table) as any).insert(toRow(table,input)).select("*").single();if(error)throw toHttp(error);return fromRow<T>(data);
  }
  async createMany(table:string,inputs:Row[]){if(!inputs.length)return[];if(!this.supabase){const out:Row[]=[];for(const input of inputs)out.push(await this.create(table,input));return out;}const{data,error}=await(this.supabase.from(table) as any).insert(inputs.map((input)=>toRow(table,input))).select("*");if(error)throw toHttp(error);return(data??[]).map((row:Row)=>fromRow<Row>(row));}
  async update<T=Row>(table:string,id:string|number,patch:Row):Promise<T>{
    if(!this.supabase){const current=this.store(table).get(String(id));if(!current)fail("FINANCE_NOT_FOUND","Registro financiero no encontrado.");const next:Row={...current,...patch};if(this.hasUpdatedAt(table))next.updatedAt=nowIso();this.derive(table,next);this.guardUpdate(table,current!,next);this.unique(table,next,String(id));this.store(table).set(String(id),next);return structuredClone(next) as T;}
    const body=toRow(table,patch);const{data,error}=await(this.supabase.from(table) as any).update(body).eq(keyed[table]??"id",id).select("*").single();if(error)throw toHttp(error);return fromRow<T>(data);
  }
  async remove(table:string,id:string){
    if(!this.supabase){const current=this.store(table).get(id);if(!current)return;if(noDelete.has(table))fail("FINANCE_IMMUTABLE",`registro financiero no eliminable (${table})`);if(table==="journal_entries"){if(current.status!=="DRAFT")fail("FINANCE_IMMUTABLE","sólo se pueden descartar borradores");for(const[lineId,line]of this.store("journal_entry_lines"))if(line.journalEntryId===id)this.store("journal_entry_lines").delete(lineId);}if(table==="journal_entry_lines")this.assertEntryEditable(current.journalEntryId);if(table==="invoice_lines")this.assertInvoiceEditable(current.invoiceId);this.store(table).delete(id);return;}
    const{error}=await(this.supabase.from(table) as any).delete().eq("id",id);if(error)throw toHttp(error);
  }
  async removeWhere(table:string,filters:Filters){if(!this.supabase){for(const row of await this.list<Row>(table,filters))await this.remove(table,row.id);return;}const{error}=await this.apply((this.supabase.from(table) as any).delete(),filters);if(error)throw toHttp(error);}

  private hasUpdatedAt(table:string){return!["journal_entry_lines","accounting_rule_versions","accounting_events","tax_rule_versions","invoice_lines","billing_schedule_runs","tax_folio_authorizations","tax_folios","tax_document_events","rcv_imports","rcv_entries","approval_requests","vendor_payment_allocations","payment_allocations","payment_provider_events","payment_links","collection_activities","payment_promises","collection_reminders","bank_statement_imports","reconciliation_matches","budget_lines","cost_rates","period_close_tasks","period_snapshots","finance_events","finance_notifications","finance_audit_events","finance_idempotency_keys","finance_analysis_runs","tax_document_types"].includes(table);}
  private numberFor(table:string,item:Row){const year=new Date().getUTCFullYear();const next=(prefix:string)=>{const value=(this.counters.get(prefix)??0)+1;this.counters.set(prefix,value);return`${prefix}-${year}-${String(value).padStart(6,"0")}`;};
    if(table==="invoices"&&!item.invoiceNumber)item.invoiceNumber=next("INV");if(table==="payments"&&!item.paymentReference)item.paymentReference=next("PAG");if(table==="expenses"&&!item.expenseNumber)item.expenseNumber=next("GTO");if(table==="vendor_payments"&&!item.paymentNumber)item.paymentNumber=next("PPV");}
  /** Columnas generadas y CHECKs relevantes, idénticos a la migración. */
  private derive(table:string,row:Row){
    if(table==="invoices"){for(const key of ["netAmount","exemptAmount","taxAmount","totalAmount","amountPaid","amountCredited"])row[key]=r2(row[key]);row.balanceDue=r2(row.totalAmount-row.amountPaid-row.amountCredited);if(r2(row.netAmount+row.exemptAmount+row.taxAmount)!==row.totalAmount)violates("invoices_check: total_amount=net_amount+exempt_amount+tax_amount");if(row.balanceDue<0)violates("invoices_check: balance_due>=0");if([56,61].includes(row.documentTypeCode)&&!row.referenceInvoiceId)violates("invoices_check: nota sin referencia");}
    if(table==="payments"){row.feeAmount=r2(row.feeAmount);row.allocatedAmount=r2(row.allocatedAmount);row.refundedAmount=r2(row.refundedAmount);row.netAmount=r2(row.grossAmount-row.feeAmount);row.unappliedAmount=r2(row.grossAmount-row.allocatedAmount-row.refundedAmount);if(row.unappliedAmount<0)violates("payments_check: unapplied_amount>=0");if(row.feeAmount>row.grossAmount)violates("payments_check: fee<=gross");}
    if(table==="payables"){row.amountPaid=r2(row.amountPaid);row.balance=r2(row.amount-row.amountPaid);if(row.balance<0)violates("payables_check: balance>=0");}
    if(table==="journal_entry_lines"&&!((row.debit>0&&!row.credit)||(row.credit>0&&!row.debit)))violates("journal_entry_lines_check: debe XOR haber");
    if(table==="bank_transactions"&&r2(row.reconciledAmount)>r2(row.amount))violates("bank_transactions_check: reconciled<=amount");
    if(table==="expenses"&&r2(row.netAmount+row.exemptAmount+row.taxAmount)!==r2(row.totalAmount))violates("expenses_check: total");
  }
  private unique(table:string,row:Row,selfId?:string){for(const rule of uniques[table]??[]){if(rule.when&&!rule.when(row))continue;for(const[id,other]of this.store(table)){if(id===selfId||(rule.when&&!rule.when(other)))continue;if(rule.keys.every((key)=>(other[key]??null)===(row[key]??null)))duplicate(table,rule.keys);}}}
  private assertEntryEditable(entryId:string){const entry=this.store("journal_entries").get(entryId);if(!entry||!["DRAFT","PENDING_REVIEW"].includes(entry.status))fail("FINANCE_IMMUTABLE","el asiento está contabilizado; corrige con una reversa");}
  private assertInvoiceEditable(invoiceId:string){const invoice=this.store("invoices").get(invoiceId);if(!invoice||!["DRAFT","PENDING_APPROVAL"].includes(invoice.status))fail("FINANCE_IMMUTABLE","las líneas sólo cambian en borrador");}
  private guardInsert(table:string,row:Row){
    if(table==="journal_entry_lines")this.assertEntryEditable(row.journalEntryId);
    if(table==="invoice_lines")this.assertInvoiceEditable(row.invoiceId);
    if(table==="journal_entries"&&["POSTED","REVERSED"].includes(row.status))fail("FINANCE_UNBALANCED","el asiento necesita al menos dos líneas");
    if(table==="tax_rule_versions"&&row.active)this.taxOverlap(row);
  }
  private taxOverlap(row:Row){for(const other of this.store("tax_rule_versions").values()){if(other.id===row.id||!other.active||other.taxRuleId!==row.taxRuleId)continue;const aEnd=other.effectiveTo??"9999-12-31",bEnd=row.effectiveTo??"9999-12-31";if(other.effectiveFrom<=bEnd&&row.effectiveFrom<=aEnd)fail("FINANCE_TAX_OVERLAP","la vigencia se superpone con otra versión activa");}}
  private guardUpdate(table:string,old:Row,next:Row){
    const same=(keys:string[])=>keys.every((key)=>JSON.stringify(old[key]??null)===JSON.stringify(next[key]??null));
    if(table==="journal_entries"&&["POSTED","REVERSED"].includes(old.status)){if(!(old.status==="POSTED"&&next.status==="REVERSED"&&next.reversedById&&same(["entryNumber","entryDate","description","periodId","totalDebit","totalCredit","postedAt","postedBy"])))fail("FINANCE_IMMUTABLE","un asiento contabilizado no se edita; registra una reversa y un nuevo asiento");}
    if(table==="journal_entry_lines")this.assertEntryEditable(old.journalEntryId);
    if(table==="invoices"){if(["ISSUING","ISSUED","PARTIALLY_PAID","PAID","CREDITED","VOID"].includes(old.status)&&!same(["clientId","documentTypeCode","netAmount","exemptAmount","taxAmount","totalAmount","issueDate","clientSnapshot","referenceInvoiceId","currency"]))fail("FINANCE_IMMUTABLE","un documento en emisión o emitido no se edita; usa nota de crédito o débito");if(["CANCELLED","VOID"].includes(old.status)&&next.status!==old.status)fail("FINANCE_STATE","documento anulado");}
    if(table==="invoice_lines")this.assertInvoiceEditable(old.invoiceId);
    if(table==="payments"&&!["PENDING","PENDING_VERIFICATION"].includes(old.status)&&!same(["grossAmount","clientId","receivedAt","currency"]))fail("FINANCE_IMMUTABLE","un pago confirmado no cambia su monto ni cliente");
    if(table==="payment_allocations"&&(!same(["paymentId","invoiceId","amount"])||(old.reversedAt&&!same(["reversedAt"]))))fail("FINANCE_IMMUTABLE","aplicación inmutable");
    if(table==="tax_folios"){if(["USED","VOIDED"].includes(old.status)&&next.status!==old.status)fail("FINANCE_FOLIO","un folio usado o anulado nunca se reutiliza");if(!same(["folio","documentTypeCode","environment"]))fail("FINANCE_IMMUTABLE","identidad de folio inmutable");}
    if(table==="tax_documents"&&["ACCEPTED","ACCEPTED_WITH_REPAIRS","REJECTED"].includes(old.status)&&!same(["folio","totalAmount","xmlSignedSha256"]))fail("FINANCE_IMMUTABLE","un DTE resuelto por el SII es inmutable");
    if(table==="accounting_rule_versions"&&old.status!=="DRAFT"&&!same(["lines","version"]))fail("FINANCE_IMMUTABLE","una versión activa o retirada de regla es inmutable; crea una nueva versión");
    if(table==="finance_audit_events")fail("FINANCE_IMMUTABLE","la auditoría financiera es sólo de inserción");
    if(table==="period_snapshots")fail("FINANCE_IMMUTABLE","los snapshots de cierre son inmutables");
    if(table==="tax_rule_versions"&&next.active)this.taxOverlap(next);
    if(table==="tax_obligations"&&["FILED_EXTERNALLY","PAID"].includes(next.status)&&!(next.filedReference&&next.filedEvidencePath))violates("tax_obligations_check: evidencia obligatoria");
    if(table==="f29_preparations"){if(["FILED_EXTERNALLY","SUBMITTED","ACCEPTED"].includes(next.status)&&!(next.filedReference&&next.filedEvidencePath))violates("f29_check: evidencia de presentación obligatoria");if(next.status==="ACCEPTED"&&!next.acceptedEvidencePath)violates("f29_check: evidencia de aceptación obligatoria");}
    if(table==="period_close_tasks"&&next.status==="WAIVED"&&!String(next.notes??"").trim())violates("period_close_tasks_check: dispensa requiere nota");
  }

  // ------------------------------------------------------------------------------------------ procedimientos (RPC en Supabase, equivalentes en memoria)
  private async rpc<T>(name:string,args:Row):Promise<T>{const{data,error}=await(this.supabase as any).rpc(name,args);if(error)throw toHttp(error);return data as T;}
  async ensurePeriod(date:string):Promise<string>{
    if(this.supabase)return this.rpc<string>("finance_ensure_period",{p_date:date});
    const key=date.slice(0,7);const existing=[...this.store("accounting_periods").values()].find((row)=>row.periodKey===key);if(existing)return existing.id;
    const[year,month]=key.split("-").map(Number) as [number,number];const created=await this.create<Row>("accounting_periods",{periodKey:key,year,month,startsOn:`${key}-01`,endsOn:new Date(Date.UTC(year,month,0)).toISOString().slice(0,10),status:"OPEN",closedAt:null,closedBy:null,lockedAt:null,lockedBy:null,reopenedAt:null,reopenedBy:null,reopenReason:null,reopenCount:0});return created.id;
  }
  async createJournalEntry(header:Row,lines:Row[]):Promise<string>{
    if(this.supabase)return this.rpc<string>("finance_create_journal_entry",{p_header:header,p_lines:lines});
    if(header.sourceEventId){const existing=[...this.store("journal_entries").values()].find((row)=>row.sourceEventId===header.sourceEventId);if(existing)return existing.id;}
    const periodId=await this.ensurePeriod(header.entryDate);const pending=header.status==="PENDING_REVIEW";
    const entry=await this.create<Row>("journal_entries",{entryNumber:null,entryDate:header.entryDate,description:header.description,sourceType:header.sourceType??"MANUAL",sourceId:header.sourceId??null,sourceEventId:header.sourceEventId??null,ruleVersionId:header.ruleVersionId??null,status:"DRAFT",periodId,currency:"CLP",totalDebit:0,totalCredit:0,createdBy:header.createdBy??null,submittedBy:null,submittedAt:null,reviewedBy:null,reviewedAt:null,postedBy:null,postedAt:null,reversalOfId:null,reversedById:null,reversalReason:null});
    let n=0;for(const line of lines)await this.create("journal_entry_lines",{journalEntryId:entry.id,lineNumber:++n,accountId:line.accountId,debit:r2(line.debit),credit:r2(line.credit),currency:line.currency??"CLP",originalAmount:line.originalAmount??null,exchangeRate:line.exchangeRate??1,costCenterId:line.costCenterId??null,clientId:line.clientId??null,projectId:line.projectId??null,serviceId:line.serviceId??null,departmentCode:line.departmentCode??null,description:line.description??null});
    if(pending)await this.update("journal_entries",entry.id,{status:"PENDING_REVIEW",submittedAt:nowIso(),submittedBy:header.createdBy??null});
    return entry.id;
  }
  async postJournalEntry(entryId:string,actorId:string|null):Promise<Row>{
    if(this.supabase)return fromRow<Row>(await this.rpc<Row>("finance_post_journal_entry",{p_entry:entryId,p_actor:actorId}));
    const entry=this.store("journal_entries").get(entryId);if(!entry)fail("FINANCE_NOT_FOUND","Asiento no encontrado.");if(!["DRAFT","PENDING_REVIEW"].includes(entry!.status))fail("FINANCE_STATE",`el asiento ya está ${entry!.status}`);
    const lines=[...this.store("journal_entry_lines").values()].filter((line)=>line.journalEntryId===entryId);const debit=r2(lines.reduce((t,l)=>t+l.debit,0)),credit=r2(lines.reduce((t,l)=>t+l.credit,0));
    if(lines.length<2)fail("FINANCE_UNBALANCED","el asiento necesita al menos dos líneas");if(debit!==credit||debit===0)fail("FINANCE_UNBALANCED",`Debe ${debit} ≠ Haber ${credit}`);
    if(lines.some((line)=>{const account=this.store("chart_of_accounts").get(line.accountId);return!account||!account.allowsPosting||!account.active;}))fail("FINANCE_ACCOUNT","hay líneas en cuentas no imputables o inactivas");
    const period=this.store("accounting_periods").get(entry!.periodId)!;if(["CLOSED","LOCKED"].includes(period.status))fail("FINANCE_PERIOD_CLOSED",`el período ${period.periodKey} está ${period.status}`);if(entry!.entryDate<period.startsOn||entry!.entryDate>period.endsOn)fail("FINANCE_STATE","La fecha del asiento no pertenece al período");
    const seq=(this.counters.get("AST")??0)+1;this.counters.set("AST",seq);const now=nowIso();
    return this.update("journal_entries",entryId,{status:"POSTED",totalDebit:debit,totalCredit:credit,entryNumber:entry!.entryNumber??`AST-${entry!.entryDate.slice(0,4)}-${String(seq).padStart(6,"0")}`,postedAt:now,postedBy:actorId,reviewedBy:entry!.reviewedBy??actorId,reviewedAt:entry!.reviewedAt??now});
  }
  async reverseJournalEntry(entryId:string,actorId:string|null,reason:string,date:string):Promise<string>{
    if(this.supabase)return this.rpc<string>("finance_reverse_journal_entry",{p_entry:entryId,p_actor:actorId,p_reason:reason,p_date:date});
    if(!reason.trim())fail("FINANCE_REASON","la reversa requiere motivo");const entry=this.store("journal_entries").get(entryId);if(!entry)fail("FINANCE_NOT_FOUND","Asiento no encontrado.");if(entry!.status!=="POSTED")fail("FINANCE_STATE","sólo se revierten asientos contabilizados");
    if([...this.store("journal_entries").values()].some((row)=>row.reversalOfId===entryId))duplicate("journal_entries",["reversalOfId"]);
    const lines=[...this.store("journal_entry_lines").values()].filter((line)=>line.journalEntryId===entryId).sort((a,b)=>a.lineNumber-b.lineNumber);
    const newId=await this.createJournalEntry({entryDate:date,description:`Reversa de ${entry!.entryNumber}: ${reason}`,sourceType:"REVERSAL",sourceId:entryId,createdBy:actorId},lines.map((line)=>({...line,debit:line.credit,credit:line.debit,description:`${line.description??""} (reversa)`})));
    await this.update("journal_entries",newId,{reversalOfId:entryId,reversalReason:reason});
    await this.postJournalEntry(newId,actorId);await this.update("journal_entries",entryId,{status:"REVERSED",reversedById:newId,reversalReason:reason});return newId;
  }
  async accountBalances(from:string,to:string):Promise<Array<{accountId:string;opening:number;debit:number;credit:number}>>{
    if(this.supabase)return((await this.rpc<Row[]>("finance_account_balances",{p_from:from,p_to:to}))??[]).map((row)=>({accountId:row.account_id,opening:Number(row.opening),debit:Number(row.debit),credit:Number(row.credit)}));
    const entries=new Map([...this.store("journal_entries").values()].filter((e)=>["POSTED","REVERSED"].includes(e.status)&&e.entryDate<=to).map((e)=>[e.id,e]));const totals=new Map<string,{accountId:string;opening:number;debit:number;credit:number}>();
    for(const line of this.store("journal_entry_lines").values()){const entry=entries.get(line.journalEntryId);if(!entry)continue;const item=totals.get(line.accountId)??{accountId:line.accountId,opening:0,debit:0,credit:0};if(entry.entryDate<from)item.opening=r2(item.opening+line.debit-line.credit);else{item.debit=r2(item.debit+line.debit);item.credit=r2(item.credit+line.credit);}totals.set(line.accountId,item);}
    return[...totals.values()];
  }
  async reserveFolio(type:number,environment:string,taxDocumentId:string):Promise<number>{
    if(this.supabase)return Number(await this.rpc<number>("finance_reserve_folio",{p_type:type,p_environment:environment,p_tax_document:taxDocumentId}));
    const existing=[...this.store("tax_folios").values()].find((f)=>f.taxDocumentId===taxDocumentId&&["RESERVED","USED"].includes(f.status));if(existing)return existing.folio;
    const active=new Set([...this.store("tax_folio_authorizations").values()].filter((a)=>a.status==="ACTIVE").map((a)=>a.id));
    const next=[...this.store("tax_folios").values()].filter((f)=>f.environment===environment&&f.documentTypeCode===type&&f.status==="AVAILABLE"&&active.has(f.authorizationId)).sort((a,b)=>a.folio-b.folio)[0];
    if(!next)fail("FINANCE_NO_FOLIOS",`no hay folios autorizados disponibles para el tipo ${type} en ${environment}`);
    await this.update("tax_folios",next!.id,{status:"RESERVED",taxDocumentId,reservedAt:nowIso()});await this.update("tax_documents",taxDocumentId,{folio:next!.folio});return next!.folio;
  }
  async refreshInvoiceBalance(invoiceId:string){
    if(this.supabase){await this.rpc("finance_refresh_invoice_balance",{p_invoice:invoiceId});return;}
    const paid=r2([...this.store("payment_allocations").values()].filter((a)=>a.invoiceId===invoiceId&&!a.reversedAt).reduce((t,a)=>t+a.amount,0));const invoice=this.store("invoices").get(invoiceId)!;const remaining=r2(invoice.totalAmount-paid-invoice.amountCredited);
    const status=["ISSUED","PARTIALLY_PAID","PAID","CREDITED"].includes(invoice.status)?(remaining<=0&&paid===0&&invoice.amountCredited>0?"CREDITED":remaining<=0&&invoice.totalAmount>0?"PAID":paid>0?"PARTIALLY_PAID":"ISSUED"):invoice.status;
    await this.update("invoices",invoiceId,{amountPaid:paid,status});
  }
  async allocatePayment(paymentId:string,invoiceId:string,amount:number,actorId:string|null):Promise<string>{
    if(this.supabase)return this.rpc<string>("finance_allocate_payment",{p_payment:paymentId,p_invoice:invoiceId,p_amount:amount,p_actor:actorId});
    if(!(amount>0))fail("FINANCE_AMOUNT","el monto a aplicar debe ser positivo");const payment=this.store("payments").get(paymentId),invoice=this.store("invoices").get(invoiceId);if(!payment||!invoice)fail("FINANCE_NOT_FOUND","Pago o factura no encontrado.");
    if(!["CONFIRMED","PARTIALLY_REFUNDED"].includes(payment!.status))fail("FINANCE_STATE",`sólo se aplican pagos confirmados (estado ${payment!.status})`);if(!["ISSUED","PARTIALLY_PAID"].includes(invoice!.status))fail("FINANCE_STATE",`la factura no está emitida o ya está pagada (estado ${invoice!.status})`);
    if(invoice!.documentTypeCode===61)fail("FINANCE_STATE","una nota de crédito no recibe pagos");if(payment!.clientId!==invoice!.clientId)fail("FINANCE_CLIENT","el pago y la factura pertenecen a clientes distintos");if(payment!.currency!==invoice!.currency)fail("FINANCE_CURRENCY","monedas distintas");
    if(amount>payment!.unappliedAmount)fail("FINANCE_AMOUNT",`excede el saldo sin aplicar del pago (${payment!.unappliedAmount})`);if(amount>invoice!.balanceDue)fail("FINANCE_AMOUNT",`excede el saldo de la factura (${invoice!.balanceDue})`);
    const allocation=await this.create<Row>("payment_allocations",{paymentId,invoiceId,amount:r2(amount),allocatedBy:actorId,allocatedAt:nowIso(),reversedAt:null,reversedBy:null,reversalReason:null});
    await this.update("payments",paymentId,{allocatedAmount:r2(payment!.allocatedAmount+amount)});await this.refreshInvoiceBalance(invoiceId);return allocation.id;
  }
  async reverseAllocation(allocationId:string,actorId:string|null,reason:string){
    if(this.supabase){await this.rpc("finance_reverse_allocation",{p_allocation:allocationId,p_actor:actorId,p_reason:reason});return;}
    if(!reason.trim())fail("FINANCE_REASON","motivo obligatorio");const allocation=this.store("payment_allocations").get(allocationId);if(!allocation)fail("FINANCE_NOT_FOUND","Aplicación no encontrada.");if(allocation!.reversedAt)fail("FINANCE_STATE","la aplicación ya fue revertida");
    await this.update("payment_allocations",allocationId,{reversedAt:nowIso(),reversedBy:actorId,reversalReason:reason});const payment=this.store("payments").get(allocation!.paymentId)!;await this.update("payments",payment.id,{allocatedAmount:r2(payment.allocatedAmount-allocation!.amount)});await this.refreshInvoiceBalance(allocation!.invoiceId);
  }
  async refreshBankTransaction(transactionId:string){
    if(this.supabase){await this.rpc("finance_refresh_bank_transaction",{p_tx:transactionId});return;}
    const tx=this.store("bank_transactions").get(transactionId)!;const total=r2([...this.store("reconciliation_matches").values()].filter((m)=>m.bankTransactionId===transactionId&&m.status==="ACTIVE").reduce((t,m)=>t+m.amount,0));
    if(total>tx.amount)fail("FINANCE_AMOUNT","la conciliación excede el monto del movimiento");
    await this.update("bank_transactions",transactionId,{reconciledAmount:total,reconciliationStatus:tx.reconciliationStatus==="IGNORED"&&total===0?"IGNORED":total===0?"UNRECONCILED":total<tx.amount?"PARTIALLY_RECONCILED":"RECONCILED"});
  }
  /** En Supabase el trigger recalcula el movimiento; en memoria se replica tras insertar/deshacer. */
  async afterMatchChange(transactionId:string){if(!this.supabase)await this.refreshBankTransaction(transactionId);}
  async closePeriod(periodId:string,actorId:string|null,snapshot:Row):Promise<{snapshotId:string;version:number}>{
    if(this.supabase)return this.rpc("finance_close_period",{p_period:periodId,p_actor:actorId,p_snapshot:snapshot});
    const period=this.store("accounting_periods").get(periodId);if(!period)fail("FINANCE_NOT_FOUND","Período no encontrado.");if(!["OPEN","CLOSING"].includes(period!.status))fail("FINANCE_STATE",`el período ya está ${period!.status}`);
    const drafts=[...this.store("journal_entries").values()].filter((e)=>e.periodId===periodId&&["DRAFT","PENDING_REVIEW"].includes(e.status)).length;if(drafts)fail("FINANCE_CLOSE_BLOCKED",`existen ${drafts} asientos sin contabilizar en el período`);
    const version=Math.max(0,...[...this.store("period_snapshots").values()].filter((s)=>s.periodId===periodId).map((s)=>s.version))+1;
    const created=await this.create<Row>("period_snapshots",{periodId,version,trialBalance:snapshot.trialBalance,incomeStatement:snapshot.incomeStatement,balanceSheet:snapshot.balanceSheet,sha256:snapshot.sha256,createdBy:actorId});
    const now=nowIso();await this.update("accounting_periods",periodId,{status:"CLOSED",closedAt:now,closedBy:actorId});const run=[...this.store("period_close_runs").values()].find((r)=>r.periodId===periodId);if(run)await this.update("period_close_runs",run.id,{status:"CLOSED",closedBy:actorId,closedAt:now});
    return{snapshotId:created.id,version};
  }

  // ------------------------------------------------------------------------------------------ configuración
  async settings():Promise<typeof defaultSettings&Row>{if(!this.supabase)return structuredClone(this.store("finance_settings").get("true")!) as typeof defaultSettings&Row;const row=await this.get<Row>("finance_settings",true as unknown as string);return{...defaultSettings,...row};}
  async updateSettings(patch:Row){if(!this.supabase){const current=this.store("finance_settings").get("true")!;const next={...current,...patch,updatedAt:nowIso()};this.store("finance_settings").set("true",next);return structuredClone(next);}const{data,error}=await(this.supabase.from("finance_settings") as any).update(toRow("finance_settings",{...patch,updatedAt:nowIso()})).eq("id",true).select("*").single();if(error)throw toHttp(error);return{...defaultSettings,...fromRow<Row>(data)};}

  // ------------------------------------------------------------------------------------------ eventos, auditoría, notificaciones, idempotencia, archivos
  async audit(actor:FinanceActor,action:string,entityType:string,entityId:string|null,summary:string,metadata:Row={}){return this.create("finance_audit_events",{actorId:actor.userId,actorRole:actor.role||null,action,entityType,entityId,summary,metadata,occurredAt:nowIso()});}
  async event(input:{aggregateType:string;aggregateId:string;eventType:string;actorId:string|null;clientId?:string|null;projectId?:string|null;title:string;payload?:Row}){return this.create("finance_events",{aggregateType:input.aggregateType,aggregateId:input.aggregateId,eventType:input.eventType,actorId:input.actorId,clientId:input.clientId??null,projectId:input.projectId??null,title:input.title,payload:input.payload??{},occurredAt:nowIso()});}
  async notify(input:{eventKey:string;type:string;title:string;body?:string|null;entityType:string;entityId:string;href?:string|null;severity?:"INFO"|"WARNING"|"CRITICAL";userId?:string|null;audienceRole?:string|null}){
    try{return await this.create("finance_notifications",{eventKey:input.eventKey,userId:input.userId??null,audienceRole:input.userId?null:(input.audienceRole??"FINANZAS"),type:input.type,title:input.title,body:input.body??null,entityType:input.entityType,entityId:input.entityId,href:input.href??null,severity:input.severity??"INFO",readAt:null});}
    catch(error){if((error as {status?:number})?.status===409||(error as {code?:string})?.code==="23505"||/duplicate|Registro duplicado/i.test(String((error as Error)?.message)))return null;throw error;}
  }
  async claimIdempotency(key:string,operation:string,resourceId:string):Promise<string|null>{
    const existing=await this.findOne<Row>("finance_idempotency_keys",{idempotencyKey:key,operation});if(existing)return existing.resourceId;
    try{await this.create("finance_idempotency_keys",{idempotencyKey:key,operation,resourceId});return null;}catch{const again=await this.findOne<Row>("finance_idempotency_keys",{idempotencyKey:key,operation});return again?.resourceId??null;}
  }
  async saveFile(bucket:string,path:string,bytes:Buffer,mime:string){if(!this.supabase){this.files.set(`${bucket}/${path}`,{bytes,mime});return path;}const{error}=await this.supabase.storage.from(bucket).upload(path,bytes,{contentType:mime,upsert:false});if(error)throw error;return path;}
  async readFile(bucket:string,path:string):Promise<Buffer|null>{if(!this.supabase)return this.files.get(`${bucket}/${path}`)?.bytes??null;const{data,error}=await this.supabase.storage.from(bucket).download(path);if(error||!data)return null;return Buffer.from(await data.arrayBuffer());}
  async signedUrl(bucket:string,path:string,seconds=300){if(!this.supabase)return null;const{data,error}=await this.supabase.storage.from(bucket).createSignedUrl(path,seconds);if(error)throw error;return data.signedUrl;}

  // ------------------------------------------------------------------------------------------ datos base del modo memoria (espejo de la migración)
  private seedMemory(){
    const now=nowIso();this.store("finance_settings").set("true",{id:true,...defaultSettings,updatedAt:now});
    const byCode=new Map<string,string>();
    for(const[code,name,accountType,normalBalance,statementSection,allowsPosting,isCash]of seedAccounts){const id=randomUUID();byCode.set(code,id);this.store("chart_of_accounts").set(id,{id,code,name,parentId:null,accountType,normalBalance,statementSection,allowsPosting,isCash,currency:null,active:true,createdAt:now,updatedAt:now});}
    for(const account of this.store("chart_of_accounts").values()){const parent=account.code.includes(".")?account.code.replace(/\.[0-9]+$/,""):null;account.parentId=parent?byCode.get(parent)??null:null;}
    for(const[code,name]of seedCostCenters){const id=randomUUID();this.store("cost_centers").set(id,{id,code,name,description:null,active:true,createdAt:now,updatedAt:now});}
    for(const[code,name,eventType,filters,lines]of seedRules){const id=randomUUID();this.store("accounting_rules").set(id,{id,code,name,eventType,description:"Propuesta base: revisar cuentas y activar antes de generar asientos.",filters,autoPost:false,active:false,createdBy:null,createdAt:now,updatedAt:now});const versionId=randomUUID();this.store("accounting_rule_versions").set(versionId,{id:versionId,ruleId:id,version:1,status:"DRAFT",lines,effectiveFrom:null,notes:"Versión propuesta; requiere revisión de contabilidad.",createdBy:null,activatedBy:null,activatedAt:null,createdAt:now});}
    for(const rule of seedTaxRules){const id=randomUUID();this.store("tax_rules").set(id,{id,code:rule.code,taxType:rule.taxType,name:rule.name,description:rule.description,active:true,createdAt:now,updatedAt:now});if(rule.version){const versionId=randomUUID();this.store("tax_rule_versions").set(versionId,{id:versionId,taxRuleId:id,...rule.version,effectiveTo:null,active:true,createdBy:null,createdAt:now});}}
    for(const[code,name,category,sign]of seedDocumentTypes)this.store("tax_document_types").set(String(code),{code,name,category,sign,enabledForIssue:false,certified:false,notes:null});
    for(const[code,name,account]of seedExpenseCategories){const id=randomUUID();this.store("expense_categories").set(id,{id,code,name,expenseAccountId:byCode.get(account),defaultCostCenterId:null,active:true,createdAt:now,updatedAt:now});}
    for(const[offsetDays,subjectTemplate,bodyTemplate]of seedReminderRules){const id=randomUUID();this.store("collection_reminder_rules").set(id,{id,offsetDays,channel:"EMAIL",subjectTemplate,bodyTemplate,active:false,createdAt:now,updatedAt:now});}
    for(const scenario of seedForecastScenarios){const id=randomUUID();this.store("forecast_scenarios").set(id,{id,...scenario,active:true,createdAt:now,updatedAt:now});}
    for(const[code,label,checkType,autoCheckKey,blocking,sortOrder]of seedChecklist){const id=randomUUID();this.store("close_checklist_items").set(id,{id,code,label,description:null,checkType,autoCheckKey,blocking,sortOrder,active:true,createdAt:now,updatedAt:now});}
  }
}

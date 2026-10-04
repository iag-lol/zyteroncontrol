import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { AccountingEvent, AccountingPeriod, AccountingRule, AccountingRuleVersion, AmountKey, BalanceSheet, IncomeStatement, JournalEntry, JournalLine, LedgerAccount, LedgerMovement, RuleLineTemplate, StatementLine, TrialBalance } from "@zyteron/contracts";
import { FinanceContext } from "./finance.core.js";
import type { PageQuery } from "./finance.repository.js";
import { type FinanceActor, fill, guarded, isoDate, nowIso, oneOf, optionalText, optionalUuid, r2, requiredText, type Row, sum, todayCl } from "./finance.util.js";

export interface JournalLineInput { accountId?:string; accountCode?:string; debit?:number; credit?:number; description?:string|null; costCenterId?:string|null; clientId?:string|null; projectId?:string|null; serviceId?:string|null; departmentCode?:string|null; }
const accountTypes=["ASSET","LIABILITY","EQUITY","REVENUE","EXPENSE"] as const;
const sections=["CURRENT_ASSET","NON_CURRENT_ASSET","CURRENT_LIABILITY","NON_CURRENT_LIABILITY","EQUITY","OPERATING_REVENUE","OTHER_REVENUE","COST_OF_SALES","OPERATING_EXPENSE","FINANCIAL_EXPENSE","OTHER_EXPENSE"] as const;

// =========================================================================================== Libro diario y plan de cuentas
@Injectable()
export class LedgerService {
  constructor(private readonly ctx:FinanceContext){}
  private get repo(){return this.ctx.repo;}

  // ---------------------------------------------------------------------------------- plan de cuentas
  async accounts(withBalances=false,asOf=todayCl()){const accounts=await this.ctx.accounts();if(!withBalances)return accounts;const balances=new Map((await this.repo.accountBalances("1900-01-01",asOf)).map((b)=>[b.accountId,r2(b.opening+b.debit-b.credit)]));return accounts.map((account)=>({...account,balance:balances.get(account.id)??0}));}
  async createAccount(body:Row,actor:FinanceActor){
    this.ctx.requireAny(actor,"finance.settings.manage","journal.review");const code=requiredText(body.code,"Código",40);if(!/^[0-9]+(\.[0-9]+)*$/.test(code))throw new BadRequestException("El código debe tener formato numérico jerárquico (ej. 5.2.05).");
    const accounts=await this.ctx.accounts();const parentCode=code.includes(".")?code.replace(/\.[0-9]+$/,""):null;const parent=parentCode?accounts.find((a)=>a.code===parentCode):undefined;if(parentCode&&!parent)throw new BadRequestException(`La cuenta padre ${parentCode} no existe.`);
    const accountType=oneOf(body.accountType??parent?.accountType,accountTypes,"Tipo de cuenta");if(parent&&parent.accountType!==accountType)throw new BadRequestException("La cuenta hija debe tener el mismo tipo que su cuenta padre.");
    const created=await guarded(()=>this.repo.create<LedgerAccount>("chart_of_accounts",{code,name:requiredText(body.name,"Nombre",160),parentId:parent?.id??null,accountType,normalBalance:body.normalBalance==="CREDIT"||body.normalBalance==="DEBIT"?body.normalBalance:["ASSET","EXPENSE"].includes(accountType)?"DEBIT":"CREDIT",statementSection:body.statementSection?oneOf(body.statementSection,sections,"Sección"):parent?.statementSection??null,allowsPosting:body.allowsPosting!==false,isCash:Boolean(body.isCash),currency:optionalText(body.currency,3),active:true}));
    if(parent?.allowsPosting&&!this.repo.configured()){const used=await this.repo.count("journal_entry_lines",{accountId:parent.id});if(!used)await this.repo.update("chart_of_accounts",parent.id,{allowsPosting:false});}
    this.ctx.invalidateAccounts();await this.repo.audit(actor,"ACCOUNT_CREATED","ACCOUNT",created.id,`Cuenta ${code} ${created.name} creada`);return created;
  }
  async updateAccount(id:string,body:Row,actor:FinanceActor){
    this.ctx.requireAny(actor,"finance.settings.manage","journal.review");const current=await this.ctx.must<LedgerAccount>("chart_of_accounts",id,"Cuenta");const patch:Row={};
    if(body.name!==undefined)patch.name=requiredText(body.name,"Nombre",160);if(body.statementSection!==undefined)patch.statementSection=body.statementSection?oneOf(body.statementSection,sections,"Sección"):null;if(body.isCash!==undefined)patch.isCash=Boolean(body.isCash);
    if(body.active!==undefined){if(!body.active){const balance=(await this.repo.accountBalances("1900-01-01",todayCl())).find((b)=>b.accountId===id);if(balance&&r2(balance.opening+balance.debit-balance.credit)!==0)throw new ConflictException("No se puede desactivar una cuenta con saldo.");}patch.active=Boolean(body.active);}
    if(body.allowsPosting!==undefined){if(body.allowsPosting&&(await this.ctx.accounts()).some((a)=>a.parentId===id))throw new ConflictException("Una cuenta con subcuentas es agrupadora y no imputable.");patch.allowsPosting=Boolean(body.allowsPosting);}
    const updated=await guarded(()=>this.repo.update<LedgerAccount>("chart_of_accounts",id,patch));this.ctx.invalidateAccounts();await this.repo.audit(actor,"ACCOUNT_UPDATED","ACCOUNT",id,`Cuenta ${current.code} actualizada`,{before:current,patch});return updated;
  }
  costCenters(){return this.repo.list("cost_centers",{},{order:"code",ascending:true});}
  async saveCostCenter(id:string|null,body:Row,actor:FinanceActor){this.ctx.requireAny(actor,"finance.settings.manage","journal.review");const data:Row={name:requiredText(body.name,"Nombre",120),description:optionalText(body.description),active:body.active!==false};const saved=id?await this.repo.update("cost_centers",id,data):await guarded(()=>this.repo.create("cost_centers",{...data,code:requiredText(body.code,"Código",20).toUpperCase()}));await this.repo.audit(actor,id?"COST_CENTER_UPDATED":"COST_CENTER_CREATED","COST_CENTER",(saved as Row).id,`Centro de costo ${(saved as Row).code}`);return saved;}

  // ---------------------------------------------------------------------------------- períodos
  periods(){return this.repo.list<AccountingPeriod>("accounting_periods",{},{order:"periodKey",ascending:false});}
  async period(key:string){await this.repo.ensurePeriod(`${key}-01`);return(await this.repo.findOne<AccountingPeriod>("accounting_periods",{periodKey:key}))!;}
  async reopenPeriod(id:string,reason:unknown,actor:FinanceActor){
    this.ctx.require(actor,"period.reopen");const text=requiredText(reason,"Motivo de reapertura",500);const period=await this.ctx.must<AccountingPeriod>("accounting_periods",id,"Período");
    if(period.status==="OPEN")throw new ConflictException("El período ya está abierto.");if(period.status==="LOCKED"&&actor.role!=="GERENTE_GENERAL")throw new ForbiddenException("Un período bloqueado sólo lo reabre Gerencia.");
    const updated=await this.repo.update<AccountingPeriod>("accounting_periods",id,{status:"OPEN",reopenedAt:nowIso(),reopenedBy:actor.userId,reopenReason:text,reopenCount:(period.reopenCount??0)+1});
    const run=await this.repo.findOne<Row>("period_close_runs",{periodId:id});if(run)await this.repo.update("period_close_runs",run.id,{status:"IN_PROGRESS",closedAt:null,closedBy:null});
    await this.repo.audit(actor,"PERIOD_REOPENED","ACCOUNTING_PERIOD",id,`Período ${period.periodKey} reabierto: ${text}`,{previousStatus:period.status});
    await this.repo.notify({eventKey:`period-reopened:${id}:${updated.reopenCount}`,type:"ACCOUNTING_PERIOD_REOPENED",title:`Período ${period.periodKey} reabierto`,body:text,entityType:"ACCOUNTING_PERIOD",entityId:id,href:"/finance/closing",severity:"WARNING",audienceRole:"GERENTE_GENERAL"});return updated;
  }
  async lockPeriod(id:string,actor:FinanceActor){this.ctx.require(actor,"period.close");const period=await this.ctx.must<AccountingPeriod>("accounting_periods",id,"Período");if(period.status!=="CLOSED")throw new ConflictException("Sólo se bloquea un período cerrado.");const updated=await this.repo.update("accounting_periods",id,{status:"LOCKED",lockedAt:nowIso(),lockedBy:actor.userId});await this.repo.audit(actor,"PERIOD_LOCKED","ACCOUNTING_PERIOD",id,`Período ${period.periodKey} bloqueado`);return updated;}

  // ---------------------------------------------------------------------------------- asientos
  async entries(q:PageQuery&{status?:string;from?:string;to?:string;sourceType?:string}){return this.repo.page<JournalEntry>("journal_entries",{status:q.status||undefined,sourceType:q.sourceType||undefined,entryDate:q.from||q.to?{gte:q.from||undefined,lte:q.to||undefined}:undefined},{...q,order:"entryDate",searchColumns:["entryNumber","description"]});}
  async entry(id:string):Promise<JournalEntry>{const entry=await this.ctx.must<JournalEntry>("journal_entries",id,"Asiento");const accounts=await this.ctx.accountMap();const lines=(await this.repo.list<JournalLine>("journal_entry_lines",{journalEntryId:id},{order:"lineNumber",ascending:true})).map((line)=>({...line,accountCode:accounts.get(line.accountId)?.code??null,accountName:accounts.get(line.accountId)?.name??null}));return{...entry,lines};}
  /** Valida partida doble antes de llegar a la base (que vuelve a validar al contabilizar). */
  async normalizeLines(input:unknown){
    if(!Array.isArray(input)||input.length<2)throw new UnprocessableEntityException("El asiento necesita al menos dos líneas.");const accounts=await this.ctx.accounts();
    const lines=input.map((raw:JournalLineInput,index)=>{const account=raw.accountId?accounts.find((a)=>a.id===raw.accountId):accounts.find((a)=>a.code===raw.accountCode);if(!account)throw new UnprocessableEntityException(`Línea ${index+1}: cuenta inexistente.`);if(!account.allowsPosting||!account.active)throw new UnprocessableEntityException(`Línea ${index+1}: la cuenta ${account.code} no es imputable o está inactiva.`);
      const debit=r2(raw.debit??0),credit=r2(raw.credit??0);if(debit<0||credit<0)throw new UnprocessableEntityException(`Línea ${index+1}: montos negativos no permitidos.`);if((debit>0)===(credit>0))throw new UnprocessableEntityException(`Línea ${index+1}: registra Debe o Haber, no ambos ni ninguno.`);
      return{accountId:account.id,debit,credit,description:optionalText(raw.description,300),costCenterId:optionalUuid(raw.costCenterId,"Centro de costo"),clientId:optionalUuid(raw.clientId,"Cliente"),projectId:optionalUuid(raw.projectId,"Proyecto"),serviceId:optionalUuid(raw.serviceId,"Servicio"),departmentCode:optionalText(raw.departmentCode,40)};});
    const debit=sum(lines.map((l)=>l.debit)),credit=sum(lines.map((l)=>l.credit));return{lines,debit,credit,balanced:debit===credit&&debit>0};
  }
  async createEntry(body:Row,actor:FinanceActor,source:{sourceType?:string;sourceId?:string|null;sourceEventId?:string|null;ruleVersionId?:string|null}={}){
    if(!source.sourceEventId)this.ctx.require(actor,"journal.create");const entryDate=isoDate(body.entryDate,"Fecha del asiento");const{lines}=await this.normalizeLines(body.lines);
    const id=await guarded(()=>this.repo.createJournalEntry({entryDate,description:requiredText(body.description,"Glosa",500),sourceType:source.sourceType??(body.sourceType==="ADJUSTMENT"?"ADJUSTMENT":"MANUAL"),sourceId:source.sourceId??null,sourceEventId:source.sourceEventId??null,ruleVersionId:source.ruleVersionId??null,createdBy:actor.userId,status:body.submit?"PENDING_REVIEW":"DRAFT"},lines));
    await this.repo.audit(actor,"JOURNAL_DRAFT_CREATED","JOURNAL_ENTRY",id,`Borrador de asiento: ${String(body.description).slice(0,120)}`,{sourceType:source.sourceType??"MANUAL"});return this.entry(id);
  }
  async updateEntry(id:string,body:Row,actor:FinanceActor){
    this.ctx.require(actor,"journal.create");const entry=await this.entry(id);if(!["DRAFT","PENDING_REVIEW"].includes(entry.status))throw new ConflictException("Un asiento contabilizado no se edita; registra una reversa y un nuevo asiento.");
    const patch:Row={};if(body.description!==undefined)patch.description=requiredText(body.description,"Glosa",500);if(body.entryDate!==undefined){patch.entryDate=isoDate(body.entryDate,"Fecha del asiento");patch.periodId=await this.repo.ensurePeriod(patch.entryDate);}
    if(body.lines!==undefined){const{lines}=await this.normalizeLines(body.lines);await guarded(()=>this.repo.removeWhere("journal_entry_lines",{journalEntryId:id}));let n=0;for(const line of lines)await guarded(()=>this.repo.create("journal_entry_lines",{...line,journalEntryId:id,lineNumber:++n,currency:"CLP",exchangeRate:1,originalAmount:null}));}
    if(Object.keys(patch).length)await guarded(()=>this.repo.update("journal_entries",id,patch));await this.repo.audit(actor,"JOURNAL_DRAFT_UPDATED","JOURNAL_ENTRY",id,`Borrador ${id.slice(0,8)} actualizado`,{before:{description:entry.description,lines:entry.lines?.map((l)=>({account:l.accountCode,debit:l.debit,credit:l.credit}))}});return this.entry(id);
  }
  async submit(id:string,actor:FinanceActor){this.ctx.require(actor,"journal.create");const entry=await this.ctx.must<JournalEntry>("journal_entries",id,"Asiento");if(entry.status!=="DRAFT")throw new ConflictException("Sólo se envía a revisión un borrador.");await this.repo.update("journal_entries",id,{status:"PENDING_REVIEW",submittedBy:actor.userId,submittedAt:nowIso()});await this.repo.audit(actor,"JOURNAL_SUBMITTED","JOURNAL_ENTRY",id,"Asiento enviado a revisión");return this.entry(id);}
  /** Contabilizar es siempre una acción humana con permiso journal.post (ni reglas ni el copiloto contabilizan). */
  async post(id:string,actor:FinanceActor){
    this.ctx.require(actor,"journal.post");if(!actor.userId)throw new ForbiddenException("Contabilizar requiere un usuario identificado.");const entry=await this.entry(id);const debit=sum(entry.lines!.map((l)=>l.debit)),credit=sum(entry.lines!.map((l)=>l.credit));
    if(debit!==credit||debit===0)throw new UnprocessableEntityException(`TOTAL DEBE (${debit}) ≠ TOTAL HABER (${credit}): el asiento no se contabiliza.`);
    const posted=await guarded(()=>this.repo.postJournalEntry(id,actor.userId));await this.repo.audit(actor,"JOURNAL_POSTED","JOURNAL_ENTRY",id,`Asiento ${posted.entryNumber} contabilizado`,{totalDebit:debit,totalCredit:credit});
    await this.repo.event({aggregateType:"JOURNAL_ENTRY",aggregateId:id,eventType:"JOURNAL_POSTED",actorId:actor.userId,title:`Asiento ${posted.entryNumber} contabilizado`,payload:{totalDebit:debit}});
    const event=await this.repo.findOne<Row>("accounting_events",{journalEntryId:id});if(event)await this.repo.update("accounting_events",event.id,{message:`Contabilizado como ${posted.entryNumber}`});return this.entry(id);
  }
  async reverse(id:string,body:Row,actor:FinanceActor){
    this.ctx.require(actor,"journal.reverse");if(!actor.userId)throw new ForbiddenException("Revertir requiere un usuario identificado.");const reason=requiredText(body.reason,"Motivo de la reversa",500);const date=body.date?isoDate(body.date,"Fecha de la reversa"):todayCl();
    const entry=await this.ctx.must<JournalEntry>("journal_entries",id,"Asiento");const reversalId=await guarded(()=>this.repo.reverseJournalEntry(id,actor.userId,reason,date));const reversal=await this.entry(reversalId);
    await this.repo.audit(actor,"JOURNAL_REVERSED","JOURNAL_ENTRY",id,`Asiento ${entry.entryNumber} revertido por ${reversal.entryNumber}: ${reason}`,{reversalId});return{original:await this.entry(id),reversal};
  }
  async discard(id:string,actor:FinanceActor){this.ctx.require(actor,"journal.create");const entry=await this.ctx.must<JournalEntry>("journal_entries",id,"Asiento");if(entry.status!=="DRAFT")throw new ConflictException("Sólo se descartan borradores; un asiento contabilizado se revierte.");await guarded(()=>this.repo.remove("journal_entries",id));const event=await this.repo.findOne<Row>("accounting_events",{journalEntryId:id});if(event)await this.repo.update("accounting_events",event.id,{status:"SKIPPED",journalEntryId:null,message:"Borrador descartado manualmente"});await this.repo.audit(actor,"JOURNAL_DRAFT_DISCARDED","JOURNAL_ENTRY",id,`Borrador descartado: ${entry.description}`,{entry});return{discarded:true};}

  // ---------------------------------------------------------------------------------- libros
  async journalBook(from:string,to:string){const entries=(await this.repo.list<JournalEntry>("journal_entries",{status:["POSTED","REVERSED"],entryDate:{gte:from,lte:to}},{order:"entryDate",ascending:true}));const ids=entries.map((e)=>e.id);const accounts=await this.ctx.accountMap();const lines=ids.length?await this.repo.list<JournalLine>("journal_entry_lines",{journalEntryId:ids},{order:"lineNumber",ascending:true}):[];
    const byEntry=new Map<string,JournalLine[]>();for(const line of lines){const list=byEntry.get(line.journalEntryId)??[];list.push({...line,accountCode:accounts.get(line.accountId)?.code??null,accountName:accounts.get(line.accountId)?.name??null});byEntry.set(line.journalEntryId,list);}
    const items=entries.sort((a,b)=>a.entryDate.localeCompare(b.entryDate)||String(a.entryNumber).localeCompare(String(b.entryNumber))).map((entry)=>({...entry,lines:byEntry.get(entry.id)??[]}));return{from,to,entries:items,totalDebit:sum(items.map((e)=>e.totalDebit)),totalCredit:sum(items.map((e)=>e.totalCredit))};}
  async ledger(accountId:string,from:string,to:string){
    const account=await this.ctx.must<LedgerAccount>("chart_of_accounts",accountId,"Cuenta");const accounts=await this.ctx.accounts();const ids=[accountId,...this.descendants(accounts,accountId)];
    const balances=(await this.repo.accountBalances(from,to)).filter((b)=>ids.includes(b.accountId));const opening=sum(balances.map((b)=>b.opening));
    const lines=await this.repo.list<JournalLine>("journal_entry_lines",{accountId:ids});const entries=new Map((lines.length?await this.repo.list<JournalEntry>("journal_entries",{id:[...new Set(lines.map((l)=>l.journalEntryId))],status:["POSTED","REVERSED"],entryDate:{gte:from,lte:to}}):[]).map((e)=>[e.id,e]));
    let running=opening;const movements:LedgerMovement[]=lines.filter((l)=>entries.has(l.journalEntryId)).map((line)=>({line,entry:entries.get(line.journalEntryId)!})).sort((a,b)=>a.entry.entryDate.localeCompare(b.entry.entryDate)||String(a.entry.entryNumber).localeCompare(String(b.entry.entryNumber))||a.line.lineNumber-b.line.lineNumber)
      .map(({line,entry})=>{running=r2(running+line.debit-line.credit);return{entryId:entry.id,entryNumber:entry.entryNumber,entryDate:entry.entryDate,description:entry.description,sourceType:entry.sourceType,sourceId:entry.sourceId,lineDescription:line.description,debit:line.debit,credit:line.credit,balance:running,clientId:line.clientId,projectId:line.projectId,costCenterId:line.costCenterId,drillDown:sourceHref(entry.sourceType,entry.sourceId,entry.id)};});
    return{account,from,to,opening,debit:sum(movements.map((m)=>m.debit)),credit:sum(movements.map((m)=>m.credit)),closing:running,movements,sign:account.normalBalance==="DEBIT"?"Saldo deudor positivo":"Saldo acreedor negativo (Debe − Haber)"};
  }
  private descendants(accounts:LedgerAccount[],id:string):string[]{const kids=accounts.filter((a)=>a.parentId===id).map((a)=>a.id);return kids.flatMap((kid)=>[kid,...this.descendants(accounts,kid)]);}
}
export function sourceHref(sourceType:string,sourceId:string|null,entryId:string){if(!sourceId)return`/finance/journal?entry=${entryId}`;if(sourceType==="REVERSAL")return`/finance/journal?entry=${sourceId}`;return`/finance/journal?entry=${entryId}`;}

// =========================================================================================== Motor de reglas contables
export interface AccountingEventInput { eventType:string; sourceType:string; sourceId:string; idempotencyKey:string; amounts:Partial<Record<AmountKey,number>>; context:Row; occurredOn:string; }
@Injectable()
export class AccountingRuleEngine {
  constructor(private readonly ctx:FinanceContext,private readonly ledger:LedgerService){}
  private get repo(){return this.ctx.repo;}

  async rules():Promise<AccountingRule[]>{const[rules,versions]=await Promise.all([this.repo.list<AccountingRule>("accounting_rules",{},{order:"code",ascending:true}),this.repo.list<AccountingRuleVersion>("accounting_rule_versions",{},{order:"version",ascending:false})]);return rules.map((rule)=>({...rule,versions:versions.filter((v)=>v.ruleId===rule.id)}));}
  async validateTemplate(lines:unknown):Promise<RuleLineTemplate[]>{
    if(!Array.isArray(lines)||lines.length<2)throw new UnprocessableEntityException("La regla necesita al menos dos líneas.");const accounts=await this.ctx.accounts();const keys:AmountKey[]=["TOTAL","NET","EXEMPT","TAX","GROSS","FEE","NET_SETTLEMENT","AMOUNT","TAX_ELIGIBLE","TAX_NON_ELIGIBLE"];
    return lines.map((line:RuleLineTemplate,index)=>{if(line.side!=="DEBIT"&&line.side!=="CREDIT")throw new UnprocessableEntityException(`Línea ${index+1}: lado inválido.`);const code=line.account?.code??line.account?.fallbackCode;if(!code&&!line.account?.context)throw new UnprocessableEntityException(`Línea ${index+1}: define cuenta fija o de contexto con respaldo.`);if(code){const account=accounts.find((a)=>a.code===code);if(!account||!account.allowsPosting)throw new UnprocessableEntityException(`Línea ${index+1}: la cuenta ${code} no existe o no es imputable.`);}
      if(!Array.isArray(line.amount)||!line.amount.length||line.amount.some((key)=>!keys.includes(key)))throw new UnprocessableEntityException(`Línea ${index+1}: montos inválidos.`);return{side:line.side,account:line.account,amount:line.amount,dimensions:(line.dimensions??[]).filter((d)=>["client","project","service","costCenter"].includes(d)),description:String(line.description??"").slice(0,200)};});
  }
  async createVersion(ruleId:string,body:Row,actor:FinanceActor){this.ctx.requireAny(actor,"finance.settings.manage","journal.review");await this.ctx.must("accounting_rules",ruleId,"Regla");const lines=await this.validateTemplate(body.lines);const versions=await this.repo.list<AccountingRuleVersion>("accounting_rule_versions",{ruleId});const created=await this.repo.create("accounting_rule_versions",{ruleId,version:Math.max(0,...versions.map((v)=>v.version))+1,status:"DRAFT",lines,effectiveFrom:body.effectiveFrom?isoDate(body.effectiveFrom,"Vigencia"):null,notes:optionalText(body.notes),createdBy:actor.userId});await this.repo.audit(actor,"RULE_VERSION_CREATED","ACCOUNTING_RULE",ruleId,"Nueva versión de regla contable",{lines});return created;}
  async activate(versionId:string,actor:FinanceActor){
    this.ctx.requireAny(actor,"finance.settings.manage","journal.review");const version=await this.ctx.must<AccountingRuleVersion>("accounting_rule_versions",versionId,"Versión");if(version.status!=="DRAFT")throw new ConflictException("Sólo se activa una versión en borrador.");await this.validateTemplate(version.lines);
    for(const active of await this.repo.list<AccountingRuleVersion>("accounting_rule_versions",{ruleId:version.ruleId,status:"ACTIVE"}))await this.repo.update("accounting_rule_versions",active.id,{status:"RETIRED"});
    await this.repo.update("accounting_rule_versions",versionId,{status:"ACTIVE",activatedBy:actor.userId,activatedAt:nowIso()});await this.repo.update("accounting_rules",version.ruleId,{active:true,autoPost:false});
    await this.repo.audit(actor,"RULE_ACTIVATED","ACCOUNTING_RULE",version.ruleId,`Regla activada (versión ${version.version})`,{versionId});return(await this.rules()).find((r)=>r.id===version.ruleId);
  }
  async deactivate(ruleId:string,actor:FinanceActor){this.ctx.requireAny(actor,"finance.settings.manage","journal.review");await this.repo.update("accounting_rules",ruleId,{active:false});await this.repo.audit(actor,"RULE_DEACTIVATED","ACCOUNTING_RULE",ruleId,"Regla desactivada");return(await this.rules()).find((r)=>r.id===ruleId);}
  events(q:PageQuery&{status?:string}){return this.repo.page<AccountingEvent>("accounting_events",{status:q.status||undefined},{...q,order:"createdAt",searchColumns:["eventType","sourceType"]});}

  /** Registra el hecho económico (idempotente) e intenta generar un BORRADOR. Nunca contabiliza. */
  async record(input:AccountingEventInput,actor:FinanceActor):Promise<AccountingEvent>{
    const existing=await this.repo.findOne<AccountingEvent>("accounting_events",{idempotencyKey:input.idempotencyKey});if(existing)return existing;
    let event:AccountingEvent;try{event=await this.repo.create<AccountingEvent>("accounting_events",{eventType:input.eventType,sourceType:input.sourceType,sourceId:input.sourceId,idempotencyKey:input.idempotencyKey,amounts:input.amounts,context:input.context,occurredOn:input.occurredOn,status:"PENDING",journalEntryId:null,ruleVersionId:null,message:null});}
    catch{return(await this.repo.findOne<AccountingEvent>("accounting_events",{idempotencyKey:input.idempotencyKey}))!;}
    return this.process(event.id,actor);
  }
  async process(eventId:string,actor:FinanceActor):Promise<AccountingEvent>{
    const event=await this.ctx.must<AccountingEvent>("accounting_events",eventId,"Evento contable");if(event.status==="ENTRY_CREATED")return event;
    const rules=(await this.repo.list<AccountingRule>("accounting_rules",{eventType:event.eventType,active:true})).filter((rule)=>Object.entries(rule.filters??{}).every(([key,value])=>String(event.context[key]??"")===value));
    if(!rules.length)return this.repo.update("accounting_events",eventId,{status:"UNMAPPED",message:"Sin regla activa: contabilidad debe revisar y activar la regla o registrar el asiento manualmente.",processedAt:nowIso()});
    if(rules.length>1)return this.repo.update("accounting_events",eventId,{status:"ERROR",message:`Ambigüedad: ${rules.length} reglas activas coinciden (${rules.map((r)=>r.code).join(", ")}).`,processedAt:nowIso()});
    const version=await this.repo.findOne<AccountingRuleVersion>("accounting_rule_versions",{ruleId:rules[0]!.id,status:"ACTIVE"});if(!version)return this.repo.update("accounting_events",eventId,{status:"UNMAPPED",message:"La regla no tiene versión activa.",processedAt:nowIso()});
    try{
      const accounts=await this.ctx.accounts();const lines:JournalLineInput[]=[];
      for(const template of version.lines){const amount=r2(template.amount.reduce((total,key)=>total+(Number(event.amounts[key])||0),0));if(amount===0)continue;if(amount<0)throw new Error(`Monto negativo en ${template.amount.join("+")}`);
        const contextId=template.account.context?event.context[template.account.context]:null;const account=contextId?accounts.find((a)=>a.id===contextId):accounts.find((a)=>a.code===(template.account.code??template.account.fallbackCode));if(!account)throw new Error(`Cuenta no resuelta para la línea "${template.description}"`);
        const dims=new Set(template.dimensions);lines.push({accountId:account.id,debit:template.side==="DEBIT"?amount:0,credit:template.side==="CREDIT"?amount:0,description:fill(template.description,event.context).slice(0,300),clientId:dims.has("client")?(event.context.clientId as string)??null:null,projectId:dims.has("project")?(event.context.projectId as string)??null:null,serviceId:dims.has("service")?(event.context.serviceId as string)??null:null,costCenterId:dims.has("costCenter")?(event.context.costCenterId as string)??null:null});}
      const{debit,credit}=await this.ledger.normalizeLines(lines);if(debit!==credit)throw new Error(`Regla descuadrada: Debe ${debit} ≠ Haber ${credit}`);
      const entry=await this.ledger.createEntry({entryDate:event.occurredOn,description:`${rules[0]!.name}: ${String(event.context.documentLabel??event.context.paymentReference??event.sourceId).slice(0,200)}`,lines,submit:true},actor,{sourceType:"RULE",sourceId:event.sourceId,sourceEventId:event.id,ruleVersionId:version.id});
      return this.repo.update("accounting_events",eventId,{status:"ENTRY_CREATED",journalEntryId:entry.id,ruleVersionId:version.id,message:"Borrador generado; requiere revisión y contabilización humana.",processedAt:nowIso()});
    }catch(error){return this.repo.update("accounting_events",eventId,{status:"ERROR",message:String((error as Error).message??error).slice(0,500),processedAt:nowIso()});}
  }
  async reprocessPending(actor:FinanceActor){this.ctx.require(actor,"journal.create");const pending=await this.repo.list<AccountingEvent>("accounting_events",{status:["PENDING","UNMAPPED","ERROR"]});const results=[];for(const event of pending)results.push(await this.process(event.id,actor));return{processed:results.length,created:results.filter((r)=>r.status==="ENTRY_CREATED").length,unmapped:results.filter((r)=>r.status==="UNMAPPED").length,errors:results.filter((r)=>r.status==="ERROR").length};}
}

// =========================================================================================== Estados financieros (siempre desde el libro mayor)
const sectionLabels:Record<string,string>={OPERATING_REVENUE:"Ingresos de explotación",COST_OF_SALES:"Costo de ventas",OPERATING_EXPENSE:"Gastos de administración y ventas",OTHER_REVENUE:"Otros ingresos",FINANCIAL_EXPENSE:"Gastos financieros",OTHER_EXPENSE:"Otros gastos"};
@Injectable()
export class StatementsService {
  constructor(private readonly ctx:FinanceContext){}
  async trialBalance(from:string,to:string):Promise<TrialBalance>{
    const accounts=await this.ctx.accountMap();const rows=(await this.ctx.repo.accountBalances(from,to)).map((b)=>{const a=accounts.get(b.accountId)!;return{accountId:b.accountId,code:a?.code??"?",name:a?.name??"Cuenta",accountType:a?.accountType??"ASSET",opening:r2(b.opening),debit:r2(b.debit),credit:r2(b.credit),closing:r2(b.opening+b.debit-b.credit)};}).filter((r)=>r.opening||r.debit||r.credit).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));
    const totals={opening:sum(rows.map((r)=>r.opening)),debit:sum(rows.map((r)=>r.debit)),credit:sum(rows.map((r)=>r.credit)),closing:sum(rows.map((r)=>r.closing))};return{from,to,rows,totals,balanced:totals.debit===totals.credit&&totals.closing===0&&totals.opening===0};
  }
  async incomeStatement(from:string,to:string):Promise<IncomeStatement>{
    const accounts=await this.ctx.accountMap();const balances=await this.ctx.repo.accountBalances(from,to);const bySection=new Map<string,StatementLine[]>();
    for(const b of balances){const a=accounts.get(b.accountId);if(!a||!["REVENUE","EXPENSE"].includes(a.accountType))continue;const amount=a.accountType==="REVENUE"?r2(b.credit-b.debit):r2(b.debit-b.credit);if(!amount)continue;const key=a.statementSection??(a.accountType==="REVENUE"?"OPERATING_REVENUE":"OPERATING_EXPENSE");const list=bySection.get(key)??[];list.push({accountId:a.id,code:a.code,name:a.name,amount,level:a.code.split(".").length});bySection.set(key,list);}
    const total=(key:string)=>sum((bySection.get(key)??[]).map((l)=>l.amount));const revenue=total("OPERATING_REVENUE"),costOfSales=total("COST_OF_SALES"),operatingExpenses=total("OPERATING_EXPENSE");const grossProfit=r2(revenue-costOfSales),operatingResult=r2(grossProfit-operatingExpenses),otherNet=r2(total("OTHER_REVENUE")-total("FINANCIAL_EXPENSE")-total("OTHER_EXPENSE"));
    return{from,to,sections:Object.keys(sectionLabels).map((key)=>({key,label:sectionLabels[key]!,lines:(bySection.get(key)??[]).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true})),total:total(key)})),revenue,costOfSales,grossProfit,operatingExpenses,operatingResult,otherNet,netResult:r2(operatingResult+otherNet)};
  }
  async balanceSheet(asOf:string):Promise<BalanceSheet>{
    const accounts=await this.ctx.accountMap();const balances=await this.ctx.repo.accountBalances("1900-01-01",asOf);const assets:StatementLine[]=[],liabilities:StatementLine[]=[],equity:StatementLine[]=[];let currentResult=0;
    for(const b of balances){const a=accounts.get(b.accountId);if(!a)continue;const net=r2(b.opening+b.debit-b.credit);if(!net)continue;const line=(amount:number)=>({accountId:a.id,code:a.code,name:a.name,amount,level:a.code.split(".").length});
      if(a.accountType==="ASSET")assets.push(line(net));else if(a.accountType==="LIABILITY")liabilities.push(line(-net));else if(a.accountType==="EQUITY")equity.push(line(-net));else currentResult=r2(currentResult-net);}
    const order=(list:StatementLine[])=>list.sort((x,y)=>String(x.code).localeCompare(String(y.code),undefined,{numeric:true}));const totalAssets=sum(assets.map((l)=>l.amount)),totalLiabilities=sum(liabilities.map((l)=>l.amount)),totalEquity=r2(sum(equity.map((l)=>l.amount))+currentResult);const difference=r2(totalAssets-totalLiabilities-totalEquity);
    return{asOf,assets:order(assets),liabilities:order(liabilities),equity:order(equity),totalAssets,totalLiabilities,totalEquity,currentResult,balanced:difference===0,difference};
  }
}

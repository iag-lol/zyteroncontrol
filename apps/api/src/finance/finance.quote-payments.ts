import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { quoteInvoiceDocumentTypes, type PortalQuotePayment, type QuoteInstallmentEffectiveStatus, type QuotePaymentBoard, type QuotePaymentDetail, type QuotePaymentInstallment, type QuotePaymentPlan, type QuotePaymentQuote, type QuotePaymentSummary } from "@zyteron/contracts";
import { can } from "./finance.access.js";
import { FinanceContext } from "./finance.core.js";
import { parseReceivedXml } from "./finance.dte-providers.js";
import { decodeUpload } from "./finance.dte.js";
import type { SourceQuote } from "./finance.sources.js";
import { addDays, displayDate, type FinanceActor, guarded, isoDate, money, normalizeRut, nowIso, oneOf, optionalText, positiveAmount, r2, requiredText, type Row, sum, todayCl } from "./finance.util.js";

// Calendario de pagos de cotizaciones aceptadas: pago único o mensual. Cada cuota habilita la opción de pago
// `activationDaysBefore` días antes de su vencimiento y la mantiene activa (vencida) hasta marcarse pagada.
// Marcar pagada exige la factura SII (PDF o XML) que queda en el bucket privado quote-invoices; el portal cliente
// sólo la ve si es de su empresa, está pagada y marcada visible. Nunca se simula el SII ni el pago.
export const QUOTE_INVOICE_BUCKET="quote-invoices";
/** Plazo indefinido: cuotas generadas hasta ~2 meses adelante (el scheduler extiende el horizonte). */
export const QUOTE_PAYMENT_HORIZON_DAYS=62;
const eligibleStatuses=["ACCEPTED","CONVERTED"];
const methods=["TRANSFER","CARD","CASH","CHECK","OTHER"] as const;
const docLabel:Record<number,string>={33:"Factura electrónica",34:"Factura exenta",39:"Boleta electrónica",41:"Boleta exenta",56:"Nota de débito"};

/** Estado efectivo (espejo de la vista quote_payment_installments_effective). */
export function effectiveStatus(item:{status:string;dueDate:string},activationDaysBefore:number,today=todayCl()):QuoteInstallmentEffectiveStatus{
  if(item.status==="PAID"||item.status==="CANCELLED")return item.status;
  if(today>item.dueDate)return"OVERDUE";
  return today>=addDays(item.dueDate,-activationDaysBefore)?"PAYMENT_OPEN":"UPCOMING";
}
function integer(value:unknown,label:string,min:number,max:number){const number=Number(value);if(!Number.isInteger(number)||number<min||number>max)throw new BadRequestException(`${label} debe ser un entero entre ${min} y ${max}.`);return number;}
/** Tipo real del archivo por su contenido (no por la extensión declarada). */
function sniff(bytes:Buffer):"pdf"|"xml"|null{if(bytes.subarray(0,5).toString("latin1")==="%PDF-")return"pdf";const head=bytes.subarray(0,200).toString("utf8").replace(/^\uFEFF/,"").trimStart();return head.startsWith("<")?"xml":null;}

@Injectable()
export class QuotePaymentService {
  constructor(private readonly ctx:FinanceContext){}
  private get repo(){return this.ctx.repo;}

  // ------------------------------------------------------------------------------------------ acceso
  /** Ejecutiva de ventas: sólo cotizaciones propias (espejo de private.can_view_quote_payments). */
  private assertQuoteAccess(actor:FinanceActor,quote:SourceQuote){if(actor.role==="EJECUTIVA_VENTAS"&&quote.ownerId!==actor.userId)throw new ForbiddenException("Sólo puedes ver los pagos de tus cotizaciones.");}
  private async quoteFor(quoteId:string,actor:FinanceActor){const quote=await this.ctx.sources.quote(quoteId);if(!quote)throw new NotFoundException("Cotización no encontrada.");this.assertQuoteAccess(actor,quote);return quote;}
  private async installmentFor(id:string,actor:FinanceActor){const item=await this.ctx.must<Row>("quote_payment_installments",id,"Cuota");const quote=await this.quoteFor(item.quoteId,actor);const plan=await this.ctx.must<Row>("quote_payment_plans",item.planId,"Plan de pagos");return{item,quote,plan};}

  // ------------------------------------------------------------------------------------------ mapeo
  private mapPlan(row:Row):QuotePaymentPlan{return{id:row.id,quoteId:row.quoteId,clientId:row.clientId??null,frequency:row.frequency,amount:Number(row.amount),currency:row.currency,startDate:row.startDate,paymentDay:Number(row.paymentDay),activationDaysBefore:Number(row.activationDaysBefore),totalInstallments:row.totalInstallments===null||row.totalInstallments===undefined?null:Number(row.totalInstallments),status:row.status,notes:row.notes??null,cancelReason:row.cancelReason??null,createdBy:row.createdBy??null,updatedBy:row.updatedBy??null,createdAt:row.createdAt,updatedAt:row.updatedAt};}
  private mapInstallment(row:Row,plan:Row,today=todayCl()):QuotePaymentInstallment{
    const days=Number(plan.activationDaysBefore??0),status=effectiveStatus(row as {status:string;dueDate:string},days,today);
    return{id:row.id,planId:row.planId,quoteId:row.quoteId,clientId:row.clientId??null,sequence:Number(row.sequence),periodKey:row.periodKey,dueDate:row.dueDate,amount:Number(row.amount),currency:row.currency,status:row.status,effectiveStatus:status,paymentOpensOn:addDays(row.dueDate,-days),canMarkPaid:(status==="PAYMENT_OPEN"||status==="OVERDUE")&&plan.status!=="CANCELLED",
      paidAt:row.paidAt??null,paidAmount:row.paidAmount===null||row.paidAmount===undefined?null:Number(row.paidAmount),paymentMethod:row.paymentMethod??null,paymentReference:row.paymentReference??null,siiDocumentType:row.siiDocumentType??null,siiFolio:row.siiFolio===null||row.siiFolio===undefined?null:Number(row.siiFolio),siiIssueDate:row.siiIssueDate??null,
      hasInvoice:Boolean(row.invoiceStoragePath),invoiceFileName:row.invoiceFileName??null,invoiceMime:row.invoiceMime??null,clientVisible:Boolean(row.clientVisible),markedPaidBy:row.markedPaidBy??null,markedPaidAt:row.markedPaidAt??null,notes:row.notes??null,cancelReason:row.cancelReason??null};
  }
  private async mapQuote(quote:SourceQuote):Promise<QuotePaymentQuote>{const names=await this.ctx.sources.clientNames([quote.clientId]);return{...quote,clientName:quote.clientId?names.get(quote.clientId)??null:null};}
  private summary(items:QuotePaymentInstallment[]):QuotePaymentSummary{
    const count=(status:QuoteInstallmentEffectiveStatus)=>items.filter((i)=>i.effectiveStatus===status).length;const pending=items.filter((i)=>i.status==="SCHEDULED");
    const next=pending.sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
    return{total:items.length,paid:count("PAID"),open:count("PAYMENT_OPEN"),overdue:count("OVERDUE"),upcoming:count("UPCOMING"),cancelled:count("CANCELLED"),paidAmount:sum(items.filter((i)=>i.status==="PAID").map((i)=>i.paidAmount)),pendingAmount:sum(pending.map((i)=>i.amount)),nextDue:next?{id:next.id,dueDate:next.dueDate,amount:next.amount,effectiveStatus:next.effectiveStatus}:null};
  }
  private eligibility(quote:SourceQuote):string|null{if(!eligibleStatuses.includes(quote.status))return"Sólo las cotizaciones aceptadas o convertidas en venta tienen calendario de pagos.";if(!quote.clientId)return"La cotización debe estar asociada a un cliente (la factura se publica en su portal).";return null;}

  // ------------------------------------------------------------------------------------------ lectura
  async detail(quoteId:string,actor:FinanceActor):Promise<QuotePaymentDetail>{
    this.ctx.require(actor,"quote_payment.view");const quote=await this.quoteFor(quoteId,actor);
    const plan=await this.repo.findOne<Row>("quote_payment_plans",{quoteId});
    if(plan?.status==="ACTIVE")await this.repo.materializeQuotePlan(plan.id,addDays(todayCl(),QUOTE_PAYMENT_HORIZON_DAYS));
    const today=todayCl();const installments=plan?(await this.repo.list<Row>("quote_payment_installments",{planId:plan.id},{order:"sequence",ascending:true})).map((row)=>this.mapInstallment(row,plan,today)):[];
    const reason=this.eligibility(quote);
    return{quote:await this.mapQuote(quote),plan:plan?this.mapPlan(plan):null,installments,summary:this.summary(installments),eligible:!reason,eligibilityReason:reason,permissions:{manage:can(actor.role,"quote_payment.manage"),markPaid:can(actor.role,"quote_payment.mark_paid")}};
  }

  /** Tablero de cobranza de cotizaciones: cuotas pendientes hasta el horizonte (incluidas las vencidas) y resueltas de los últimos 90 días. */
  async board(query:Row,actor:FinanceActor):Promise<QuotePaymentBoard>{
    this.ctx.require(actor,"quote_payment.view");const today=todayCl();await this.extendOpenPlans(today);
    const base:Row={};if(query.clientId)base.clientId=String(query.clientId);
    const range=query.from||query.to?{gte:query.from?isoDate(query.from,"Desde"):undefined,lte:query.to?isoDate(query.to,"Hasta"):undefined}:undefined;
    const rows=range?await this.repo.list<Row>("quote_payment_installments",{...base,dueDate:range},{order:"dueDate",ascending:true})
      :[...await this.repo.list<Row>("quote_payment_installments",{...base,status:"SCHEDULED",dueDate:{lte:addDays(today,QUOTE_PAYMENT_HORIZON_DAYS)}},{order:"dueDate",ascending:true}),...await this.repo.list<Row>("quote_payment_installments",{...base,status:["PAID","CANCELLED"],dueDate:{gte:addDays(today,-90)}},{order:"dueDate",ascending:true})];
    const plans=new Map((await this.repo.list<Row>("quote_payment_plans",{id:[...new Set(rows.map((r)=>r.planId as string))]})).map((p)=>[p.id,p]));
    const quotes=await this.ctx.sources.quotes(rows.map((r)=>r.quoteId));const names=await this.ctx.sources.clientNames(rows.map((r)=>r.clientId));
    let items=rows.filter((r)=>plans.has(r.planId)&&quotes.has(r.quoteId)).map((row)=>{const quote=quotes.get(row.quoteId)!;return{...this.mapInstallment(row,plans.get(row.planId)!,today),quoteNumber:quote.quoteNumber,companyName:quote.companyName,clientName:row.clientId?names.get(row.clientId)??null:null,ownerId:quote.ownerId};});
    if(actor.role==="EJECUTIVA_VENTAS")items=items.filter((i)=>i.ownerId===actor.userId);
    if(query.status)items=items.filter((i)=>i.effectiveStatus===query.status);
    const month=today.slice(0,7),limit30=addDays(today,30);const byCurrency:QuotePaymentBoard["kpis"]["byCurrency"]={};
    for(const i of items){const bucket=byCurrency[i.currency]??={open:0,overdue:0,paidThisMonth:0};if(i.effectiveStatus==="PAYMENT_OPEN")bucket.open=r2(bucket.open+i.amount);if(i.effectiveStatus==="OVERDUE")bucket.overdue=r2(bucket.overdue+i.amount);if(i.status==="PAID"&&i.paidAt?.startsWith(month))bucket.paidThisMonth=r2(bucket.paidThisMonth+(i.paidAmount??0));}
    return{items,asOf:today,kpis:{open:items.filter((i)=>i.effectiveStatus==="PAYMENT_OPEN").length,overdue:items.filter((i)=>i.effectiveStatus==="OVERDUE").length,upcoming30:items.filter((i)=>i.effectiveStatus==="UPCOMING"&&i.dueDate<=limit30).length,paidThisMonth:items.filter((i)=>i.status==="PAID"&&Boolean(i.paidAt?.startsWith(month))).length,byCurrency}};
  }

  /** Cotizaciones aceptadas/convertidas con el estado de su plan (para crear o revisar calendarios). */
  async quotes(actor:FinanceActor){
    this.ctx.require(actor,"quote_payment.view");let quotes=await this.ctx.sources.acceptedQuotes();
    const plans=await this.repo.list<Row>("quote_payment_plans",{});const byQuote=new Map(plans.map((p)=>[p.quoteId as string,p]));
    const known=new Set(quotes.map((q)=>q.id));const extra=await this.ctx.sources.quotes(plans.map((p)=>p.quoteId).filter((id)=>!known.has(id)));quotes=[...quotes,...extra.values()];
    if(actor.role==="EJECUTIVA_VENTAS")quotes=quotes.filter((q)=>q.ownerId===actor.userId);
    const names=await this.ctx.sources.clientNames(quotes.map((q)=>q.clientId));
    return quotes.map((quote)=>{const plan=byQuote.get(quote.id);return{...quote,clientName:quote.clientId?names.get(quote.clientId)??null:null,planId:plan?.id??null,planStatus:plan?.status??null,frequency:plan?.frequency??null,eligibilityReason:this.eligibility(quote)};});
  }

  // ------------------------------------------------------------------------------------------ plan
  async savePlan(quoteId:string,body:Row,actor:FinanceActor){
    this.ctx.require(actor,"quote_payment.manage");if(!actor.userId)throw new BadRequestException("El plan requiere un responsable identificado.");
    const quote=await this.quoteFor(quoteId,actor);const current=await this.repo.findOne<Row>("quote_payment_plans",{quoteId});
    if(!current){const reason=this.eligibility(quote);if(reason)throw new ConflictException(reason);}
    if(current?.status==="CANCELLED")throw new ConflictException("El plan está anulado y no se reactiva.");
    const frequency=oneOf(body.frequency,["ONE_TIME","MONTHLY"] as const,"Frecuencia","MONTHLY");
    const startDate=isoDate(body.startDate,"Fecha de inicio");const amount=positiveAmount(body.amount??quote.totalAmount,"Monto por cuota");
    const currency=oneOf(body.currency,["CLP","UF","USD"] as const,"Moneda",(quote.currency as "CLP")||"CLP");
    const paymentDay=frequency==="ONE_TIME"?Number(startDate.slice(8,10)):integer(body.paymentDay??Number(startDate.slice(8,10)),"Día de pago",1,31);
    const activationDaysBefore=integer(body.activationDaysBefore??5,"Días de anticipación",0,27);
    const totalInstallments=frequency==="ONE_TIME"?1:body.totalInstallments===null||body.totalInstallments===undefined||body.totalInstallments===""?null:integer(body.totalInstallments,"Número de cuotas",1,120);
    const patch:Row={frequency,amount,currency,startDate,paymentDay,activationDaysBefore,totalInstallments,notes:optionalText(body.notes,1000),updatedBy:actor.userId};
    return guarded(async()=>{
      let plan:Row;
      if(current){
        const installments=await this.repo.list<Row>("quote_payment_installments",{planId:current.id});const paid=installments.filter((i)=>i.status==="PAID");
        if(paid.length&&(frequency!==current.frequency||startDate!==current.startDate||paymentDay!==Number(current.paymentDay)||currency!==current.currency))throw new ConflictException("Con cuotas pagadas no cambia la frecuencia, el inicio, el día de pago ni la moneda; sólo el monto de las cuotas pendientes, el plazo y la anticipación.");
        const maxPaid=Math.max(0,...paid.map((i)=>Number(i.sequence)));if(totalInstallments!==null&&totalInstallments<maxPaid)throw new ConflictException(`Ya hay ${maxPaid} cuota(s) pagada(s): el plazo no puede ser menor.`);
        const reopen=current.status==="COMPLETED"&&(totalInstallments===null||totalInstallments>installments.length);
        plan=await this.repo.update<Row>("quote_payment_plans",current.id,{...patch,status:reopen?"ACTIVE":current.status});
        await this.repo.rescheduleQuotePlan(plan.id);
        await this.repo.audit(actor,"QUOTE_PAYMENT_PLAN_UPDATED","QUOTE_PAYMENT_PLAN",plan.id,`Plan de pagos de ${quote.quoteNumber} actualizado (${frequency==="MONTHLY"?"mensual":"pago único"}, ${money(amount,currency)})`,{before:{frequency:current.frequency,amount:current.amount,startDate:current.startDate,paymentDay:current.paymentDay,totalInstallments:current.totalInstallments},after:patch});
      }else{
        plan=await this.repo.create<Row>("quote_payment_plans",{...patch,quoteId,clientId:quote.clientId,status:"ACTIVE",cancelReason:null,createdBy:actor.userId});
        await this.repo.audit(actor,"QUOTE_PAYMENT_PLAN_CREATED","QUOTE_PAYMENT_PLAN",plan.id,`Plan de pagos de ${quote.quoteNumber}: ${frequency==="MONTHLY"?`mensual${totalInstallments?` (${totalInstallments} cuotas)`:" (indefinido)"}`:"pago único"} de ${money(amount,currency)}`,patch);
        await this.repo.event({aggregateType:"QUOTE_PAYMENT_PLAN",aggregateId:plan.id,eventType:"QUOTE_PAYMENT_PLAN_CREATED",actorId:actor.userId,clientId:quote.clientId,title:`Calendario de pagos creado para ${quote.quoteNumber}`,payload:{quoteId,frequency,amount,currency}});
      }
      if(plan.status==="ACTIVE")await this.repo.materializeQuotePlan(plan.id,addDays(todayCl(),QUOTE_PAYMENT_HORIZON_DAYS));
      return this.detail(quoteId,actor);
    });
  }

  async planAction(quoteId:string,action:string,body:Row,actor:FinanceActor){
    this.ctx.require(actor,"quote_payment.manage");const quote=await this.quoteFor(quoteId,actor);
    const plan=await this.repo.findOne<Row>("quote_payment_plans",{quoteId});if(!plan)throw new NotFoundException("La cotización no tiene plan de pagos.");
    const next=oneOf(action,["pause","resume","cancel"] as const,"Acción");
    return guarded(async()=>{
      if(next==="pause"){if(plan.status!=="ACTIVE")throw new ConflictException("Sólo se pausa un plan activo.");await this.repo.update("quote_payment_plans",plan.id,{status:"PAUSED",updatedBy:actor.userId});}
      if(next==="resume"){if(plan.status!=="PAUSED")throw new ConflictException("Sólo se reanuda un plan pausado.");await this.repo.update("quote_payment_plans",plan.id,{status:"ACTIVE",updatedBy:actor.userId});await this.repo.materializeQuotePlan(plan.id,addDays(todayCl(),QUOTE_PAYMENT_HORIZON_DAYS));}
      if(next==="cancel"){if(plan.status==="CANCELLED")throw new ConflictException("El plan ya está anulado.");const reason=requiredText(body.reason,"Motivo de anulación",500);await this.repo.update("quote_payment_plans",plan.id,{status:"CANCELLED",cancelReason:reason,updatedBy:actor.userId});await this.repo.rescheduleQuotePlan(plan.id);}
      await this.repo.audit(actor,`QUOTE_PAYMENT_PLAN_${next.toUpperCase()}`,"QUOTE_PAYMENT_PLAN",plan.id,`Plan de pagos de ${quote.quoteNumber}: ${next==="pause"?"pausado":next==="resume"?"reanudado":"anulado"}`,{reason:body.reason??null});
      return this.detail(quoteId,actor);
    });
  }

  // ------------------------------------------------------------------------------------------ cuotas
  /** Marca la cuota pagada sólo con la opción de pago habilitada y la factura SII adjunta (PDF o XML del DTE). */
  async markPaid(installmentId:string,body:Row,actor:FinanceActor){
    this.ctx.require(actor,"quote_payment.mark_paid");if(!actor.userId)throw new BadRequestException("Marcar como pagada requiere un responsable identificado.");
    const{item,quote,plan}=await this.installmentFor(installmentId,actor);
    if(item.status==="PAID")throw new ConflictException("La cuota ya está pagada.");if(item.status==="CANCELLED")throw new ConflictException("La cuota está anulada.");if(plan.status==="CANCELLED")throw new ConflictException("El plan está anulado.");
    const today=todayCl(),opens=addDays(item.dueDate,-Number(plan.activationDaysBefore));if(today<opens)throw new ConflictException(`La opción de pago se habilita el ${displayDate(opens)}.`);
    const clientId=item.clientId??quote.clientId;if(!clientId)throw new UnprocessableEntityException("La cuota no tiene cliente asociado.");
    const paidAt=isoDate(body.paidAt??today,"Fecha de pago");if(paidAt>today)throw new BadRequestException("La fecha de pago no puede ser futura.");
    const paidAmount=positiveAmount(body.paidAmount??item.amount,"Monto pagado");const paymentMethod=oneOf(body.paymentMethod,methods,"Medio de pago");
    const siiDocumentType=Number(body.siiDocumentType);if(!(quoteInvoiceDocumentTypes as readonly number[]).includes(siiDocumentType))throw new BadRequestException("Tipo de documento SII inválido (33, 34, 39, 41 o 56).");
    const siiFolio=Number(body.siiFolio);if(!Number.isSafeInteger(siiFolio)||siiFolio<=0)throw new BadRequestException("Folio SII inválido.");
    let siiIssueDate=body.siiIssueDate?isoDate(body.siiIssueDate,"Fecha de emisión"):null;if(siiIssueDate&&siiIssueDate>today)throw new BadRequestException("La fecha de emisión no puede ser futura.");
    const file=decodeUpload(body.invoice,"Factura SII");const kind=sniff(file.bytes);if(!kind)throw new UnprocessableEntityException("La factura debe ser el PDF o el XML del documento emitido en el SII.");
    if(kind==="xml"){
      const documents=parseReceivedXml(file.bytes);const doc=documents.find((d)=>d.documentTypeCode===siiDocumentType&&d.folio===siiFolio);
      if(!doc)throw new UnprocessableEntityException(`El XML no contiene el documento tipo ${siiDocumentType} folio ${siiFolio}.`);
      if(doc.errors.length)throw new UnprocessableEntityException(`XML inválido: ${doc.errors.join(" ")}`);
      const client=await this.ctx.sources.client(clientId);const receivers=[client?.billingRut,client?.rut].filter(Boolean).map((rut)=>normalizeRut(rut).replace("-",""));
      if(receivers.length&&!receivers.includes(normalizeRut(doc.receiverRut).replace("-","")))throw new UnprocessableEntityException(`El receptor del XML (${doc.receiverRut}) no es el cliente de la cotización.`);
      const settings=await this.repo.settings();if(settings.companyRut&&normalizeRut(settings.companyRut).replace("-","")!==normalizeRut(doc.issuerRut).replace("-",""))throw new UnprocessableEntityException(`El emisor del XML (${doc.issuerRut}) no es la empresa configurada.`);
      siiIssueDate=siiIssueDate??doc.issueDate;
    }
    if(await this.repo.findOne("quote_payment_installments",{siiDocumentType,siiFolio,status:"PAID"}))throw new ConflictException(`El documento tipo ${siiDocumentType} folio ${siiFolio} ya respalda otra cuota pagada.`);
    const mime=kind==="pdf"?"application/pdf":"application/xml";const path=`clients/${clientId}/quotes/${item.quoteId}/${item.periodKey}-${item.sequence}-${file.sha256.slice(0,12)}.${kind}`;
    await this.repo.saveFile(QUOTE_INVOICE_BUCKET,path,file.bytes,mime);
    let updated:Row;
    try{updated=await guarded(()=>this.repo.update<Row>("quote_payment_installments",item.id,{status:"PAID",paidAt,paidAmount,paymentMethod,paymentReference:optionalText(body.paymentReference,120),siiDocumentType,siiFolio,siiIssueDate,invoiceStoragePath:path,invoiceSha256:file.sha256,invoiceFileName:file.fileName,invoiceMime:mime,clientVisible:body.clientVisible===undefined?true:Boolean(body.clientVisible),markedPaidBy:actor.userId,markedPaidAt:nowIso(),notes:optionalText(body.notes,1000)}));}
    catch(error){await this.repo.discardFile(QUOTE_INVOICE_BUCKET,path);throw error;}
    if(plan.totalInstallments!==null&&plan.totalInstallments!==undefined){const rest=await this.repo.count("quote_payment_installments",{planId:plan.id,status:"SCHEDULED"});const total=await this.repo.count("quote_payment_installments",{planId:plan.id});if(!rest&&total>=Number(plan.totalInstallments)&&plan.status==="ACTIVE")await this.repo.update("quote_payment_plans",plan.id,{status:"COMPLETED",updatedBy:actor.userId});}
    const label=`${docLabel[siiDocumentType]} N° ${siiFolio}`;
    await this.repo.audit(actor,"QUOTE_INSTALLMENT_PAID","QUOTE_PAYMENT_INSTALLMENT",item.id,`Cuota ${item.sequence} de ${quote.quoteNumber} pagada (${money(paidAmount,item.currency)}) con ${label}`,{paidAt,paymentMethod,siiDocumentType,siiFolio,invoiceSha256:file.sha256,path});
    await this.repo.event({aggregateType:"QUOTE_PAYMENT_INSTALLMENT",aggregateId:item.id,eventType:"QUOTE_INSTALLMENT_PAID",actorId:actor.userId,clientId,title:`Pago registrado: cuota ${item.sequence} de ${quote.quoteNumber} (${label})`,payload:{quoteId:item.quoteId,periodKey:item.periodKey,amount:paidAmount,currency:item.currency,siiDocumentType,siiFolio}});
    return this.mapInstallment(updated,plan);
  }

  async setVisibility(installmentId:string,body:Row,actor:FinanceActor){
    this.ctx.require(actor,"quote_payment.mark_paid");const{item,quote,plan}=await this.installmentFor(installmentId,actor);
    if(item.status!=="PAID")throw new ConflictException("Sólo las cuotas pagadas tienen factura publicable.");const visible=Boolean(body.clientVisible);
    const updated=await guarded(()=>this.repo.update<Row>("quote_payment_installments",item.id,{clientVisible:visible}));
    await this.repo.audit(actor,visible?"QUOTE_INVOICE_PUBLISHED":"QUOTE_INVOICE_HIDDEN","QUOTE_PAYMENT_INSTALLMENT",item.id,`Factura de la cuota ${item.sequence} de ${quote.quoteNumber} ${visible?"visible":"oculta"} en el portal cliente`);
    return this.mapInstallment(updated,plan);
  }

  async cancelInstallment(installmentId:string,body:Row,actor:FinanceActor){
    this.ctx.require(actor,"quote_payment.manage");const{item,quote,plan}=await this.installmentFor(installmentId,actor);
    if(item.status!=="SCHEDULED")throw new ConflictException("Sólo se anulan cuotas pendientes.");const reason=requiredText(body.reason,"Motivo de anulación",500);
    const updated=await guarded(()=>this.repo.update<Row>("quote_payment_installments",item.id,{status:"CANCELLED",cancelReason:reason}));
    await this.repo.audit(actor,"QUOTE_INSTALLMENT_CANCELLED","QUOTE_PAYMENT_INSTALLMENT",item.id,`Cuota ${item.sequence} de ${quote.quoteNumber} anulada: ${reason}`);
    return this.mapInstallment(updated,plan);
  }

  async invoice(installmentId:string,actor:FinanceActor){
    this.ctx.require(actor,"quote_payment.view");const{item}=await this.installmentFor(installmentId,actor);return this.file(item);
  }
  private async file(item:Row){
    if(!item.invoiceStoragePath)throw new NotFoundException("La cuota no tiene factura adjunta.");
    const bytes=await this.repo.readFile(QUOTE_INVOICE_BUCKET,item.invoiceStoragePath);if(!bytes)throw new NotFoundException("No se encontró el archivo de la factura.");
    return{bytes,mime:item.invoiceMime??"application/octet-stream",fileName:item.invoiceFileName??`factura-${item.siiFolio}.${item.invoiceMime==="application/pdf"?"pdf":"xml"}`};
  }

  // ------------------------------------------------------------------------------------------ portal cliente
  private async portalClient(actor:FinanceActor){if(actor.role!=="PORTAL_CLIENT")throw new ForbiddenException("Sólo usuarios del portal cliente.");const clientId=await this.ctx.sources.portalClientId(actor.userId);if(!clientId)throw new ForbiddenException("Tu acceso al portal no tiene facturas habilitadas.");return clientId;}
  async portalList(actor:FinanceActor):Promise<PortalQuotePayment[]>{
    const clientId=await this.portalClient(actor);const today=todayCl();
    const plans=new Map((await this.repo.list<Row>("quote_payment_plans",{clientId,status:{neq:"CANCELLED"}})).map((p)=>[p.id,p]));if(!plans.size)return[];
    const rows=(await this.repo.list<Row>("quote_payment_installments",{clientId,planId:[...plans.keys()],status:{neq:"CANCELLED"}},{order:"dueDate",ascending:true}));
    const quotes=await this.ctx.sources.quotes(rows.map((r)=>r.quoteId));
    return rows.map((row)=>{const visible=row.status==="PAID"&&Boolean(row.clientVisible);return{id:row.id,quoteId:row.quoteId,quoteNumber:quotes.get(row.quoteId)?.quoteNumber??"",sequence:Number(row.sequence),periodKey:row.periodKey,dueDate:row.dueDate,amount:Number(row.amount),currency:row.currency,status:effectiveStatus(row as {status:string;dueDate:string},Number(plans.get(row.planId)!.activationDaysBefore),today) as PortalQuotePayment["status"],paidAt:row.paidAt??null,siiDocumentType:visible?row.siiDocumentType:null,siiFolio:visible?Number(row.siiFolio):null,invoiceAvailable:visible&&Boolean(row.invoiceStoragePath)};});
  }
  async portalInvoice(installmentId:string,actor:FinanceActor){
    const clientId=await this.portalClient(actor);const item=await this.repo.get<Row>("quote_payment_installments",installmentId);
    if(!item||item.clientId!==clientId||item.status!=="PAID"||!item.clientVisible)throw new NotFoundException("Factura no disponible.");return this.file(item);
  }

  // ------------------------------------------------------------------------------------------ tareas programadas
  private async extendOpenPlans(today:string){const plans=await this.repo.list<Row>("quote_payment_plans",{status:"ACTIVE"});for(const plan of plans)await this.repo.materializeQuotePlan(plan.id,addDays(today,QUOTE_PAYMENT_HORIZON_DAYS));return plans.length;}
  /** Extiende calendarios y avisa (una vez por cuota y estado) cuándo se habilita el pago y cuándo vence sin pagar. */
  async runDue(today=todayCl()){
    const plans=await this.extendOpenPlans(today);const rows=await this.repo.list<Row>("quote_payment_installments",{status:"SCHEDULED",dueDate:{lte:addDays(today,27)}});
    const planMap=new Map((await this.repo.list<Row>("quote_payment_plans",{id:[...new Set(rows.map((r)=>r.planId as string))]})).map((p)=>[p.id,p]));const quotes=await this.ctx.sources.quotes(rows.map((r)=>r.quoteId));let opened=0,overdue=0;
    for(const row of rows){const plan=planMap.get(row.planId);const quote=quotes.get(row.quoteId);if(!plan||!quote||plan.status==="CANCELLED")continue;const status=effectiveStatus(row as {status:string;dueDate:string},Number(plan.activationDaysBefore),today);if(status==="UPCOMING")continue;
      const open=status==="PAYMENT_OPEN";const title=open?`Pago habilitado: cuota ${row.sequence} de ${quote.quoteNumber}`:`Cuota vencida sin pago: ${quote.quoteNumber} (cuota ${row.sequence})`;
      const body=`${quote.companyName} · ${money(Number(row.amount),row.currency)} · vence el ${displayDate(row.dueDate)}. Adjunta la factura SII al registrar el pago.`;const key=`quote-installment-${open?"open":"overdue"}:${row.id}`;
      const created=await this.repo.notify({eventKey:key,type:open?"QUOTE_PAYMENT_OPEN":"QUOTE_PAYMENT_OVERDUE",title,body,entityType:"QUOTE_PAYMENT_INSTALLMENT",entityId:row.id,href:`/commercial/quotes?payments=${row.quoteId}`,severity:open?"INFO":"WARNING",audienceRole:"FINANZAS"});
      if(quote.ownerId)await this.repo.notify({eventKey:`${key}:owner`,type:open?"QUOTE_PAYMENT_OPEN":"QUOTE_PAYMENT_OVERDUE",title,body,entityType:"QUOTE_PAYMENT_INSTALLMENT",entityId:row.id,href:`/commercial/quotes?payments=${row.quoteId}`,severity:open?"INFO":"WARNING",userId:quote.ownerId});
      if(created){if(open)opened++;else overdue++;}}
    return{plans,opened,overdue};
  }
}

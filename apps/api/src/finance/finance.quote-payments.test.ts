import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { FinanceContext } from "./finance.core.js";
import { effectiveStatus, QUOTE_INVOICE_BUCKET, QuotePaymentService } from "./finance.quote-payments.js";
import { FinanceRepository } from "./finance.repository.js";
import { FinanceSources, type SourceClient, type SourceQuote } from "./finance.sources.js";
import { addDays, addMonths, type FinanceActor, quoteDueDate, todayCl } from "./finance.util.js";

const rut=(n:number)=>{let s=0,f=2;for(const d of String(n).split("").reverse()){s+=Number(d)*f;f=f===7?2:f+1;}const r=11-(s%11);return`${n}-${r===11?"0":r===10?"K":r}`;};
const companyRut=rut(77123456);
const ids={fin:"22222222-2222-4222-8222-222222222222",cont:"33333333-3333-4333-8333-333333333333",ej:"44444444-4444-4444-8444-444444444444",ej2:"44444444-4444-4444-8444-555555555555",portal:"66666666-6666-4666-8666-666666666666",portal2:"66666666-6666-4666-8666-777777777777"};
const fin:FinanceActor={userId:ids.fin,role:"FINANZAS"},cont:FinanceActor={userId:ids.cont,role:"CONTADOR"},ej:FinanceActor={userId:ids.ej,role:"EJECUTIVA_VENTAS"},ej2:FinanceActor={userId:ids.ej2,role:"EJECUTIVA_VENTAS"},dev:FinanceActor={userId:"55555555-5555-4555-8555-555555555555",role:"PROGRAMADOR"};
const portal:FinanceActor={userId:ids.portal,role:"PORTAL_CLIENT"},portal2:FinanceActor={userId:ids.portal2,role:"PORTAL_CLIENT"};
const c1="aaaaaaaa-0000-4000-8000-000000000001",c2="aaaaaaaa-0000-4000-8000-000000000002";
const client=(id:string,n:number):SourceClient=>({id,legalName:`Cliente ${n} SpA`,tradeName:null,rut:rut(76000000+n),businessActivity:"Servicios",billingLegalName:null,billingRut:null,billingActivity:null,billingAddress:null,address:null,commune:null,region:null,dteEmail:null,generalEmail:null,creditDays:30,currency:"CLP",accountExecutiveId:null});
const quote=(id:string,n:number,extra:Partial<SourceQuote>={}):SourceQuote=>({id,quoteNumber:`COT-2026-${String(n).padStart(4,"0")}`,companyName:`Cliente ${n} SpA`,clientId:c1,ownerId:ids.ej,status:"ACCEPTED",currency:"CLP",totalAmount:119000,acceptedAt:new Date().toISOString(),...extra});
const b64=(value:string|Buffer)=>Buffer.from(value).toString("base64");
const pdf=(name="factura.pdf",body="%PDF-1.4 factura")=>({fileName:name,contentBase64:b64(body),mimeType:"application/pdf"});
const dteXml=(folio:number,receiver:string,issuer=companyRut,date=todayCl())=>`<?xml version="1.0"?><DTE><Documento><Encabezado><IdDoc><TipoDTE>33</TipoDTE><Folio>${folio}</Folio><FchEmis>${date}</FchEmis></IdDoc><Emisor><RUTEmisor>${issuer}</RUTEmisor><RznSoc>Zyteron SpA</RznSoc></Emisor><Receptor><RUTRecep>${receiver}</RUTRecep></Receptor><Totales><MntNeto>100000</MntNeto><IVA>19000</IVA><MntTotal>119000</MntTotal></Totales></Encabezado><TED/></Documento></DTE>`;
const today=todayCl();
const q1="bbbbbbbb-0000-4000-8000-000000000001",q2="bbbbbbbb-0000-4000-8000-000000000002",qDraft="bbbbbbbb-0000-4000-8000-000000000003",qOpen="bbbbbbbb-0000-4000-8000-000000000004";

describe("calendario de pagos de cotizaciones",()=>{
  let repo:FinanceRepository,sources:FinanceSources,service:QuotePaymentService;
  // Plan mensual de 3 cuotas: la 1ª vencida (mes anterior), la 2ª vence hoy (pago habilitado), la 3ª el mes siguiente (aún no habilitada).
  const monthlyPlan=()=>service.savePlan(q1,{frequency:"MONTHLY",amount:119000,startDate:`${addMonths(today,-1).slice(0,7)}-01`,paymentDay:Number(today.slice(8,10)),totalInstallments:3,activationDaysBefore:5},ej);
  const pay=(id:string,folio:number,extra:Record<string,unknown>={},actor=fin)=>service.markPaid(id,{paymentMethod:"TRANSFER",paymentReference:"TRX-1",siiDocumentType:33,siiFolio:folio,invoice:pdf(),...extra},actor);
  beforeEach(async()=>{
    delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    repo=new FinanceRepository();sources=new FinanceSources();service=new QuotePaymentService(new FinanceContext(repo,sources));
    sources.fixtures.clients.set(c1,client(c1,1));sources.fixtures.clients.set(c2,client(c2,2));
    sources.fixtures.quotes.set(q1,quote(q1,1));sources.fixtures.quotes.set(q2,quote(q2,2,{clientId:c2,ownerId:ids.ej2}));sources.fixtures.quotes.set(qDraft,quote(qDraft,3,{status:"SENT"}));sources.fixtures.quotes.set(qOpen,quote(qOpen,4));
    sources.fixtures.portalUsers.set(ids.portal,c1);sources.fixtures.portalUsers.set(ids.portal2,c2);
    await repo.updateSettings({companyRut});
  });

  it("vencimiento mensual ajustado a fin de mes y estado efectivo según la ventana de pago",()=>{
    expect([1,2,3].map((n)=>quoteDueDate("2026-01-01",31,n))).toEqual(["2026-01-31","2026-02-28","2026-03-31"]);
    expect(effectiveStatus({status:"SCHEDULED",dueDate:"2026-10-10"},5,"2026-10-04")).toBe("UPCOMING");
    expect(effectiveStatus({status:"SCHEDULED",dueDate:"2026-10-10"},5,"2026-10-05")).toBe("PAYMENT_OPEN");
    expect(effectiveStatus({status:"SCHEDULED",dueDate:"2026-10-10"},5,"2026-10-11")).toBe("OVERDUE");
    expect(effectiveStatus({status:"PAID",dueDate:"2026-10-10"},5,"2026-12-01")).toBe("PAID");
  });

  it("plan mensual genera el calendario; sólo cuotas habilitadas permiten registrar el pago",async()=>{
    const detail=await monthlyPlan();
    expect(detail.plan?.frequency).toBe("MONTHLY");expect(detail.installments.map((i)=>i.effectiveStatus)).toEqual(["OVERDUE","PAYMENT_OPEN","UPCOMING"]);
    expect(detail.installments.map((i)=>i.canMarkPaid)).toEqual([true,true,false]);expect(detail.summary.total).toBe(3);expect(detail.summary.pendingAmount).toBe(357000);
    const future=detail.installments[2]!;await expect(pay(future.id,9001)).rejects.toThrow(/se habilita el \d{2}-\d{2}-\d{4}/);
    expect((await repo.list("finance_audit_events",{action:"QUOTE_PAYMENT_PLAN_CREATED"})).length).toBe(1);
  });

  it("marcar pagada exige la factura SII (PDF/XML real) y un folio no reutilizado",async()=>{
    const[first,second]=(await monthlyPlan()).installments;
    await expect(service.markPaid(first!.id,{paymentMethod:"TRANSFER",siiDocumentType:33,siiFolio:10},fin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pay(first!.id,10,{invoice:{fileName:"factura.pdf",contentBase64:b64("no soy un pdf"),mimeType:"application/pdf"}})).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(pay(first!.id,10,{siiDocumentType:99})).rejects.toBeInstanceOf(BadRequestException);
    await expect(pay(first!.id,10,{paidAt:addDays(today,1)})).rejects.toBeInstanceOf(BadRequestException);
    const paid=await pay(first!.id,10);
    expect(paid.status).toBe("PAID");expect(paid.hasInvoice).toBe(true);expect(paid.clientVisible).toBe(true);expect(paid.markedPaidBy).toBe(ids.fin);
    const row=await repo.get<Record<string,string>>("quote_payment_installments",first!.id);expect(row!.invoiceStoragePath).toMatch(new RegExp(`^clients/${c1}/quotes/${q1}/\\d{4}-\\d{2}-1-[0-9a-f]{12}\\.pdf$`));
    expect((await repo.readFile(QUOTE_INVOICE_BUCKET,row!.invoiceStoragePath!))?.toString()).toBe("%PDF-1.4 factura");
    await expect(pay(first!.id,11)).rejects.toBeInstanceOf(ConflictException);
    await expect(pay(second!.id,10)).rejects.toThrow(/ya respalda otra cuota/);
    expect((await repo.list("finance_events",{eventType:"QUOTE_INSTALLMENT_PAID"})).length).toBe(1);
  });

  it("el XML del DTE se valida contra tipo, folio, receptor y emisor",async()=>{
    const[first]=(await monthlyPlan()).installments;const xml=(folio:number,receiver:string,issuer?:string)=>({fileName:"dte.xml",contentBase64:b64(dteXml(folio,receiver,issuer)),mimeType:"application/xml"});
    await expect(pay(first!.id,20,{invoice:xml(21,client(c1,1).rut)})).rejects.toThrow(/no contiene el documento/);
    await expect(pay(first!.id,20,{invoice:xml(20,client(c2,2).rut)})).rejects.toThrow(/receptor/);
    await expect(pay(first!.id,20,{invoice:xml(20,client(c1,1).rut,rut(76999999))})).rejects.toThrow(/emisor/);
    const paid=await pay(first!.id,20,{invoice:xml(20,client(c1,1).rut)});expect(paid.siiIssueDate).toBe(today);expect(paid.invoiceMime).toBe("application/xml");
  });

  it("cuota pagada inmutable; el plan sólo ajusta monto pendiente y plazo; se completa al pagar todo",async()=>{
    const[first,second,third]=(await monthlyPlan()).installments;await pay(first!.id,30);
    await expect(service.savePlan(q1,{frequency:"MONTHLY",amount:119000,startDate:`${addMonths(today,-1).slice(0,7)}-01`,paymentDay:1,totalInstallments:3},ej)).rejects.toBeInstanceOf(ConflictException);
    await expect(repo.update("quote_payment_installments",first!.id,{paidAmount:1})).rejects.toThrow(/QUOTE_PAYMENT_IMMUTABLE/);
    await expect(repo.remove("quote_payment_installments",first!.id)).rejects.toThrow(/FINANCE_IMMUTABLE/);
    const edited=await service.savePlan(q1,{frequency:"MONTHLY",amount:150000,startDate:`${addMonths(today,-1).slice(0,7)}-01`,paymentDay:Number(today.slice(8,10)),totalInstallments:2},ej);
    expect(edited.installments.map((i)=>[i.status,i.amount])).toEqual([["PAID",119000],["SCHEDULED",150000],["CANCELLED",119000]]);
    expect(edited.installments[2]!.cancelReason).toMatch(/fuera del nuevo plazo/);
    await pay(second!.id,31);expect((await service.detail(q1,fin)).plan?.status).toBe("COMPLETED");
    await expect(service.cancelInstallment(third!.id,{reason:"x"},fin)).rejects.toBeInstanceOf(ConflictException);
  });

  it("sólo cotizaciones aceptadas con cliente; anular el plan anula cuotas pendientes con motivo y no se reactiva",async()=>{
    await expect(service.savePlan(qDraft,{frequency:"ONE_TIME",startDate:today},fin)).rejects.toThrow(/aceptadas/);
    const single=await service.savePlan(qOpen,{frequency:"ONE_TIME",amount:500000,startDate:addDays(today,3)},fin);
    expect(single.installments).toHaveLength(1);expect(single.installments[0]!.effectiveStatus).toBe("PAYMENT_OPEN");
    await expect(service.planAction(qOpen,"cancel",{},fin)).rejects.toBeInstanceOf(BadRequestException);
    const cancelled=await service.planAction(qOpen,"cancel",{reason:"El cliente desistió"},fin);
    expect(cancelled.installments[0]!.status).toBe("CANCELLED");expect(cancelled.installments[0]!.cancelReason).toMatch(/Plan anulado/);
    await expect(service.savePlan(qOpen,{frequency:"ONE_TIME",amount:500000,startDate:today},fin)).rejects.toThrow(/anulado/);
  });

  it("plazo indefinido genera cuotas hasta el horizonte y el scheduler avisa una sola vez",async()=>{
    const open=await service.savePlan(qOpen,{frequency:"MONTHLY",amount:50000,startDate:`${today.slice(0,7)}-01`,paymentDay:Number(today.slice(8,10)),totalInstallments:null},fin);
    expect(open.plan?.totalInstallments).toBeNull();expect(open.installments.length).toBeGreaterThanOrEqual(2);expect(open.installments.length).toBeLessThanOrEqual(4);
    const first=await service.runDue(today);expect(first.opened).toBe(1);const again=await service.runDue(today);expect(again.opened).toBe(0);
    const notes=await repo.list<Record<string,unknown>>("finance_notifications",{type:"QUOTE_PAYMENT_OPEN"});expect(notes.map((n)=>n.userId??n.audienceRole).sort()).toEqual([ids.ej,"FINANZAS"].sort());
  });

  it("RBAC: ejecutiva sólo sus cotizaciones y sin marcar pagos; contador sólo lectura; desarrollo sin acceso",async()=>{
    const[first]=(await monthlyPlan()).installments;
    await expect(service.detail(q1,ej2)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.savePlan(q2,{frequency:"ONE_TIME",startDate:today},ej)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(pay(first!.id,40,{},ej)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await service.detail(q1,cont)).permissions).toEqual({manage:false,markPaid:false});
    await expect(service.savePlan(q1,{frequency:"ONE_TIME",startDate:today},cont)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.board({},dev)).rejects.toBeInstanceOf(ForbiddenException);
    await service.savePlan(q2,{frequency:"ONE_TIME",amount:10000,startDate:today},ej2);
    expect((await service.board({},ej)).items.every((i)=>i.quoteId===q1)).toBe(true);expect((await service.board({},fin)).items.some((i)=>i.quoteId===q2)).toBe(true);
    expect((await service.quotes(ej)).map((q)=>q.id).sort()).toEqual([q1,qOpen].sort());
  });

  it("portal cliente: ve su calendario y descarga sólo facturas pagadas y visibles",async()=>{
    const[first,second]=(await monthlyPlan()).installments;await pay(first!.id,50);await pay(second!.id,51,{clientVisible:false});
    const list=await service.portalList(portal);expect(list).toHaveLength(3);
    expect(list.find((i)=>i.id===first!.id)).toMatchObject({status:"PAID",invoiceAvailable:true,siiFolio:50});
    expect(list.find((i)=>i.id===second!.id)).toMatchObject({status:"PAID",invoiceAvailable:false,siiFolio:null});
    expect((await service.portalInvoice(first!.id,portal)).bytes.toString()).toBe("%PDF-1.4 factura");
    await expect(service.portalInvoice(second!.id,portal)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.portalInvoice(first!.id,portal2)).rejects.toBeInstanceOf(NotFoundException);
    expect(await service.portalList(portal2)).toEqual([]);
    await expect(service.portalList(fin)).rejects.toBeInstanceOf(ForbiddenException);
    await service.setVisibility(second!.id,{clientVisible:true},fin);expect((await service.portalList(portal)).find((i)=>i.id===second!.id)?.invoiceAvailable).toBe(true);
  });
});

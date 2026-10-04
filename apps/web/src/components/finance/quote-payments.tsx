"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, CalendarClock, CalendarDays, Download, Eye, EyeOff, FileCheck2, Pause, Pencil, Play, Receipt, Save } from "lucide-react";
import { hasFinancePermission, quoteInvoiceDocumentTypes, type QuotePaymentBoard, type QuotePaymentDetail, type QuotePaymentInstallment, type QuotePaymentQuote, type Role } from "@zyteron/contracts";
import { useAccess } from "@/components/access-context";
import { financeApi, type UploadedFile } from "@/lib/finance-api";
import { day, label, money, todayIso, tone } from "@/lib/finance-format";
import { Amount, DateInput, Drawer, Empty, Feedback, Field, FileInput, KeyValue, LoadError, Loading, Pill, ReasonDialog, Register, Section, useAction, useLoad, useQueryParams } from "./fx-ui";
import type { ViewProps } from "./finance-workspace";

// Calendario de pagos de cotizaciones: la opción «Registrar pago» se habilita N días antes de cada vencimiento y
// queda activa hasta marcarse pagada. Marcar pagada exige adjuntar la factura SII (PDF o XML), que el cliente verá en su portal.
const docNames:Record<number,string>={33:"Factura (33)",34:"Factura exenta (34)",39:"Boleta (39)",41:"Boleta exenta (41)",56:"Nota de débito (56)"};
const monthName=new Intl.DateTimeFormat("es-CL",{month:"long",year:"numeric",timeZone:"UTC"});
const periodName=(key:string)=>{const text=monthName.format(new Date(`${key}-01T12:00:00Z`));return text.charAt(0).toUpperCase()+text.slice(1);};
/** Espejo del cálculo de la API: día de pago del mes N, ajustado al último día del mes. */
function dueDate(start:string,paymentDay:number,sequence:number){const value=new Date(`${start.slice(0,7)}-01T00:00:00Z`);value.setUTCMonth(value.getUTCMonth()+sequence-1);const last=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate();value.setUTCDate(Math.min(paymentDay,last));return value.toISOString().slice(0,10);}
type QuoteRow=QuotePaymentQuote&{planId:string|null;planStatus:string|null;frequency:string|null;eligibilityReason:string|null};

// =========================================================================================== panel por cotización
export function QuotePaymentPanel({quoteId,onChanged}:{quoteId:string;onChanged?:()=>void}){
  const{role}=useAccess();const detail=useLoad(()=>financeApi.get<QuotePaymentDetail>(role,`/quote-payments/quotes/${quoteId}`),[role,quoteId]);
  const action=useAction(async()=>{await detail.reload();onChanged?.();});const[editing,setEditing]=useState(false);const[paying,setPaying]=useState<QuotePaymentInstallment|null>(null);const[dialog,setDialog]=useState<null|"plan"|{installment:string}>(null);
  if(detail.error)return <LoadError error={detail.error} retry={()=>void detail.reload()}/>;if(!detail.data)return <Loading text="Cargando calendario de pagos…"/>;
  const d=detail.data,plan=d.plan,can=d.permissions;
  return <div className="fx-stack">
    <KeyValue items={[["Cotización",`${d.quote.quoteNumber} · ${d.quote.companyName}`],["Cliente",d.quote.clientName??"Sin cliente asociado"],["Total cotizado",money(d.quote.totalAmount,d.quote.currency)],["Plan",plan?<><Pill value={plan.status}/> {label(plan.frequency)}{plan.frequency==="MONTHLY"?` · ${plan.totalInstallments?`${plan.totalInstallments} cuotas`:"plazo indefinido"} · día ${plan.paymentDay}`:""}</>:"Sin calendario"]]}/>
    <Feedback error={action.error} notice={action.notice}/>
    {!plan||editing?(can.manage&&(plan||d.eligible)?<PlanForm detail={d} onCancel={plan?()=>setEditing(false):undefined} onSaved={(next)=>{detail.setData(next);setEditing(false);onChanged?.();}}/>
      :<Empty title="Sin calendario de pagos" text={d.eligibilityReason??"Tu rol no puede configurar el calendario de esta cotización."}/>)
    :<>
      <div className="fx-qp-summary">
        <span><small>Pagadas</small><strong>{d.summary.paid} / {d.summary.total-d.summary.cancelled}</strong></span>
        <span className={d.summary.open?"tone-warn":""}><small>Pago habilitado</small><strong>{d.summary.open}</strong></span>
        <span className={d.summary.overdue?"tone-bad":""}><small>Vencidas</small><strong>{d.summary.overdue}</strong></span>
        <span><small>Pagado</small><strong>{money(d.summary.paidAmount,plan.currency)}</strong></span>
        <span><small>Pendiente</small><strong>{money(d.summary.pendingAmount,plan.currency)}</strong></span>
        <span><small>Próximo vencimiento</small><strong>{d.summary.nextDue?day(d.summary.nextDue.dueDate):"—"}</strong></span>
      </div>
      {can.manage&&plan.status!=="CANCELLED"?<div className="fx-actions">
        <button className="fx-btn" onClick={()=>setEditing(true)}><Pencil size={14}/>Editar plan</button>
        {plan.status==="ACTIVE"?<button className="fx-btn ghost" disabled={action.busy} onClick={()=>void action.run(()=>financeApi.post(role,`/quote-payments/quotes/${quoteId}/plan/pause`),"Plan pausado: no se generan nuevas cuotas.")}><Pause size={14}/>Pausar</button>:null}
        {plan.status==="PAUSED"?<button className="fx-btn ghost" disabled={action.busy} onClick={()=>void action.run(()=>financeApi.post(role,`/quote-payments/quotes/${quoteId}/plan/resume`),"Plan reanudado.")}><Play size={14}/>Reanudar</button>:null}
        <button className="fx-btn ghost danger" onClick={()=>setDialog("plan")}><Ban size={14}/>Anular plan</button>
      </div>:null}
      {plan.status==="CANCELLED"?<p className="fx-hint">Plan anulado: {plan.cancelReason}</p>:null}
      <Section eyebrow="CALENDARIO" title="Cuotas" description={`La opción de pago se habilita ${plan.activationDaysBefore} día(s) antes de cada vencimiento y sigue activa hasta registrar el pago con su factura SII.`}>
        {d.installments.length?<div className="fx-qp-calendar" role="list">{d.installments.map((i)=><InstallmentCell key={i.id} item={i} canPay={can.markPaid} canManage={can.manage} busy={action.busy}
          onPay={()=>setPaying(i)} onCancel={()=>setDialog({installment:i.id})}
          onInvoice={()=>void action.run(()=>financeApi.download(role,`/quote-payments/installments/${i.id}/invoice`))}
          onVisibility={()=>void action.run(()=>financeApi.post(role,`/quote-payments/installments/${i.id}/visibility`,{clientVisible:!i.clientVisible}),i.clientVisible?"La factura ya no se muestra en el portal cliente.":"Factura visible en el portal cliente.")}/>)}</div>
        :<Empty title="Sin cuotas generadas" text="El plan no está activo o aún no tiene cuotas en el horizonte."/>}
      </Section>
    </>}
    {paying?<MarkPaidDrawer item={paying} currency={plan?.currency??"CLP"} onClose={()=>setPaying(null)} onDone={()=>{setPaying(null);action.setNotice("Pago registrado con su factura SII.");void detail.reload();onChanged?.();}}/>:null}
    <ReasonDialog open={dialog!==null} title={dialog==="plan"?"Anular plan de pagos":"Anular cuota"} description={dialog==="plan"?"Las cuotas pendientes se anulan con este motivo. Las pagadas se conservan. Un plan anulado no se reactiva.":"La cuota queda anulada con motivo (no se elimina)."} confirm="Anular"
      onCancel={()=>setDialog(null)} onConfirm={(reason)=>{const target=dialog;setDialog(null);if(target==="plan")void action.run(()=>financeApi.post(role,`/quote-payments/quotes/${quoteId}/plan/cancel`,{reason}),"Plan anulado.");else if(target)void action.run(()=>financeApi.post(role,`/quote-payments/installments/${target.installment}/cancel`,{reason}),"Cuota anulada.");}}/>
  </div>;
}

function InstallmentCell({item:i,canPay,canManage,busy,onPay,onCancel,onInvoice,onVisibility}:{item:QuotePaymentInstallment;canPay:boolean;canManage:boolean;busy:boolean;onPay:()=>void;onCancel:()=>void;onInvoice:()=>void;onVisibility:()=>void}){
  return <article role="listitem" className={`fx-qp-cell tone-${tone(i.effectiveStatus)}`}>
    <header><small>Cuota {i.sequence}</small><strong>{periodName(i.periodKey)}</strong></header>
    <Amount value={i.amount} currency={i.currency} strong/>
    <span className="fx-qp-due"><CalendarDays size={12}/>Vence el {day(i.dueDate)}</span>
    <Pill value={i.effectiveStatus}/>
    {i.status==="PAID"?<div className="fx-qp-paid">
      <small><FileCheck2 size={12}/>{docNames[i.siiDocumentType??0]??"Documento"} N° {i.siiFolio}</small>
      <small>Pagada el {day(i.paidAt)} · {money(i.paidAmount,i.currency)} · {label(i.paymentMethod)}</small>
      <div className="fx-row-actions"><button className="fx-btn small" disabled={busy||!i.hasInvoice} onClick={onInvoice}><Download size={12}/>Factura</button>
        {canPay?<button className="fx-btn small ghost" disabled={busy} onClick={onVisibility} title={i.clientVisible?"Visible para el cliente en su portal":"Oculta para el cliente"}>{i.clientVisible?<><Eye size={12}/>Visible al cliente</>:<><EyeOff size={12}/>Oculta al cliente</>}</button>:<small>{i.clientVisible?"Visible al cliente":"Oculta al cliente"}</small>}</div>
    </div>:null}
    {i.status==="SCHEDULED"?<div className="fx-qp-paid">
      {i.canMarkPaid?(canPay?<button className="fx-btn small primary" disabled={busy} onClick={onPay}><Receipt size={12}/>Registrar pago</button>:<small>Pago habilitado: lo registra Finanzas o Ventas.</small>)
        :<small className="fx-qp-lock"><CalendarClock size={12}/>Se habilita el {day(i.paymentOpensOn)}</small>}
      {canManage?<button className="fx-qp-cancel" disabled={busy} onClick={onCancel}>Anular cuota</button>:null}
    </div>:null}
    {i.status==="CANCELLED"?<small className="fx-qp-reason">{i.cancelReason}</small>:null}
  </article>;
}

function PlanForm({detail:d,onSaved,onCancel}:{detail:QuotePaymentDetail;onSaved:(next:QuotePaymentDetail)=>void;onCancel?:()=>void}){
  const{role}=useAccess();const plan=d.plan;const action=useAction();const paid=d.summary.paid>0;
  const[f,setF]=useState({frequency:plan?.frequency??"MONTHLY",amount:String(plan?.amount??d.quote.totalAmount),currency:plan?.currency??(d.quote.currency as "CLP"),startDate:plan?.startDate??todayIso(),paymentDay:String(plan?.paymentDay??Number(todayIso().slice(8,10))),totalInstallments:plan?.totalInstallments?String(plan.totalInstallments):plan?"":"12",activationDaysBefore:String(plan?.activationDaysBefore??5),notes:plan?.notes??""});
  const monthly=f.frequency==="MONTHLY";const preview=f.startDate?[1,2,3].slice(0,monthly?3:1).map((n)=>monthly?dueDate(f.startDate,Number(f.paymentDay)||1,n):f.startDate):[];
  const valid=Number(f.amount)>0&&Boolean(f.startDate)&&(!monthly||(Number(f.paymentDay)>=1&&Number(f.paymentDay)<=31));
  return <div className="fx-form boxed">
    <Field label="Frecuencia"><select value={f.frequency} disabled={paid} onChange={(e)=>setF({...f,frequency:e.target.value as "MONTHLY"})}><option value="MONTHLY">Mensual</option><option value="ONE_TIME">Pago único</option></select></Field>
    <Field label={monthly?"Monto por cuota":"Monto"}><input inputMode="decimal" value={f.amount} onChange={(e)=>setF({...f,amount:e.target.value.replace(/[^\d.]/g,"")})}/></Field>
    <Field label="Moneda"><select value={f.currency} disabled={paid} onChange={(e)=>setF({...f,currency:e.target.value as "CLP"})}>{["CLP","UF","USD"].map((c)=><option key={c}>{c}</option>)}</select></Field>
    <Field label={monthly?"Inicio (mes de la 1ª cuota)":"Fecha de pago"}>{paid?<input value={day(f.startDate)} disabled/>:<DateInput value={f.startDate} onChange={(iso)=>setF({...f,startDate:iso})} required/>}</Field>
    {monthly?<Field label="Día de pago" hint="Si el mes es más corto, vence el último día."><input inputMode="numeric" value={f.paymentDay} disabled={paid} onChange={(e)=>setF({...f,paymentDay:e.target.value.replace(/\D/g,"").slice(0,2)})}/></Field>:null}
    {monthly?<Field label="Número de cuotas" hint="Vacío = mensual indefinido (se genera hasta 2 meses adelante)."><input inputMode="numeric" value={f.totalInstallments} onChange={(e)=>setF({...f,totalInstallments:e.target.value.replace(/\D/g,"").slice(0,3)})}/></Field>:null}
    <Field label="Habilitar pago con anticipación" hint="Días antes del vencimiento (0–27)."><input inputMode="numeric" value={f.activationDaysBefore} onChange={(e)=>setF({...f,activationDaysBefore:e.target.value.replace(/\D/g,"").slice(0,2)})}/></Field>
    <Field label="Notas" span={monthly?2:3}><input value={f.notes} onChange={(e)=>setF({...f,notes:e.target.value})}/></Field>
    {preview.length?<p className="fx-hint">{monthly?"Primeros vencimientos":"Vencimiento"}: {preview.map(day).join(" · ")}{monthly&&f.totalInstallments?` · ${f.totalInstallments} cuotas de ${money(Number(f.amount),f.currency)} = ${money(Number(f.amount)*Number(f.totalInstallments),f.currency)}`:""}</p>:null}
    {paid?<p className="fx-hint">Con cuotas pagadas sólo cambian el monto de las cuotas pendientes, el número de cuotas y la anticipación.</p>:null}
    <Feedback error={action.error}/>
    <div className="fx-actions end">{onCancel?<button className="fx-btn ghost" onClick={onCancel}>Cancelar</button>:null}<button className="fx-btn primary" disabled={action.busy||!valid} onClick={async()=>{const next=await action.run(()=>financeApi.put<QuotePaymentDetail>(role,`/quote-payments/quotes/${d.quote.id}/plan`,{frequency:f.frequency,amount:Number(f.amount),currency:f.currency,startDate:f.startDate,paymentDay:Number(f.paymentDay),totalInstallments:monthly&&f.totalInstallments?Number(f.totalInstallments):monthly?null:1,activationDaysBefore:Number(f.activationDaysBefore),notes:f.notes||null}));if(next)onSaved(next);}}><Save size={14}/>{plan?"Guardar plan":"Crear calendario"}</button></div>
  </div>;
}

function MarkPaidDrawer({item,currency,onClose,onDone}:{item:QuotePaymentInstallment;currency:string;onClose:()=>void;onDone:()=>void}){
  const{role}=useAccess();const action=useAction();
  const[f,setF]=useState({paidAt:todayIso(),paidAmount:String(item.amount),paymentMethod:"TRANSFER",paymentReference:"",siiDocumentType:"33",siiFolio:"",siiIssueDate:"",clientVisible:true,notes:"",invoice:null as UploadedFile|null});
  const ready=Boolean(f.invoice)&&Number(f.siiFolio)>0&&Number(f.paidAmount)>0&&Boolean(f.paidAt);
  return <Drawer open title={`Registrar pago · cuota ${item.sequence}`} subtitle={`${periodName(item.periodKey)} · vence el ${day(item.dueDate)} · ${money(item.amount,currency)}`} onClose={onClose}>
    <div className="fx-form">
      <Field label="Fecha de pago"><DateInput value={f.paidAt} onChange={(iso)=>setF({...f,paidAt:iso})} required/></Field>
      <Field label="Monto pagado"><input inputMode="decimal" value={f.paidAmount} onChange={(e)=>setF({...f,paidAmount:e.target.value.replace(/[^\d.]/g,"")})}/></Field>
      <Field label="Medio"><select value={f.paymentMethod} onChange={(e)=>setF({...f,paymentMethod:e.target.value})}>{["TRANSFER","CARD","CASH","CHECK","OTHER"].map((m)=><option key={m} value={m}>{label(m)}</option>)}</select></Field>
      <Field label="N° de operación" span={3}><input value={f.paymentReference} onChange={(e)=>setF({...f,paymentReference:e.target.value})} placeholder="Opcional"/></Field>
      <Field label="Documento SII"><select value={f.siiDocumentType} onChange={(e)=>setF({...f,siiDocumentType:e.target.value})}>{quoteInvoiceDocumentTypes.map((t)=><option key={t} value={t}>{docNames[t]}</option>)}</select></Field>
      <Field label="Folio"><input inputMode="numeric" value={f.siiFolio} onChange={(e)=>setF({...f,siiFolio:e.target.value.replace(/\D/g,"")})} required/></Field>
      <Field label="Emisión" hint="Si adjuntas el XML se toma del documento."><DateInput value={f.siiIssueDate} onChange={(iso)=>setF({...f,siiIssueDate:iso})}/></Field>
      <Field label="Factura SII (PDF o XML)" span={3} hint="Obligatoria. Se guarda en un bucket privado; el XML se valida contra tipo, folio, emisor y receptor."><FileInput accept=".pdf,.xml,application/pdf,application/xml,text/xml" file={f.invoice} label="Adjuntar factura del SII" onFile={(file)=>setF({...f,invoice:file})}/></Field>
      <label className="fx-check fx-qp-visible"><input type="checkbox" checked={f.clientVisible} onChange={(e)=>setF({...f,clientVisible:e.target.checked})}/><span>Publicar la factura en el portal del cliente</span></label>
      <Field label="Notas" span={3}><textarea rows={2} value={f.notes} onChange={(e)=>setF({...f,notes:e.target.value})}/></Field>
    </div>
    <p className="fx-hint">Registrar el pago no emite documentos ni consulta al SII: adjunta la factura ya emitida. Nunca se registran datos de tarjeta.</p>
    <Feedback error={action.error}/>
    <div className="fx-actions end"><button className="fx-btn primary" disabled={action.busy||!ready} onClick={async()=>{const r=await action.run(()=>financeApi.post(role,`/quote-payments/installments/${item.id}/mark-paid`,{...f,paidAmount:Number(f.paidAmount),siiDocumentType:Number(f.siiDocumentType),siiFolio:Number(f.siiFolio),siiIssueDate:f.siiIssueDate||null}));if(r)onDone();}}><FileCheck2 size={14}/>Marcar como pagada</button></div>
  </Drawer>;
}

// =========================================================================================== acceso desde Comercial
/** Botón «Pagos» en la tarjeta de una cotización aceptada; abre el calendario en un panel lateral. */
export function QuotePaymentsButton({quoteId,quoteNumber,role}:{quoteId:string;quoteNumber:string;role:Role|string}){
  const[open,setOpen]=useState(false),[mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);useQueryParams((p)=>{if(p.get("payments")===quoteId)setOpen(true);});
  if(!hasFinancePermission(role,"quote_payment.view"))return null;
  // Portal al <body>: el panel no hereda los estilos de la tarjeta comercial que lo contiene.
  return <><button onClick={()=>setOpen(true)}><CalendarDays size={13}/>Pagos</button>
    {open&&mounted?createPortal(<Drawer open wide title={`Calendario de pagos · ${quoteNumber}`} subtitle="Cuotas, pagos registrados y facturas SII adjuntas." onClose={()=>setOpen(false)}><QuotePaymentPanel quoteId={quoteId}/></Drawer>,document.body):null}</>;
}

// =========================================================================================== sección de Finanzas
export function QuotePayments({tick}:ViewProps){
  const{role}=useAccess();const[status,setStatus]=useState("");const[open,setOpen]=useState<string|null>(null);useQueryParams((p)=>{if(p.get("quote"))setOpen(p.get("quote"));});
  const board=useLoad(()=>financeApi.get<QuotePaymentBoard>(role,`/quote-payments${status?`?status=${status}`:""}`),[role,status,tick]);
  const quotes=useLoad(()=>financeApi.get<QuoteRow[]>(role,"/quote-payments/quotes"),[role,tick]);
  const k=board.data?.kpis,clp=k?.byCurrency.CLP;
  return <div className="fx-stack">
    {k?<section className="fx-ticker" aria-label="Indicadores de pagos de cotizaciones">
      <button type="button" className="tone-warning" onClick={()=>setStatus("PAYMENT_OPEN")}><small>Pago habilitado</small><strong>{k.open}</strong><span>{clp?money(clp.open):"—"} por registrar</span></button>
      <button type="button" className="tone-critical" onClick={()=>setStatus("OVERDUE")}><small>Vencidas sin pago</small><strong>{k.overdue}</strong><span>{clp?money(clp.overdue):"—"} vencido</span></button>
      <button type="button" onClick={()=>setStatus("UPCOMING")}><small>Próximos 30 días</small><strong>{k.upcoming30}</strong><span>Aún no habilitadas</span></button>
      <button type="button" className="tone-good" onClick={()=>setStatus("PAID")}><small>Pagadas este mes</small><strong>{k.paidThisMonth}</strong><span>{clp?money(clp.paidThisMonth):"—"} con factura SII</span></button>
    </section>:null}
    <Section eyebrow="COBRANZA DE COTIZACIONES" title="Cuotas" description="Pendientes hasta 2 meses adelante (el calendario completo está en cada cotización) y resueltas de los últimos 90 días. «Registrar pago» se habilita según la anticipación del plan y exige la factura SII." actions={<select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">Todas</option>{["PAYMENT_OPEN","OVERDUE","UPCOMING","PAID","CANCELLED"].map((s)=><option key={s} value={s}>{label(s)}</option>)}</select>}>
      {board.error?<LoadError error={board.error} retry={()=>void board.reload()}/>:!board.data?<Loading/>:<Register rows={board.data.items} rowKey={(i)=>i.id} onRow={(i)=>setOpen(i.quoteId)} columns={[
        {key:"q",label:"Cotización",render:(i)=><><strong>{i.quoteNumber}</strong><small className="block">{i.clientName??i.companyName}</small></>},
        {key:"c",label:"Cuota",render:(i)=>`${i.sequence} · ${periodName(i.periodKey)}`},
        {key:"d",label:"Vence",render:(i)=>day(i.dueDate)},
        {key:"a",label:"Monto",align:"right",render:(i)=><Amount value={i.amount} currency={i.currency}/>},
        {key:"s",label:"Estado",render:(i)=><Pill value={i.effectiveStatus}/>},
        {key:"f",label:"Factura SII",render:(i)=>i.status==="PAID"?`N° ${i.siiFolio}`:i.effectiveStatus==="UPCOMING"?`Se habilita el ${day(i.paymentOpensOn)}`:"—"},
      ]} empty="Sin cuotas para este filtro"/>}
    </Section>
    <Section eyebrow="COTIZACIONES ACEPTADAS" title="Calendarios" description="Crea el calendario de una cotización aceptada (pago único o mensual) o revisa su estado.">
      {quotes.error?<LoadError error={quotes.error} retry={()=>void quotes.reload()}/>:!quotes.data?<Loading/>:<Register rows={quotes.data} rowKey={(q)=>q.id} onRow={(q)=>setOpen(q.id)} columns={[
        {key:"q",label:"Cotización",render:(q)=><><strong>{q.quoteNumber}</strong><small className="block">{q.clientName??q.companyName}</small></>},
        {key:"t",label:"Total",align:"right",render:(q)=><Amount value={q.totalAmount} currency={q.currency}/>},
        {key:"p",label:"Plan",render:(q)=>q.planStatus?<><Pill value={q.planStatus}/> {label(q.frequency)}</>:q.eligibilityReason?<small>{q.eligibilityReason}</small>:<small>Sin calendario</small>},
      ]} empty="No hay cotizaciones aceptadas"/>}
    </Section>
    <Drawer open={Boolean(open)} wide title="Calendario de pagos" subtitle="Cuotas, pagos registrados y facturas SII adjuntas." onClose={()=>setOpen(null)}>{open?<QuotePaymentPanel quoteId={open} onChanged={()=>{void board.reload();void quotes.reload();}}/>:null}</Drawer>
  </div>;
}

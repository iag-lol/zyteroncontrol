"use client";

import Link from "next/link";
import type { ClientFinanceSummary, ProjectFinanceSummary } from "@zyteron/contracts";
import { ArrowUpRight, Landmark } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { financeApi } from "@/lib/finance-api";
import { canFinance, day, label, moment, money } from "@/lib/finance-format";
import { Amount, Empty, LoadError, Loading, Pill, Register, Stamp, useLoad } from "./fx-ui";

/** Client 360 · Finanzas: consume el dominio Finance (sin libro paralelo). */
export function ClientFinancePanel({clientId}:{clientId:string}){
  const{role}=useAccess();const{data,error,reload,loading}=useLoad(()=>financeApi.get<ClientFinanceSummary>(role,`/clients/${clientId}/summary`),[role,clientId]);
  if(!canFinance(role,"invoice.view"))return <Empty title="Sin acceso a la información financiera del cliente"/>;
  if(loading&&!data)return <Loading/>;if(error)return <LoadError error={error} retry={()=>void reload()}/>;if(!data)return null;const d=data;
  return <div className="fx-entity"><header><span className="fx-seal small"><Landmark size={15}/></span><div><small>FINANZAS DEL CLIENTE</small><h2>Resumen financiero</h2></div><Link className="fx-link" href={`/finance/invoices`}>Abrir Finanzas<ArrowUpRight size={12}/></Link></header>
    <section className="fx-ticker small"><div><small>Facturado (neto de NC)</small><strong>{money(d.invoiced)}</strong></div><div><small>Pagado</small><strong>{money(d.paid)}</strong></div><div><small>Saldo</small><strong>{money(d.balance)}</strong></div><div className={d.overdue?"tone-warning":""}><small>Vencido</small><strong>{money(d.overdue)}</strong></div><div><small>Saldo a favor</small><strong>{money(d.creditBalance)}</strong></div><div><small>Próximo cobro</small><strong>{d.nextBilling?money(d.nextBilling.amount):"—"}</strong><span>{d.nextBilling?`${day(d.nextBilling.date)} · ${d.nextBilling.description}`:"Sin programación recurrente"}</span></div></section>
    <Register rows={d.invoices} rowKey={(i)=>i.id} columns={[{key:"n",label:"Documento",render:(i)=><Link href={`/finance/invoices?invoice=${i.id}`}>{i.invoiceNumber}</Link>},{key:"e",label:"Emisión",render:(i)=>day(i.issueDate)},{key:"v",label:"Vence",render:(i)=>day(i.dueDate)},{key:"t",label:"Total",align:"right",render:(i)=><Amount value={i.totalAmount}/>},{key:"b",label:"Saldo",align:"right",render:(i)=><Amount value={i.balanceDue}/>},{key:"s",label:"Estado",render:(i)=><Pill value={i.effectiveStatus}/>}]} empty="El cliente no tiene documentos"/>
    {d.payments.length?<Register rows={d.payments} rowKey={(p)=>p.id} columns={[{key:"r",label:"Pago",render:(p)=>p.paymentReference},{key:"d",label:"Recibido",render:(p)=>moment(p.receivedAt)},{key:"g",label:"Monto",align:"right",render:(p)=><Amount value={p.grossAmount}/>},{key:"s",label:"Estado",render:(p)=><Pill value={p.status}/>}]}/>:null}
    {d.promises.length?<ul className="fx-queue">{d.promises.map((p)=><li key={p.id}><div><strong>Promesa de pago</strong><small>{day(p.promisedDate)}</small></div><Amount value={p.amount}/><Pill value={p.status}/></li>)}</ul>:null}
    <Stamp kind="info">Sin datos de tarjetas: los pagos en línea se procesan en Mercado Pago</Stamp></div>;
}

/** Project 360 · Finanzas: margen y costos sólo para Finanzas/Contabilidad/Gerencia. */
export function ProjectFinancePanel({projectId}:{projectId:string}){
  const{role}=useAccess();const allowed=canFinance(role,"invoice.view");const{data,error,loading}=useLoad(()=>allowed?financeApi.get<ProjectFinanceSummary>(role,`/projects/${projectId}/summary`):Promise.resolve(null),[role,projectId,allowed]);
  if(!allowed)return null;if(loading&&!data)return <section className="fx-entity"><Loading text="Cargando finanzas del proyecto…"/></section>;if(error||!data)return null;const d=data;
  return <section className="fx-entity project" aria-label="Finanzas del proyecto"><header><span className="fx-seal small"><Landmark size={15}/></span><div><small>PROJECT 360 · FINANZAS</small><h2>Rentabilidad del proyecto</h2></div></header>
    <section className="fx-ticker small"><div><small>Valor vendido</small><strong>{d.soldValue===null?"—":money(d.soldValue)}</strong></div><div><small>Facturado</small><strong>{money(d.invoiced)}</strong></div><div><small>Cobrado</small><strong>{money(d.collected)}</strong></div><div><small>Horas registradas</small><strong>{d.laborHours.toLocaleString("es-CL")}</strong></div>
      {canFinance(role,"accounting.view")?<><div><small>Costo laboral</small><strong>{d.laborCost===null?"Sin tarifa":money(d.laborCost)}</strong></div><div><small>Costos directos + gastos</small><strong>{money(d.directCosts+d.expenses)}</strong></div><div className={d.margin!==null&&d.margin<0?"tone-critical":"tone-good"}><small>Margen operacional</small><strong>{d.margin===null?"—":money(d.margin)}</strong><span>{d.marginPercent===null?"":`Margen bruto ${d.marginPercent}%`}</span></div></>:null}</section>
    {d.notes.length?<ul className="fx-assumptions">{d.notes.map((n)=><li key={n}>{n}</li>)}</ul>:null}<small className="fx-hint">Ingresos y costos desde el libro mayor con dimensión proyecto; costo laboral = horas × tarifa de costo vigente ({label("CONFIRMED").toLowerCase()} sólo con tarifa configurada).</small></section>;
}

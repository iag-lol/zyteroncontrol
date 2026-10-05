"use client";

import Link from "next/link";
import { useState } from "react";
import type { CopilotAnswer, FinanceDashboard } from "@zyteron/contracts";
import { ArrowUpRight, Bot, FilePlus2, RefreshCw, Send } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { financeApi } from "@/lib/finance-api";
import { canFinance, day, label, moment, money, monthKey, period } from "@/lib/finance-format";
import { AgingBar, Amount, Empty, Feedback, LoadError, Loading, Pill, Section, Stamp, useAction, useLoad } from "./fx-ui";
import type { ViewProps } from "./finance-workspace";

/** Barras de flujo REAL (entradas vs salidas) por mes; dos series con leyenda y tooltip por barra. */
export function FlowChart({points}:{points:Array<{periodKey:string;inflows:number;outflows:number;kind:string}>}){
  const max=Math.max(1,...points.flatMap((p)=>[p.inflows,p.outflows]));if(!points.some((p)=>p.inflows||p.outflows))return <Empty title="Sin movimientos de caja contabilizados" text="El flujo real se construye desde asientos sobre cuentas de disponible."/>;
  return <figure className="fx-flow"><div className="fx-legend"><span><i className="in"/>Entradas</span><span><i className="out"/>Salidas</span></div><div className="fx-flow-bars">{points.map((p)=><div key={p.periodKey} className={p.kind==="PROJECTION"?"projection":""}><div className="pair"><span className="in" style={{height:`${(p.inflows/max)*100}%`}} title={`${period(p.periodKey)} entradas ${money(p.inflows)}`}/><span className="out" style={{height:`${(p.outflows/max)*100}%`}} title={`${period(p.periodKey)} salidas ${money(p.outflows)}`}/></div><small>{period(p.periodKey)}</small></div>)}</div></figure>;
}

export function CopilotPanel({compact=false}:{compact?:boolean}){
  const{role}=useAccess();const[question,setQuestion]=useState("");const[answers,setAnswers]=useState<CopilotAnswer[]>([]);const action=useAction();
  const ask=async(text:string)=>{if(!text.trim())return;const answer=await action.run(()=>financeApi.post<CopilotAnswer>(role,"/copilot/ask",{question:text}));if(answer){setAnswers((list)=>[answer,...list].slice(0,6));setQuestion("");}};
  const draft=async(answer:CopilotAnswer)=>{await action.run(()=>financeApi.post(role,"/copilot/draft",{description:answer.proposal!.description,lines:answer.proposal!.lines,analysisRunId:answer.id}),"Borrador creado en Libro Diario. Debe revisarlo y contabilizarlo un usuario con permiso.");};
  return <Section className={`fx-copilot${compact?" compact":""}`} eyebrow="CONTADOR ZYTERON" title="Consultas con datos reales" description="Cada respuesta indica período, montos exactos, fuentes y última actualización. No contabiliza, emite, presenta ni paga.">
    <form className="fx-ask" onSubmit={(e)=>{e.preventDefault();void ask(question);}}><Bot size={16}/><input value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="¿Cuánto facturamos en septiembre 2026? · ¿Quiénes nos deben? · Anomalías" aria-label="Pregunta al Contador Zyteron"/><button className="fx-btn primary" disabled={action.busy||!question.trim()}><Send size={14}/>Consultar</button></form>
    <div className="fx-suggestions">{["¿Cuánto facturamos este mes?","¿Quiénes nos deben?","Resultado del mes pasado","IVA del mes","Anomalías"].map((s)=><button key={s} type="button" onClick={()=>void ask(s)}>{s}</button>)}</div>
    <Feedback error={action.error} notice={action.notice}/>
    <div className="fx-answers">{answers.map((a)=><article key={a.id}><header><Pill value={a.intent==="UNKNOWN"?"PENDING":"OK"} text={a.intent}/>{a.period?<span>{day(a.period.from)} → {day(a.period.to)}</span>:null}<time>Actualizado {moment(a.lastUpdated)}</time></header><p>{a.answer}</p>
      {a.amounts.length?<ul className="fx-figures">{a.amounts.map((x)=><li key={x.label}><span>{x.label}</span><Amount value={x.value} strong/></li>)}</ul>:null}
      {a.sources.length?<div className="fx-sources">{a.sources.map((s)=><Link key={s.label} href={s.href}>{s.label}<ArrowUpRight size={12}/></Link>)}</div>:null}
      {a.proposal?<div className="fx-proposal"><Stamp kind="warn">PROPUESTA · NO CONTABILIZADA</Stamp><table><tbody>{a.proposal.lines.map((l,i)=><tr key={i}><td>{l.accountCode}</td><td>{l.debit?money(l.debit):""}</td><td>{l.credit?money(l.credit):""}</td></tr>)}</tbody></table>{canFinance(role,"journal.create")?<button className="fx-btn" onClick={()=>void draft(a)}><FilePlus2 size={14}/>Crear borrador</button>:null}</div>:null}
      <small className="fx-disclaimer">{a.disclaimer}</small></article>)}</div>
  </Section>;
}

export function CommandCenter({periodKey,tick}:ViewProps){
  const{role}=useAccess();const{data,error,loading,reload}=useLoad(()=>financeApi.get<FinanceDashboard>(role,`/dashboard?period=${periodKey}`),[role,periodKey,tick]);const action=useAction(reload);
  if(loading&&!data)return <Loading/>;if(error&&!data)return <LoadError error={error} retry={()=>void reload()}/>;if(!data)return null;const d=data;
  return <div className="fx-command">
    <section className="fx-ticker" aria-label="Indicadores del período">{d.kpis.map((k)=><Link key={k.key} href={k.href} className={`tone-${k.tone.toLowerCase()}`} title={k.definition}><small>{k.label}</small><strong>{money(k.value,k.currency??"CLP")}</strong><span>{k.definition}</span></Link>)}</section>
    <div className="fx-command-grid">
      <Section className="fx-health" eyebrow="SALUD CONTABLE" title={label(d.health.status)} description={d.health.explanation} actions={<button className="fx-btn ghost" onClick={()=>void reload()}><RefreshCw size={14}/>Actualizar</button>}>
        <div className="fx-gauge"><svg viewBox="0 0 120 64" aria-label={`Puntaje ${d.health.score} de 100`}><path d="M10 60 A50 50 0 0 1 110 60" className="track"/><path d="M10 60 A50 50 0 0 1 110 60" className={`value ${d.health.status.toLowerCase()}`} strokeDasharray={`${(d.health.score/100)*157} 157`}/></svg><strong>{d.health.score}</strong><small>/ 100 · controles determinísticos</small></div>
        <ol className="fx-actions-list">{d.actions.length?d.actions.map((a)=><li key={a.key} className={a.severity.toLowerCase()}><Link href={a.drillDown}><Pill value={a.severity}/><span><strong>{a.title}</strong><small>{a.detail}</small></span><em>{a.amount!==null?money(a.amount):`${a.count}`}</em></Link></li>):<li className="ok"><span>Sin acciones pendientes detectadas.</span></li>}</ol>
      </Section>
      <Section className="fx-cash" eyebrow="CAJA Y BANCOS · LIBRO" title={money(d.cash.position)} description="Saldo contable de cuentas de disponible. El flujo real proviene de asientos contabilizados.">
        <ul className="fx-accounts">{d.cash.accounts.map((a)=><li key={a.id}><span>{a.name}</span><small>{label(a.kind==="BANK"?"BANK_TRANSFER":a.kind==="CASH"?"CASH":"OTHER")}</small><Amount value={a.balance} signed/></li>)}{!d.cash.accounts.length?<li className="muted">Sin cuentas de disponible con saldo.</li>:null}</ul>
        <FlowChart points={d.revenueTrend}/>
      </Section>
      <Section eyebrow="CUENTAS POR COBRAR" title={money(d.aging.total)} description="Antigüedad desde la fecha de vencimiento." actions={<Link className="fx-link" href="/finance/collections">Cobranza<ArrowUpRight size={13}/></Link>}><AgingBar buckets={d.aging.buckets}/></Section>
      {d.apAging.buckets.length?<Section eyebrow="CUENTAS POR PAGAR" title={money(d.apAging.total)} actions={<Link className="fx-link" href="/finance/payables">Pagos<ArrowUpRight size={13}/></Link>}><AgingBar buckets={d.apAging.buckets}/></Section>:null}
      <Section eyebrow="VENTAS GANADAS" title="Pendiente de facturar" description="Desde Comercial: nunca se emite una factura automáticamente.">
        {d.pendingToInvoice.length?<ul className="fx-queue">{d.pendingToInvoice.slice(0,6).map((p)=><li key={p.saleId}><div><strong>{p.clientName??"Cliente"}</strong><small>Venta del {day(p.closedAt.slice(0,10))} · facturado {money(p.invoiced)}</small></div><Amount value={p.pending} strong/>{canFinance(role,"invoice.create")?<button className="fx-btn" disabled={action.busy} onClick={()=>void action.run(()=>financeApi.post(role,`/invoices/from-sale/${p.saleId}`),"Borrador de factura creado desde la venta.")}><FilePlus2 size={14}/>Borrador</button>:null}</li>)}</ul>:<Empty title="No hay ventas pendientes de facturar"/>}
        <Feedback error={action.error} notice={action.notice}/>
      </Section>
      <Section eyebrow="PRÓXIMOS 7 DÍAS" title="Vencimientos">
        <ul className="fx-queue">{d.dueSoon.slice(0,6).map((i)=><li key={i.id}><div><strong>{i.clientName??i.clientSnapshot.legalName}</strong><small>{i.invoiceNumber} · vence {day(i.dueDate)}</small></div><Amount value={i.balanceDue}/><Pill value="SCHEDULED" text="Cobro"/></li>)}{d.payablesDue.slice(0,6).map((p)=><li key={p.id}><div><strong>{p.vendorName??"Proveedor"}</strong><small>{p.description.slice(0,50)} · vence {day(p.dueDate)}</small></div><Amount value={-p.balance} signed/><Pill value={p.effectiveStatus}/></li>)}{!d.dueSoon.length&&!d.payablesDue.length?<li className="muted">Sin vencimientos en los próximos 7 días.</li>:null}</ul>
      </Section>
      <Section className="fx-dte-readiness" eyebrow="EMISIÓN ELECTRÓNICA" title={d.dteReadiness.missing.length?"Configuración DTE pendiente":"Base tributaria preparada"} description={d.dteReadiness.missing.length?"La emisión permanece bloqueada hasta completar requisitos reales. No es un error del sistema.":"La configuración base está completa; cada factura todavía valida receptor, aprobación y folios."} actions={<Link className="fx-btn primary" href="/finance/settings#dte-setup">{d.dteReadiness.missing.length?"Completar configuración":"Revisar configuración"}<ArrowUpRight size={13}/></Link>}>
        <div className="fx-readiness-progress"><div><strong>{d.dteReadiness.requirements.filter(item=>item.satisfied).length} de {d.dteReadiness.requirements.length}</strong><span>requisitos listos</span></div><div className="fx-progress-track"><span style={{width:`${Math.round((d.dteReadiness.requirements.filter(item=>item.satisfied).length/Math.max(1,d.dteReadiness.requirements.length))*100)}%`}}/></div><Stamp kind={d.dteReadiness.environment==="PRODUCTION"?"warn":"info"}>{d.dteReadiness.environment==="PRODUCTION"?"Producción":"Certificación sin validez tributaria"}</Stamp></div>
        <ul className="fx-checks">{d.dteReadiness.requirements.map((r)=><li key={r.key} className={r.satisfied?"ok":"missing"}><span>{r.satisfied?"✓":"!"}</span><div><strong>{r.label}</strong><small>{r.detail}</small></div>{!r.satisfied&&r.actionHref?<Link href={r.actionHref}>{r.actionLabel??"Resolver"}<ArrowUpRight size={12}/></Link>:null}</li>)}</ul>
      </Section>
    </div>
    <CopilotPanel/>
    <p className="fx-footnote">Período {period(d.period.periodKey)} · generado {moment(d.generatedAt)} · {periodKey===monthKey()?"mes en curso":"mes histórico"}</p>
  </div>;
}

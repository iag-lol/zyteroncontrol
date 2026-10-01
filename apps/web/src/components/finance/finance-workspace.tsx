"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Landmark, Lock, Radio } from "lucide-react";
import { useAccess } from "@/components/access-context";
import { canFinance, financeSections, financeSectionsFor, monthKey, period } from "@/lib/finance-format";
import { subscribeToFinance } from "@/lib/finance-realtime";
import { CommandCenter } from "./views-command";
import { Collections, Invoices, Payments, Receivables, TaxDocuments } from "./views-revenue";
import { Expenses, Payables, Vendors } from "./views-spend";
import { Banks, Reconciliation } from "./views-treasury";
import { AccountingHome, Budgets, ChartOfAccounts, CostCenters, GeneralLedger, Journal } from "./views-ledger";
import { Closing, Commissions, FinanceSettings, Reports, Taxes } from "./views-management";

export interface ViewProps { periodKey:string; tick:number; segments:string[]; }
const descriptions:Record<string,string>={
  command:"Facturación, cobranza, caja, salud contable y acciones del período en una sola mesa de control.",invoices:"Borradores internos, aprobación y emisión con requisitos tributarios explícitos. Un borrador no es un DTE.",
  "tax-documents":"DTE emitidos y recibidos, folios CAF, certificado y conciliación RCV. Sin scraping ni automatización de sii.cl.",receivables:"Saldos abiertos con antigüedad calculada desde la fecha de vencimiento.",collections:"Prioridad por antigüedad y monto, gestiones, promesas y recordatorios sin spam.",
  payments:"Cobros registrados con evidencia, verificación humana, aplicación a documentos y devoluciones.",payables:"Obligaciones con proveedores, aprobación, programación y pagos respaldados.",vendors:"Proveedores con RUT validado y datos bancarios enmascarados.",
  expenses:"Gastos con respaldo, aprobación por políticas configurables y clasificación explícita del crédito fiscal.",banks:"Cuentas bancarias, cajas e importación de cartolas con detección de duplicados.",reconciliation:"Movimientos bancarios contra cobros, pagos y liquidaciones con sugerencias explicadas.",
  accounting:"Eventos económicos, reglas contables versionadas y períodos.",journal:"Partida doble: TOTAL DEBE = TOTAL HABER o no se contabiliza. Correcciones por reversa.",
  "general-ledger":"Movimientos por cuenta con saldo acumulado y acceso al documento de origen.","chart-of-accounts":"Plan de cuentas jerárquico; sólo las cuentas de último nivel son imputables.","cost-centers":"Dimensiones analíticas para rentabilidad y presupuesto.",
  budgets:"Presupuesto por cuenta y mes contra el libro mayor contabilizado.",taxes:"IVA como estimación interna, preparación F29 y obligaciones con evidencia de presentación.",commissions:"Elegibilidad financiera de comisiones comerciales según cobro real.",
  closing:"Checklist de cierre con controles automáticos, bloqueos y snapshot inmutable.",reports:"Estados financieros y libros con exportación auditada (CSV, XLSX, PDF).",settings:"Empresa, emisión electrónica, pagos en línea, tolerancias y catálogos.",
};

export function FinanceWorkspace({segments}:{segments:string[]}){
  const{role}=useAccess();const view=segments[0]||"command";const section=financeSections.find((s)=>s.key===view)??financeSections[0]!;
  const[periodKey,setPeriodKey]=useState(monthKey());const[tick,setTick]=useState(0);const[live,setLive]=useState(false);
  useEffect(()=>{const unsubscribe=subscribeToFinance(role,()=>setTick((t)=>t+1));setLive(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL));return unsubscribe;},[role]);
  const groups=useMemo(()=>{const map=new Map<string,typeof financeSections>();for(const s of financeSectionsFor(role)){const list=map.get(s.group)??[];list.push(s);map.set(s.group,list);}return[...map.entries()];},[role]);
  const allowed=canFinance(role,section.permission);const props:ViewProps={periodKey,tick,segments};
  return <main className="fx-workspace">
    <header className="fx-masthead">
      <div className="fx-title"><span className="fx-seal"><Landmark size={18}/></span><div><small>FINANCIAL OPERATIONS · ZYTERON SPA</small><h1>{section.label}</h1><p>{descriptions[section.key]}</p></div></div>
      <div className="fx-period"><label><span>Período</span><input type="month" value={periodKey} max={monthKey()} onChange={(e)=>e.target.value&&setPeriodKey(e.target.value)}/></label><strong>{period(periodKey)}</strong><span className={`fx-live${live?" on":""}`} title={live?"Actualización en tiempo real activa":"Tiempo real no configurado: usa Actualizar"}><Radio size={12}/>{live?"En vivo":"Manual"}</span></div>
    </header>
    <nav className="fx-rail" aria-label="Secciones de Finanzas">{groups.map(([group,items])=><div key={group}><span>{group}</span>{items.map((s)=><Link key={s.key} href={s.href} className={s.key===section.key?"active":""} aria-current={s.key===section.key?"page":undefined}>{s.label}</Link>)}</div>)}</nav>
    {!allowed?<section className="fx-denied"><Lock size={22}/><h2>Sin acceso a {section.label}</h2><p>Tu rol no tiene el permiso <code>{section.permission}</code>. El acceso se controla en la API y en la base de datos (RLS), no sólo en esta pantalla.</p></section>
    :view==="command"?<CommandCenter {...props}/>:view==="invoices"?<Invoices {...props}/>:view==="tax-documents"?<TaxDocuments {...props}/>:view==="receivables"?<Receivables {...props}/>:view==="collections"?<Collections {...props}/>:view==="payments"?<Payments {...props}/>
    :view==="payables"?<Payables {...props}/>:view==="vendors"?<Vendors {...props}/>:view==="expenses"?<Expenses {...props}/>:view==="banks"?<Banks {...props}/>:view==="reconciliation"?<Reconciliation {...props}/>
    :view==="accounting"?<AccountingHome {...props}/>:view==="journal"?<Journal {...props}/>:view==="general-ledger"?<GeneralLedger {...props}/>:view==="chart-of-accounts"?<ChartOfAccounts {...props}/>:view==="cost-centers"?<CostCenters {...props}/>:view==="budgets"?<Budgets {...props}/>
    :view==="taxes"?<Taxes {...props}/>:view==="commissions"?<Commissions {...props}/>:view==="closing"?<Closing {...props}/>:view==="reports"?<Reports {...props}/>:view==="settings"?<FinanceSettings {...props}/>:<CommandCenter {...props}/>}
  </main>;
}

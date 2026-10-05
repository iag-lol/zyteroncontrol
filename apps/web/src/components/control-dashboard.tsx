"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CircleDollarSign, FolderKanban, Globe2, Headphones, ReceiptText, ShieldAlert, Users } from "lucide-react";
import type { ExecutiveDashboard } from "@zyteron/contracts";
import { useAccess } from "@/components/access-context";
import { executiveDashboard } from "@/lib/executive-api";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function ControlDashboard() {
  const {role}=useAccess();
  const [data,setData]=useState<ExecutiveDashboard|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(() => {
    let active=true;setLoading(true);
    void executiveDashboard(role).then(result=>{if(active){setData(result);setError("");}}).catch((cause:Error)=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  }, [role]);

  const source=(domain:string)=>data?.sources.find(item=>item.domain===domain)?.status??"UNAVAILABLE";
  const value=(domain:string,amount:number,format:"count"|"money"="count")=>source(domain)==="OK"?(format==="money"?money.format(amount):String(amount)):"—";
  const m=data?.metrics;

  const metrics = [
    ["Ventas del mes",value("COMERCIAL",m?.salesThisMonth??0,"money"),"Ventas ganadas en CLP",CircleDollarSign],
    ["Pipeline",value("COMERCIAL",m?.pipelineValue??0,"money"),`${m?.pipelineCount??0} oportunidades abiertas`,ArrowUpRight],
    ["Clientes activos",value("CLIENTES",m?.activeClients??0),`${m?.newClientsThisMonth??0} incorporados este mes`,Users],
    ["Proyectos activos",value("OPERACIONES",m?.activeProjects??0),`${m?.overdueProjects??0} fuera de plazo`,FolderKanban],
    ["OT abiertas",value("OPERACIONES",m?.openWorkOrders??0),"Pendientes de cierre operacional",FolderKanban],
    ["Cotizaciones abiertas",value("COMERCIAL",m?.pendingQuotes??0),"Incluye aprobación, envío y negociación",CircleDollarSign],
    ["Sitios online",value("MONITOREO",m?.onlineMonitors??0),`${m?.downMonitors??0} monitores caídos`,Globe2],
    ["Incidentes críticos",value("MONITOREO",m?.criticalIncidents??0),"Incidentes operacionales activos",ShieldAlert],
    ["SSL en riesgo",value("MONITOREO",m?.sslExpiring??0),"Por vencer, vencidos o inválidos",ShieldAlert],
    ["Personal activo",value("RRHH",m?.activeEmployees??0),"Fuente canónica People Operations",Users],
    ["Tareas vencidas",value("OPERACIONES",m?.overdueTasks??0),"Trabajo aún no finalizado",FolderKanban],
    ["Auditorías pendientes",value("AUDITORIAS",m?.pendingAudits??0),"Programadas o en ejecución",ShieldAlert],
    ["Facturas pendientes",value("FINANZAS",m?.pendingInvoices??0),`${m?.overdueReceivables??0} vencidas`,ReceiptText],
    ["Tickets críticos",value("SOPORTE",m?.criticalTickets??0),"Tickets activos con severidad crítica",Headphones],
    ["Eventos de seguridad",value("SEGURIDAD",m?.securityEvents??0),"Eventos registrados en 30 días",ShieldAlert],
  ] as const;

  return (
    <main className="dashboardContent">
      <header className="pageHeader">
        <div>
          <span className="phasePill">Fase A · Arquitectura empresarial</span>
          <h1>Resumen ejecutivo</h1>
          <p>Visión operacional de Zyteron Control para Gerencia General.</p>
        </div>
        <div className={`connectionStatus ${data ? "online" : "offline"}`}>
          <span />{loading?"Consolidando dominios…":data?.status==="OK"?"Todos los dominios conectados":data?`${data.sources.filter(item=>item.status!=="OK").length} dominios degradados`:"API sin conexión"}
        </div>
      </header>

      <section className="compactOverview">
        <div>
          <p className="eyebrow light">Centro de control</p>
          <h2>Operación empresarial,<br />sin perder el contexto.</h2>
        </div>
        <div className="overviewValue">
          <span>Pipeline registrado</span>
          <strong>{value("COMERCIAL",m?.pipelineValue??0,"money")}</strong>
          <small>{m?.pipelineCount?`${m.pipelineCount} oportunidades activas`:"Sin oportunidades abiertas"}</small>
        </div>
      </section>

      <section className="executiveMetrics" aria-label="Indicadores ejecutivos">
        {metrics.map(([label, value, detail, Icon]) => <article key={label}><span className="metricIcon"><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}
      </section>

      <section className="emptyOperations">
        <div><p className="eyebrow">Atención requerida</p><h2>Actividad operacional</h2></div>
        {error?<div className="enterpriseEmptyState"><span>!</span><strong>No fue posible consolidar los dominios</strong><p>{error}</p></div>:data?.attention.length?<div className="executiveAttentionList">{data.attention.slice(0,8).map(item=><Link href={item.href} key={`${item.domain}-${item.label}`}><span>{item.count}</span><strong>{item.label}</strong><small>{item.domain}</small><ArrowUpRight size={15}/></Link>)}</div>:<div className="enterpriseEmptyState"><span>✓</span><strong>Sin actividad pendiente</strong><p>No hay señales críticas ni vencimientos operacionales.</p></div>}
      </section>

    </main>
  );
}

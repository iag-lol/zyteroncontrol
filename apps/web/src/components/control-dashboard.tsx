"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CircleDollarSign, FolderKanban, Globe2, Headphones, ReceiptText, ShieldAlert, Users } from "lucide-react";
import type { CommercialRecord, PipelineSummary } from "@zyteron/contracts";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function ControlDashboard() {
  const [records, setRecords] = useState<CommercialRecord[]>([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    const role = process.env.NEXT_PUBLIC_DEV_ROLE;

    fetch(`${apiUrl}/crm/pipeline`, {
      headers: role ? { "x-zyteron-role": role } : {},
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("API no disponible");
        return response.json() as Promise<PipelineSummary>;
      })
      .then((summary) => {
        setRecords(summary.records);
        setOnline(true);
      })
      .catch(() => setOnline(false));

    return () => controller.abort();
  }, []);

  const totalValue = useMemo(
    () => records.reduce((sum, record) => sum + record.valueClp, 0),
    [records],
  );

  const metrics = [
    ["Ventas del mes", "Sin datos", "No hay ventas registradas", CircleDollarSign],
    ["Pipeline", money.format(totalValue), `${records.length} registros activos`, ArrowUpRight],
    ["Clientes activos", "Sin datos", "No hay clientes registrados", Users],
    ["Ingresos", "Sin datos", "No hay ingresos registrados", ReceiptText],
    ["Proyectos activos", "Sin datos", "No hay proyectos registrados", FolderKanban],
    ["Proyectos atrasados", "Sin datos", "Sin información de plazos", FolderKanban],
    ["OT pendientes", "Sin datos", "No existen OT registradas", FolderKanban],
    ["Cotizaciones pendientes", "Sin datos", "No existen cotizaciones", CircleDollarSign],
    ["Sitios online", "Sin datos", "Sin sitios monitoreados", Globe2],
    ["Sitios caídos", "Sin datos", "Sin sitios monitoreados", Globe2],
    ["Incidentes críticos", "0", "No hay incidentes activos", ShieldAlert],
    ["SSL próximos a vencer", "Sin datos", "Sin certificados registrados", ShieldAlert],
    ["Personal activo", "Sin datos", "Sin personal registrado", Users],
    ["Programadores ocupados", "Sin datos", "Sin asignaciones registradas", Users],
    ["Tareas vencidas", "Sin datos", "Sin tareas registradas", FolderKanban],
    ["Auditorías pendientes", "Sin datos", "Sin auditorías registradas", ShieldAlert],
    ["Facturas pendientes", "Sin datos", "Sin facturas registradas", ReceiptText],
    ["Pagos atrasados", "Sin datos", "Sin pagos registrados", ReceiptText],
    ["Tickets críticos", "0", "No hay tickets activos", Headphones],
    ["Eventos de seguridad", "0", "No hay eventos registrados", ShieldAlert],
  ] as const;

  return (
    <main className="dashboardContent">
      <header className="pageHeader">
        <div>
          <span className="phasePill">Fase A · Arquitectura empresarial</span>
          <h1>Resumen ejecutivo</h1>
          <p>Visión operacional de Zyteron Control para Gerencia General.</p>
        </div>
        <div className={`connectionStatus ${online ? "online" : "offline"}`}>
          <span />{online ? "API conectada" : "API sin conexión"}
        </div>
      </header>

      <section className="compactOverview">
        <div>
          <p className="eyebrow light">Centro de control</p>
          <h2>Operación empresarial,<br />sin perder el contexto.</h2>
        </div>
        <div className="overviewValue">
          <span>Pipeline registrado</span>
          <strong>{money.format(totalValue)}</strong>
          <small>{records.length ? `${records.length} iniciativas activas` : "Sin registros comerciales"}</small>
        </div>
      </section>

      <section className="executiveMetrics" aria-label="Indicadores ejecutivos">
        {metrics.map(([label, value, detail, Icon]) => <article key={label}><span className="metricIcon"><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}
      </section>

      <section className="emptyOperations">
        <div><p className="eyebrow">Atención requerida</p><h2>Actividad operacional</h2></div>
        <div className="enterpriseEmptyState"><span>✓</span><strong>Sin actividad pendiente</strong><p>No hay incidentes, tareas vencidas ni aprobaciones registradas.</p></div>
      </section>

    </main>
  );
}

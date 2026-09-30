"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CommercialRecord,
  PipelineStage,
  PipelineSummary,
} from "@zyteron/contracts";

const stageLabels: Record<PipelineStage, string> = {
  LEAD: "Leads",
  OPPORTUNITY: "Oportunidades",
  QUOTE: "Cotizaciones",
  WORK_ORDER: "Órdenes de trabajo",
  PROJECT: "Proyectos",
};

const stages = Object.keys(stageLabels) as PipelineStage[];

const fallbackRecords: CommercialRecord[] = [
  {
    id: "demo-1",
    company: "Andes Retail",
    contact: "Camila Torres",
    title: "Portal de proveedores",
    valueClp: 8_400_000,
    stage: "OPPORTUNITY",
    owner: "Valentina M.",
    updatedAt: "2026-09-29T14:20:00.000Z",
  },
  {
    id: "demo-2",
    company: "Norte Logística",
    contact: "Diego Soto",
    title: "Automatización operacional",
    valueClp: 12_900_000,
    stage: "QUOTE",
    owner: "Ignacio R.",
    updatedAt: "2026-09-30T09:10:00.000Z",
  },
  {
    id: "demo-3",
    company: "Fundación Horizonte",
    contact: "Fernanda Ruiz",
    title: "Plataforma de membresías",
    valueClp: 6_200_000,
    stage: "WORK_ORDER",
    owner: "Valentina M.",
    updatedAt: "2026-09-28T18:05:00.000Z",
  },
];

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function ControlDashboard() {
  const [records, setRecords] = useState(fallbackRecords);
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

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Zyteron Control">
          <span className="brandMark">Z</span>
          <span>Zyteron</span>
        </a>
        <nav aria-label="Navegación principal">
          <a className="navItem active" href="#resumen">Resumen</a>
          <a className="navItem" href="#pipeline">Comercial</a>
          <a className="navItem" href="#pipeline">Proyectos</a>
          <a className="navItem" href="#activity">Operaciones</a>
        </nav>
        <div className="sidebarFooter">
          <span className={`statusDot ${online ? "online" : "demo"}`} />
          {online ? "API conectada" : "Datos de demostración"}
        </div>
      </aside>

      <section className="workspace" id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow">Miércoles · 30 septiembre</p>
            <h1>Centro de control</h1>
          </div>
          <div className="profile">
            <span className="profileText"><strong>Eduardo Avila</strong>Gerencia general</span>
            <span className="avatar">EA</span>
          </div>
        </header>

        <div className="content">
          <section className="hero" id="resumen">
            <div>
              <p className="eyebrow light">Visión ejecutiva</p>
              <h2>Todo lo importante,<br />en un solo lugar.</h2>
              <p className="heroCopy">El pulso comercial y operacional de Zyteron, actualizado para tomar decisiones rápidas.</p>
            </div>
            <div className="heroMetric">
              <span>Pipeline activo</span>
              <strong>{money.format(totalValue)}</strong>
              <small>{records.length} iniciativas en seguimiento</small>
            </div>
          </section>

          <section className="metricGrid" aria-label="Indicadores principales">
            <article className="metricCard"><span>Oportunidades</span><strong>{records.filter((r) => r.stage === "OPPORTUNITY").length}</strong><small>En calificación comercial</small></article>
            <article className="metricCard"><span>Cotizaciones</span><strong>{records.filter((r) => r.stage === "QUOTE").length}</strong><small>Pendientes de decisión</small></article>
            <article className="metricCard"><span>Órdenes</span><strong>{records.filter((r) => r.stage === "WORK_ORDER").length}</strong><small>Listas para handoff</small></article>
            <article className="metricCard accent"><span>Disponibilidad</span><strong>99,98%</strong><small>Últimos 30 días</small></article>
          </section>

          <section className="sectionBlock" id="pipeline">
            <div className="sectionHeading">
              <div><p className="eyebrow">Flujo principal</p><h2>Pipeline comercial</h2></div>
              <button type="button">+ Nuevo lead</button>
            </div>
            <div className="pipeline">
              {stages.map((stage) => {
                const items = records.filter((record) => record.stage === stage);
                return (
                  <article className="stage" key={stage}>
                    <div className="stageHeader"><span>{stageLabels[stage]}</span><b>{items.length}</b></div>
                    {items.length === 0 ? <p className="empty">Sin registros</p> : items.map((record) => (
                      <div className="deal" key={record.id}>
                        <span className="company">{record.company}</span>
                        <strong>{record.title}</strong>
                        <span className="amount">{money.format(record.valueClp)}</span>
                        <div className="dealMeta"><span>{record.owner}</span><span>{new Date(record.updatedAt).toLocaleDateString("es-CL")}</span></div>
                      </div>
                    ))}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="activity" id="activity">
            <div><p className="eyebrow">Próximas acciones</p><h2>Atención requerida</h2></div>
            <div className="activityRows">
              <p><span className="activityIcon amber">01</span><strong>Revisar cotización Norte Logística</strong><small>Vence hoy · Comercial</small></p>
              <p><span className="activityIcon blue">02</span><strong>Preparar handoff Fundación Horizonte</strong><small>Mañana · Desarrollo</small></p>
              <p><span className="activityIcon green">03</span><strong>Validar disponibilidad mensual</strong><small>Viernes · Operaciones</small></p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}


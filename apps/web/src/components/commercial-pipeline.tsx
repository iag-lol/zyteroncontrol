"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { CommercialRecord, PipelineStage, PipelineSummary } from "@zyteron/contracts";
import { PageHeader } from "@/components/enterprise/page-header";

const stages: Array<{ id: PipelineStage; label: string }> = [
  { id: "LEAD", label: "Leads" },
  { id: "OPPORTUNITY", label: "Oportunidades" },
  { id: "QUOTE", label: "Cotizaciones" },
  { id: "WORK_ORDER", label: "Órdenes de trabajo" },
  { id: "PROJECT", label: "Proyectos" },
];

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function CommercialPipeline() {
  const [records, setRecords] = useState<CommercialRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lead, setLead] = useState({ company: "", contact: "", title: "", owner: "", valueClp: "" });

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    const role = process.env.NEXT_PUBLIC_DEV_ROLE;
    fetch(`${api}/crm/pipeline`, { headers: role ? { "x-zyteron-role": role } : {} })
      .then((response) => response.ok ? response.json() as Promise<PipelineSummary> : Promise.reject())
      .then((summary) => setRecords(summary.records))
      .catch(() => setRecords([]));
  }, []);

  const total = useMemo(() => records.reduce((sum, item) => sum + item.valueClp, 0), [records]);

  async function createLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const role = process.env.NEXT_PUBLIC_DEV_ROLE;
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (role) headers["x-zyteron-role"] = role;
      const response = await fetch(`${api}/crm/records`, { method: "POST", headers, body: JSON.stringify({ ...lead, stage: "LEAD", valueClp: Number(lead.valueClp) }) });
      if (!response.ok) throw new Error("No fue posible guardar el lead.");
      const created = (await response.json()) as CommercialRecord;
      setRecords((current) => [created, ...current]);
      setLead({ company: "", contact: "", title: "", owner: "", valueClp: "" }); setShowForm(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error inesperado."); }
    finally { setSubmitting(false); }
  }

  return <main className="modulePage">
    <PageHeader eyebrow="Comercial" title="Pipeline" description="Flujo Lead → Oportunidad → Cotización → Orden de trabajo → Proyecto." actions={<button className="pagePrimaryAction" onClick={() => setShowForm(true)}>+ Nuevo lead</button>} />
    <section className="pipelineSummary"><div><small>Valor registrado</small><strong>{money.format(total)}</strong></div><div><small>Registros activos</small><strong>{records.length}</strong></div></section>
    <section className="sectionBlock"><div className="pipeline">{stages.map((stage) => { const items = records.filter((record) => record.stage === stage.id); return <article className="stage" key={stage.id}><div className="stageHeader"><span>{stage.label}</span><b>{items.length}</b></div>{items.length ? items.map((record) => <div className="deal" key={record.id}><span className="company">{record.company}</span><strong>{record.title}</strong><span className="amount">{money.format(record.valueClp)}</span><div className="dealMeta"><span>{record.owner}</span><span>{new Date(record.updatedAt).toLocaleDateString("es-CL")}</span></div></div>) : <p className="empty">Sin registros</p>}</article>; })}</div></section>
    {showForm ? <div className="modalBackdrop" role="presentation" onMouseDown={() => setShowForm(false)}><section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modalHeader"><div><p className="eyebrow">Pipeline comercial</p><h2>Nuevo lead</h2></div><button className="closeButton" onClick={() => setShowForm(false)}>×</button></div><form onSubmit={createLead}><label>Empresa<input required value={lead.company} onChange={(event) => setLead({ ...lead, company: event.target.value })} /></label><label>Contacto<input required value={lead.contact} onChange={(event) => setLead({ ...lead, contact: event.target.value })} /></label><label className="wide">Iniciativa<input required value={lead.title} onChange={(event) => setLead({ ...lead, title: event.target.value })} /></label><label>Responsable<input required value={lead.owner} onChange={(event) => setLead({ ...lead, owner: event.target.value })} /></label><label>Valor estimado (CLP)<input required min="0" type="number" value={lead.valueClp} onChange={(event) => setLead({ ...lead, valueClp: event.target.value })} /></label>{error ? <p className="formError">{error}</p> : null}<div className="formActions"><button className="secondaryButton" type="button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primaryButton" disabled={submitting}>{submitting ? "Guardando…" : "Crear lead"}</button></div></form></section></div> : null}
  </main>;
}

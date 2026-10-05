"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Download, Filter, Grid2X2, HeartPulse, Import, List, Plus, Rows3, Search, SlidersHorizontal } from "lucide-react";
import type { Client, ClientListResponse } from "@zyteron/contracts";
import { useAccess } from "@/components/access-context";
import { clientsApi } from "@/lib/clients-api";
import { formatDate } from "@/lib/date-time";

type ViewMode = "table" | "cards" | "compact";
const emptyResponse: ClientListResponse = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0, summary: { active: null, newThisMonth: null, onboarding: null, activeProjects: null, criticalIncidents: null, pendingPayments: null, upcomingRenewals: null, inactiveRelationship: null } };

const metricConfig = [
  ["active", "Clientes activos", "status", "ACTIVE"], ["newThisMonth", "Nuevos este mes", "created", "month"],
  ["onboarding", "En onboarding", "status", "ONBOARDING"], ["activeProjects", "Con proyectos activos", "project", "active"],
  ["criticalIncidents", "Incidencias críticas", "incident", "critical"], ["pendingPayments", "Pagos pendientes", "debt", "true"],
  ["upcomingRenewals", "Renovaciones próximas", "renewal", "true"], ["inactiveRelationship", "Sin actividad reciente", "activity", "stale"],
] as const;

export function ClientHub() {
  const { role } = useAccess();
  const [data, setData] = useState<ClientListResponse>(emptyResponse);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [health, setHealth] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ page: "1", pageSize: "25" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (health) params.set("health", health);
      clientsApi.list(role, params).then(setData).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [health, role, search, status]);

  const availableMetrics = useMemo(() => metricConfig.map(([key, label, filter, value]) => ({ key, label, filter, value, count: data.summary[key] })), [data.summary]);

  function applyMetric(filter: string, value: string) {
    if (filter === "status") setStatus(value);
  }

  function exportCsv() {
    if (!data.items.length) return;
    const rows = [["Razón social", "Nombre fantasía", "RUT", "Estado", "Health", "Email"], ...data.items.map((client) => [client.legalName, client.tradeName ?? "", client.rut, client.status, client.health, client.generalEmail ?? ""] )];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "clientes-zyteron.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  return <main className="clientHub">
    <header className="clientHubHeader">
      <div><span className="clientKicker">Client Operations Hub</span><h1>Clientes</h1><p>Gestión integral de cartera, relación comercial, operación y servicios.</p></div>
      <div className="clientHeaderActions">
        <Link className="clientPrimaryButton" href="/clients/new"><Plus size={16}/> Nuevo cliente</Link>
        <button disabled title="La importación masiva se habilitará al completar el mapeo de campos."><Import size={15}/> Importar</button>
        <button onClick={exportCsv} disabled={!data.items.length} title={data.items.length ? "Exportar la vista actual" : "No hay clientes para exportar"}><Download size={15}/> Exportar</button>
        <button disabled={!selected.length} title={selected.length ? "Aplicar acción a la selección" : "Selecciona al menos un cliente"}><Rows3 size={15}/> Acciones masivas</button>
      </div>
    </header>

    <section className="portfolioStrip" aria-label="Resumen de cartera">
      <div className="portfolioIntro"><Building2 size={22}/><span><strong>Estado de cartera</strong><small>Indicadores calculados con datos disponibles</small></span></div>
      <div className="portfolioMetrics">{availableMetrics.map((metric) => <button key={metric.key} onClick={() => metric.count !== null && applyMetric(metric.filter, metric.value)} disabled={metric.count === null} title={metric.count === null ? "Cálculo pendiente de integración con el dominio de origen" : `Filtrar por ${metric.label}`}>
        <strong>{metric.count === null ? "—" : metric.count}</strong><span>{metric.label}</span><small>{metric.count === null ? "Integración pendiente" : "Aplicar filtro"}</small>
      </button>)}</div>
    </section>

    <section className="clientWorkspace">
      <div className="clientToolbar">
        <label className="clientSearch"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por empresa, RUT, contacto, email o dominio" /></label>
        <button className={filtersOpen ? "active" : ""} onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={15}/> Filtros avanzados</button>
        <div className="viewSwitcher" aria-label="Cambiar vista">
          <button className={view === "table" ? "active" : ""} onClick={() => setView("table")} aria-label="Vista tabla"><List size={15}/></button>
          <button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")} aria-label="Vista cards"><Grid2X2 size={15}/></button>
          <button className={view === "compact" ? "active" : ""} onClick={() => setView("compact")} aria-label="Vista compacta"><Rows3 size={15}/></button>
        </div>
      </div>
      {filtersOpen ? <div className="advancedFilters"><Filter size={17}/><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="ACTIVE">Activo</option><option value="ONBOARDING">Onboarding</option><option value="INACTIVE">Inactivo</option><option value="ARCHIVED">Archivado</option></select></label><label>Health<select value={health} onChange={(event) => setHealth(event.target.value)}><option value="">Todos</option><option value="HEALTHY">Saludable</option><option value="ATTENTION">Atención</option><option value="RISK">Riesgo</option><option value="CRITICAL">Crítico</option><option value="INSUFFICIENT_DATA">Información insuficiente</option></select></label><button onClick={() => { setStatus(""); setHealth(""); }}>Limpiar filtros</button></div> : null}
      {error ? <div className="clientError">{error}</div> : null}
      {loading ? <ClientSkeleton/> : data.items.length ? <ClientResults items={data.items} view={view} selected={selected} onSelected={setSelected}/> : <div className="clientEmpty"><span><HeartPulse size={24}/></span><h2>No hay clientes en esta vista</h2><p>{search || status || health ? "Ajusta los filtros o limpia la búsqueda." : "Crea el primer cliente para iniciar su relación comercial y operacional."}</p><Link href="/clients/new"><Plus size={15}/> Crear primer cliente</Link></div>}
      <footer className="clientPagination"><span>{data.total} clientes · Página {data.page} de {Math.max(1, data.totalPages)}</span><small>Paginación procesada en servidor · 25 por página</small></footer>
    </section>
  </main>;
}

function ClientResults({ items, view, selected, onSelected }: { items: Client[]; view: ViewMode; selected: string[]; onSelected: (ids: string[]) => void }) {
  if (view === "cards") return <div className="clientCardGrid">{items.map((client) => <Link className="clientPortfolioCard" href={`/clients/${client.id}`} key={client.id}><div className="clientAvatar">{initials(client)}</div><span className={`clientHealth ${client.health.toLowerCase()}`}>{healthLabel(client.health)}</span><h3>{client.tradeName || client.legalName}</h3><p>{client.legalName}</p><dl><div><dt>RUT</dt><dd>{client.rut}</dd></div><div><dt>Estado</dt><dd>{statusLabel(client.status)}</dd></div><div><dt>Desde</dt><dd>{formatDate(client.createdAt)}</dd></div></dl></Link>)}</div>;
  if (view === "compact") return <div className="clientCompactList">{items.map((client) => <Link href={`/clients/${client.id}`} key={client.id}><span className="clientAvatar small">{initials(client)}</span><strong>{client.tradeName || client.legalName}</strong><span>{client.rut}</span><span>{statusLabel(client.status)}</span><b className={`clientHealth ${client.health.toLowerCase()}`}>{healthLabel(client.health)}</b></Link>)}</div>;
  return <div className="clientTableWrap"><table><thead><tr><th><span className="srOnly">Seleccionar</span></th><th>Cliente</th><th>RUT</th><th>Ejecutivo/a</th><th>Servicios activos</th><th>Proyectos</th><th>Health</th><th>Estado</th><th>Última actividad</th></tr></thead><tbody>{items.map((client) => <tr key={client.id}><td><input type="checkbox" checked={selected.includes(client.id)} onChange={(event) => onSelected(event.target.checked ? [...selected, client.id] : selected.filter((id) => id !== client.id))}/></td><td><Link href={`/clients/${client.id}`}><span className="clientAvatar small">{initials(client)}</span><span><strong>{client.tradeName || client.legalName}</strong><small>{client.generalEmail ?? "Sin email general"}</small></span></Link></td><td>{client.rut}</td><td>{client.accountExecutiveId ?? "Sin asignar"}</td><td>{client.activeServiceCount??"—"}</td><td>{client.activeProjectCount??"—"}</td><td><span className={`clientHealth ${client.health.toLowerCase()}`}>{healthLabel(client.health)}</span></td><td>{statusLabel(client.status)}</td><td>{formatDate(client.lastActivityAt??client.updatedAt)}</td></tr>)}</tbody></table></div>;
}

function ClientSkeleton() { return <div className="clientSkeleton" aria-label="Cargando clientes">{Array.from({ length: 6 }, (_, index) => <span key={index}/>)}</div>; }
function initials(client: Client) { return (client.tradeName || client.legalName).split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }
function statusLabel(status: Client["status"]) { return ({ ACTIVE: "Activo", ONBOARDING: "Onboarding", INACTIVE: "Inactivo", ARCHIVED: "Archivado" })[status]; }
function healthLabel(health: Client["health"]) { return ({ HEALTHY: "Saludable", ATTENTION: "Atención", RISK: "Riesgo", CRITICAL: "Crítico", INSUFFICIENT_DATA: "Sin datos" })[health]; }

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, BriefcaseBusiness, Building2, CalendarClock, CircleDollarSign, ContactRound, FileStack, Globe2, MonitorCheck, MoreHorizontal, Plus, Receipt, Settings, ShieldCheck, TicketCheck, Upload, Wrench } from "lucide-react";
import type { Client, ClientContact, ClientContract, ClientEvent, ClientPortalSettings, ClientRenewal, ClientService, OperationsProject, RelatedAuditSnapshot, RelatedSupportSnapshot, Sale, SalesFollowUp, SalesOpportunity, SalesQuote, WorkOrder } from "@zyteron/contracts";
import { useAccess } from "@/components/access-context";
import { ClientFinancePanel } from "@/components/finance/entity-finance-panels";
import { hasFinancePermission } from "@zyteron/contracts";
import { contractsApi, renewalsApi } from "@/lib/client-domain-api";
import { clientsApi } from "@/lib/clients-api";
import { subscribeToClient } from "@/lib/clients-realtime";
import { formatDate, formatDateTime, toIsoDate } from "@/lib/date-time";
import { commercialApi } from "@/lib/commercial-api";
import { operationsApi } from "@/lib/operations-api";

const tabs = [
  ["summary", "Resumen"], ["contacts", "Contactos"], ["commercial", "Comercial"], ["contracts", "Contratos"], ["services", "Servicios"], ["renewals", "Renovaciones"],
  ["projects", "Proyectos"], ["work-orders", "OT"], ["documents", "Documentos"], ["finance", "Finanzas"],
  ["support", "Soporte"], ["monitoring", "Monitoreo"], ["audits", "Auditorías"], ["activity", "Actividad"],
  ["portal", "Portal cliente"], ["settings", "Configuración"],
] as const;
type ClientTab = (typeof tabs)[number][0];

export function Client360({ id, initialTab = "summary" }: { id: string; initialTab?: string }) {
  const { role } = useAccess();
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [services, setServices] = useState<ClientService[]>([]);
  const [renewals, setRenewals] = useState<ClientRenewal[]>([]);
  const [activity, setActivity] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tab = (tabs.some(([key]) => key === initialTab) ? initialTab : "summary") as ClientTab;
  const canManage = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"].includes(role);
  const visibleTabs = useMemo(() => tabs.filter(([key]) => key !== "finance" || hasFinancePermission(role, "invoice.view")), [role]);

  const refresh = () => Promise.all([
    clientsApi.get(role, id),
    clientsApi.contacts(role, id),
    contractsApi.list(role, new URLSearchParams({ clientId: id, pageSize: "100" })),
    clientsApi.services(role, id),
    renewalsApi.list(role, new URLSearchParams({ clientId: id, pageSize: "100" })),
    clientsApi.activity(role, id),
  ])
    .then(([clientData, contactData, contractData, serviceData, renewalData, activityData]) => {
      setClient(clientData);
      setContacts(contactData);
      setContracts(contractData.items);
      setServices(serviceData);
      setRenewals(renewalData.items);
      setActivity(activityData);
      setError("");
    })
    .catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  useEffect(() => {
    setLoading(true);
    void refresh();
    return subscribeToClient(id, () => { void refresh(); });
  }, [id, role]);

  if (loading) return <Client360Skeleton/>;
  if (error || !client) return <main className="client360"><div className="clientError">{error || "Cliente no encontrado."}</div><Link href="/clients">Volver a clientes</Link></main>;

  return <main className="client360">
    <Link className="clientBack" href="/clients"><ArrowLeft size={15}/> Volver a la cartera</Link>
    <header className="client360Header">
      <div className="clientCompanyIdentity"><span className="clientLogo">{initials(client)}</span><div><span className="clientKicker">Client 360°</span><h1>{client.tradeName || client.legalName}</h1><p>{client.legalName} · {client.rut}</p><div className="clientIdentityMeta"><b>{statusLabel(client.status)}</b><span className={`clientHealth ${client.health.toLowerCase()}`}>{healthLabel(client.health)}</span><span>Cliente desde {formatDate(client.createdAt)}</span></div></div></div>
      <div className="clientOwnership"><span><small>Ejecutiva</small><strong>{client.accountExecutiveId || "Sin asignar"}</strong></span><span><small>Responsable técnico</small><strong>{client.developmentLeadId || "Sin asignar"}</strong></span></div>
    </header>
    <div className="clientActionBar">
      <Link href={`/commercial/quotes?clientId=${id}`}><Receipt size={15}/> Nueva cotización</Link>
      <Link href={`/work-orders?clientId=${id}`}><BriefcaseBusiness size={15}/> Nueva OT</Link>
      <Link href={`/projects?clientId=${id}`}><Wrench size={15}/> Nuevo proyecto</Link>
      <Link href={`/support?clientId=${id}`}><TicketCheck size={15}/> Nuevo ticket</Link>
      <Link href={`/documents/clients?clientId=${id}`}><Upload size={15}/> Subir documento</Link>
      <Link href={`/clients/${id}/contacts`}><ContactRound size={15}/> Agregar contacto</Link>
      <button disabled title="El calendario transversal aún no está implementado"><CalendarClock size={15}/> Agendar seguimiento</button>
      <button disabled title="Los pagos se registran exclusivamente desde Finance"><CircleDollarSign size={15}/> Registrar pago</button>
      <button disabled title="Las facturas se emiten exclusivamente desde Finance"><MoreHorizontal size={15}/> Más acciones</button>
    </div>
    <nav className="clientTabs" aria-label="Secciones del cliente">{visibleTabs.map(([key, label]) => <Link className={tab === key ? "active" : ""} href={`/clients/${id}/${key}`} key={key}>{label}</Link>)}</nav>
    <section className="clientTabContent">
      {tab === "summary" ? <Summary client={client} contacts={contacts} contracts={contracts} services={services} renewals={renewals} activity={activity}/> : null}
      {tab === "contacts" ? <Contacts clientId={id} contacts={contacts} roleCanManage={canManage} onCreated={refresh}/> : null}
      {tab === "commercial" ? <Commercial clientId={id}/> : null}
      {tab === "contracts" ? <ClientContracts clientId={id} contracts={contracts}/> : null}
      {tab === "services" ? <Services clientId={id} services={services} roleCanManage={canManage} onCreated={refresh}/> : null}
      {tab === "renewals" ? <ClientRenewals clientId={id} renewals={renewals}/> : null}
      {tab === "projects" ? <ClientOperations clientId={id} mode="projects"/> : null}
      {tab === "work-orders" ? <ClientOperations clientId={id} mode="work-orders"/> : null}
      {tab === "documents" ? <DomainPanel icon={FileStack} title="Documentos y versiones" description="Storage privado en clients/{clientId}/ con clasificación y trazabilidad." action={{ href: `/documents/clients?clientId=${id}`, label: "Subir documento" }} empty="No hay documentos asociados a este cliente."/> : null}
      {tab === "finance" ? <ClientFinancePanel clientId={id}/> : null}
      {tab === "support" ? <ClientSupport clientId={id}/> : null}
      {tab === "monitoring" ? <DomainPanel icon={MonitorCheck} title="Monitoreo del cliente" description="Estado, uptime, latencia, SSL e incidentes desde Monitoring." empty="No hay sitios asociados al monitoreo de este cliente."/> : null}
      {tab === "audits" ? <ClientAudits clientId={id}/> : null}
      {tab === "activity" ? <ActivityTimeline events={activity}/> : null}
      {tab === "portal" ? <PortalPanel client={client}/> : null}
      {tab === "settings" ? <SettingsPanel client={client} roleCanManage={canManage} onUpdated={refresh}/> : null}
    </section>
  </main>;
}

function Summary({ client, contacts, contracts, services, renewals, activity }: { client: Client; contacts: ClientContact[]; contracts: ClientContract[]; services: ClientService[]; renewals: ClientRenewal[]; activity: ClientEvent[] }) {
  const nextRenewal = [...renewals].filter((item) => !["RENEWED", "NOT_RENEWED", "CANCELLED"].includes(item.status)).sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))[0];
  return <div className="clientSummaryGrid">
    <section className="relationshipPanel"><div className="panelHeading"><span>Relación Zyteron</span><h2>Contexto del cliente</h2></div><dl><div><dt>Empresa</dt><dd>{client.legalName}</dd></div><div><dt>Giro</dt><dd>{client.businessActivity || "Sin información"}</dd></div><div><dt>Ubicación</dt><dd>{[client.commune, client.region, client.country].filter(Boolean).join(", ")}</dd></div><div><dt>Contacto principal</dt><dd>{contacts.find((item) => item.isPrimary)?.name || "Sin contacto principal"}</dd></div><div><dt>Próximo compromiso</dt><dd>{nextRenewal ? `${nextRenewal.title} · ${formatDate(`${nextRenewal.renewalDate}T12:00:00Z`)}` : "Sin compromiso registrado"}</dd></div></dl></section>
    <section className="healthPanel"><div className="panelHeading"><span>Client Health</span><h2>{healthLabel(client.health)}</h2></div><p>El estado no se calcula hasta disponer de señales suficientes.</p><div className="healthFactors">{client.healthFactors.map((factor) => <div key={factor.key}><span className={factor.available ? "available" : ""}/><strong>{factor.label}</strong><small>{factor.reason}</small></div>)}</div></section>
    <section className="snapshotPanel services"><div className="panelHeading"><span>Servicios</span><h2>{services.filter((item) => item.status === "ACTIVE").length} activos</h2></div>{services.length ? services.slice(0, 3).map((service) => <p key={service.id}><strong>{service.serviceName}</strong><span>{service.status}</span></p>) : <EmptyLine text="No hay servicios contratados."/>}</section>
    <section className="snapshotPanel contracts"><div className="panelHeading"><span>Contratos</span><h2>{contracts.filter((item) => item.status === "ACTIVE").length} activos</h2></div>{contracts.length ? contracts.slice(0, 3).map((contract) => <p key={contract.id}><strong>{contract.name}</strong><span>{contract.status}</span></p>) : <EmptyLine text="No hay contratos registrados."/>}</section>
    <section className="snapshotPanel renewals"><div className="panelHeading"><span>Renovaciones</span><h2>{renewals.filter((item) => !["RENEWED", "NOT_RENEWED", "CANCELLED"].includes(item.status)).length} abiertas</h2></div>{renewals.length ? renewals.slice(0, 3).map((renewal) => <p key={renewal.id}><strong>{renewal.title}</strong><span>{formatDate(`${renewal.renewalDate}T12:00:00Z`)}</span></p>) : <EmptyLine text="No hay renovaciones registradas."/>}</section>
    <section className="snapshotPanel projects"><div className="panelHeading"><span>Operación</span><h2>Proyectos y OT</h2></div><EmptyLine text="No hay proyectos activos ni OT abiertas."/></section>
    <section className="snapshotPanel finance"><div className="panelHeading"><span>Finanzas</span><h2>Snapshot financiero</h2></div><EmptyLine text="Finance aún no entrega saldos para este cliente."/></section>
    <section className="snapshotPanel risk"><div className="panelHeading"><span>Soporte y monitoreo</span><h2>Situación operacional</h2></div><EmptyLine text="No hay tickets ni incidentes registrados."/></section>
    <section className="timelinePanel"><div className="panelHeading"><span>Actividad consolidada</span><h2>Últimos eventos</h2></div><ActivityTimeline events={activity.slice(0, 6)}/></section>
  </div>;
}

function Contacts({ clientId, contacts, roleCanManage, onCreated }: { clientId: string; contacts: ClientContact[]; roleCanManage: boolean; onCreated: () => Promise<unknown> }) {
  const { role } = useAccess(); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [form, setForm] = useState({ name:"",email:"",position:"",phone:"",whatsapp:"" });
  async function save() { setSaving(true); await clientsApi.addContact(role, clientId, { ...form, department:null,isPrimary:!contacts.length,billingContact:false,technicalContact:false,commercialContact:true,portalAccess:false,status:"ACTIVE",contactTypes:!contacts.length?["PRINCIPAL","COMERCIAL"]:["COMERCIAL"],notes:null }).then(() => { setOpen(false); void onCreated(); }).finally(() => setSaving(false)); }
  return <div className="clientSection"><div className="clientSectionHeader"><div><span>Personas y responsabilidades</span><h2>Contactos</h2><p>Contactos comerciales, técnicos, de facturación y acceso futuro al portal.</p></div>{roleCanManage ? <button onClick={() => setOpen((value) => !value)}><Plus size={15}/> Agregar contacto</button> : null}</div>{open ? <div className="inlineClientForm"><input placeholder="Nombre *" value={form.name} onChange={(event) => setForm({ ...form, name:event.target.value })}/><input placeholder="Cargo" value={form.position} onChange={(event) => setForm({ ...form, position:event.target.value })}/><input placeholder="Email *" value={form.email} onChange={(event) => setForm({ ...form, email:event.target.value })}/><input placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone:event.target.value })}/><input placeholder="WhatsApp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp:event.target.value })}/><button disabled={saving || !form.name || !form.email} onClick={save}>{saving ? "Guardando…" : "Guardar contacto"}</button></div> : null}<div className="contactGrid">{contacts.length ? contacts.map((contact) => <article key={contact.id}><span className="contactAvatar">{contact.name.split(" ").map((word) => word[0]).slice(0,2).join("")}</span><div><h3>{contact.name}{contact.isPrimary ? <b>Principal</b> : null}</h3><p>{contact.position || "Cargo no informado"}</p><a href={`mailto:${contact.email}`}>{contact.email}</a><small>{contact.phone || "Sin teléfono"}</small></div></article>) : <EmptyLine text="No hay contactos asociados a este cliente."/>}</div></div>;
}

function Services({ clientId, services, roleCanManage, onCreated }: { clientId:string; services:ClientService[]; roleCanManage:boolean; onCreated:() => Promise<unknown> }) {
  const { role } = useAccess(); const [open,setOpen]=useState(false); const [saving,setSaving]=useState(false); const [name,setName]=useState(""); const [date,setDate]=useState("");
  async function save(){ const startDate=toIsoDate(date); if(!startDate)return; setSaving(true); await clientsApi.addService(role,clientId,{serviceId:name.toLowerCase().replaceAll(" ","-"),catalogServiceId:null,serviceName:name,contractId:null,projectId:null,startDate,renewalDate:null,endDate:null,billingFrequency:null,agreedPrice:null,currency:"CLP",status:"PENDING_ACTIVATION",responsibleUserId:null,technicalOwnerId:null,sla:null,notes:null,portalVisible:false}).then(()=>{setOpen(false);void onCreated();}).finally(()=>setSaving(false)); }
  return <div className="clientSection"><div className="clientSectionHeader"><div><span>Catálogo contratado</span><h2>Servicios</h2><p>Vigencia, facturación, responsable, SLA y próxima renovación.</p></div>{roleCanManage?<button onClick={()=>setOpen((value)=>!value)}><Plus size={15}/> Agregar servicio</button>:null}</div>{open?<div className="inlineClientForm compact"><input placeholder="Nombre del servicio *" value={name} onChange={(event)=>setName(event.target.value)}/><input placeholder="Inicio DD-MM-AAAA *" value={date} onChange={(event)=>setDate(event.target.value)}/><button disabled={saving||!name||!toIsoDate(date)} onClick={save}>{saving?"Guardando…":"Guardar servicio"}</button></div>:null}<div className="serviceCards">{services.length?services.map((service)=><article key={service.id}><div><Wrench size={18}/><span className={`serviceStatus ${service.status.toLowerCase()}`}>{service.status}</span></div><h3>{service.serviceName}</h3><dl><div><dt>Inicio</dt><dd>{formatDate(`${service.startDate}T12:00:00Z`)}</dd></div><div><dt>Renovación</dt><dd>{service.renewalDate?formatDate(`${service.renewalDate}T12:00:00Z`):"Sin fecha"}</dd></div><div><dt>SLA</dt><dd>{service.sla||"No definido"}</dd></div></dl></article>):<EmptyLine text="No hay servicios contratados para este cliente."/>}</div></div>;
}

function ClientContracts({ clientId, contracts }: { clientId: string; contracts: ClientContract[] }) {
  return <div className="clientSection">
    <div className="clientSectionHeader"><div><span>Contract Management</span><h2>Contratos del cliente</h2><p>Vigencia, valor, firma y renovación desde un único registro contractual.</p></div><Link href={`/clients/contracts?clientId=${clientId}`}><FileStack size={15}/> Abrir centro de contratos</Link></div>
    <div className="serviceCards">{contracts.length ? contracts.map((contract) => <article key={contract.id}><div><FileStack size={18}/><span className={`serviceStatus ${contract.status.toLowerCase()}`}>{contract.status}</span></div><h3>{contract.name}</h3><dl><div><dt>Número</dt><dd>{contract.contractNumber}</dd></div><div><dt>Vigencia</dt><dd>{contract.startDate ? formatDate(`${contract.startDate}T12:00:00Z`) : "Sin inicio"} — {contract.endDate ? formatDate(`${contract.endDate}T12:00:00Z`) : "Indefinida"}</dd></div><div><dt>Total</dt><dd>{formatMoney(contract.total, contract.currency)}</dd></div></dl></article>) : <EmptyLine text="No hay contratos asociados a este cliente."/>}</div>
  </div>;
}

function ClientRenewals({ clientId, renewals }: { clientId: string; renewals: ClientRenewal[] }) {
  return <div className="clientSection">
    <div className="clientSectionHeader"><div><span>Renewal Control Center</span><h2>Renovaciones del cliente</h2><p>Fechas críticas, contacto, negociación y resultado conservan trazabilidad.</p></div><Link href={`/clients/renewals?clientId=${clientId}`}><CalendarClock size={15}/> Abrir centro de renovaciones</Link></div>
    <div className="serviceCards">{renewals.length ? renewals.map((renewal) => <article key={renewal.id}><div><CalendarClock size={18}/><span className={`serviceStatus ${renewal.status.toLowerCase()}`}>{renewal.status}</span></div><h3>{renewal.title}</h3><dl><div><dt>Fecha</dt><dd>{formatDate(`${renewal.renewalDate}T12:00:00Z`)}</dd></div><div><dt>Origen</dt><dd>{renewal.sourceType}</dd></div><div><dt>Valor estimado</dt><dd>{renewal.estimatedValue === null ? "—" : formatMoney(renewal.estimatedValue, renewal.currency)}</dd></div></dl></article>) : <EmptyLine text="No hay renovaciones asociadas a este cliente."/>}</div>
  </div>;
}

function Commercial({ clientId }: { clientId:string }) { const{role}=useAccess();const[items,setItems]=useState<{opportunities:SalesOpportunity[];quotes:SalesQuote[];followUps:SalesFollowUp[];sales:Sale[]}|null>(null);useEffect(()=>{const q=`&clientId=${clientId}`;Promise.all([commercialApi.opportunities(role,q),commercialApi.quotes(role,q),commercialApi.followUps(role,q),commercialApi.sales(role,q)]).then(([o,qts,f,s])=>setItems({opportunities:o.items,quotes:qts.items,followUps:f.items,sales:s.items})).catch(()=>setItems({opportunities:[],quotes:[],followUps:[],sales:[]}));},[clientId,role]);const total=(items?.sales??[]).reduce((sum,item)=>sum+item.amount,0);return <div className="commercialClientView"><section><span>Pipeline del cliente</span><h2>Relación comercial</h2><p>Información real de oportunidades, cotizaciones, ventas y seguimientos vinculados por client_id.</p><div><Link href={`/commercial/opportunities?clientId=${clientId}`}><Plus size={15}/> Oportunidades</Link><Link href={`/commercial/quotes?clientId=${clientId}`}><Receipt size={15}/> Nueva cotización</Link></div></section><div className="clientCommercialFacts">{items&&[...items.opportunities,...items.quotes,...items.sales,...items.followUps].length?<><article><small>Oportunidades</small><strong>{items.opportunities.length}</strong></article><article><small>Cotizaciones</small><strong>{items.quotes.length}</strong></article><article><small>Ventas</small><strong>{items.sales.length}</strong></article><article><small>Valor ganado</small><strong>{formatMoney(total,"CLP")}</strong></article><article><small>Seguimientos</small><strong>{items.followUps.filter((i)=>i.status!=="COMPLETED").length}</strong></article></>:<div className="clientEmpty compact"><BriefcaseBusiness size={22}/><h3>Sin actividad comercial vinculada</h3><p>No hay oportunidades ni cotizaciones para este cliente.</p></div>}</div></div>; }
function ClientOperations({clientId,mode}:{clientId:string;mode:"projects"|"work-orders"}){const{role}=useAccess();const[items,setItems]=useState<Array<OperationsProject|WorkOrder>>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");useEffect(()=>{const query=`&clientId=${clientId}`;const call=mode==="projects"?operationsApi.projects(role,query):operationsApi.workOrders(role,query);call.then((result)=>{setItems(result.items);setError("");}).catch((cause:Error)=>setError(cause.message)).finally(()=>setLoading(false));},[clientId,mode,role]);const projects=mode==="projects"?items as OperationsProject[]:[],orders=mode==="work-orders"?items as WorkOrder[]:[];return <div className="clientSection"><div className="clientSectionHeader"><div><span>Delivery Operations</span><h2>{mode==="projects"?"Proyectos del cliente":"Órdenes de trabajo"}</h2><p>Datos reales vinculados por client_id, sin duplicar el origen operacional.</p></div><Link href={`/${mode}?clientId=${clientId}`}><Plus size={15}/>{mode==="projects"?"Abrir proyectos":"Abrir OT"}</Link></div>{loading?<div className="clientInlineEmpty"><p>Cargando operación…</p></div>:error?<div className="clientError">{error}</div>:items.length?<div className="serviceCards">{projects.map((project)=><Link href={`/projects/${project.id}`} key={project.id}><div><Building2 size={18}/><span className={`serviceStatus ${project.health.toLowerCase()}`}>{project.health.replaceAll("_"," ")}</span></div><h3>{project.name}</h3><dl><div><dt>Número</dt><dd>{project.projectNumber}</dd></div><div><dt>Avance</dt><dd>{project.progress}%</dd></div><div><dt>Objetivo</dt><dd>{formatDate(project.targetDate)}</dd></div></dl></Link>)}{orders.map((order)=><article key={order.id}><div><BriefcaseBusiness size={18}/><span className={`serviceStatus ${order.status.toLowerCase()}`}>{order.status.replaceAll("_"," ")}</span></div><h3>{order.title}</h3><dl><div><dt>Número</dt><dd>{order.workOrderNumber}</dd></div><div><dt>Prioridad</dt><dd>{order.priority}</dd></div><div><dt>Objetivo</dt><dd>{formatDate(order.targetDate)}</dd></div></dl></article>)}</div>:<EmptyLine text={mode==="projects"?"No hay proyectos activos para este cliente.":"No hay órdenes de trabajo para este cliente."}/>}</div>}
function DomainPanel({ icon:Icon,title,description,empty,action }:{icon:typeof Building2;title:string;description:string;empty:string;action?:{href:string;label:string}}){return <div className="clientSection"><div className="domainHero"><span><Icon size={22}/></span><div><h2>{title}</h2><p>{description}</p></div>{action?<Link href={action.href}><Plus size={15}/>{action.label}</Link>:null}</div><div className="clientEmpty compact"><Icon size={24}/><h3>{empty}</h3><p>La relación está preparada mediante client_id y no duplica información.</p></div></div>;}

function ClientSupport({clientId}:{clientId:string}){const{role}=useAccess();const[data,setData]=useState<RelatedSupportSnapshot|null>(null);const[error,setError]=useState("");useEffect(()=>{void clientsApi.support(role,clientId).then(setData).catch((cause:Error)=>setError(cause.message));},[clientId,role]);return <div className="clientSection"><div className="domainHero"><span><TicketCheck size={22}/></span><div><h2>Soporte y SLA</h2><p>Tickets, criticidad, compromisos vencidos y experiencia del cliente desde Service Desk.</p></div><Link href={`/support?clientId=${clientId}`}><Plus size={15}/>Nuevo ticket</Link></div>{error?<div className="clientEmpty compact"><TicketCheck size={24}/><h3>{error}</h3></div>:data?<><div className="clientSummaryGrid"><section className="snapshotPanel"><div className="panelHeading"><span>Tickets abiertos</span><h2>{data.open}</h2></div><p><strong>{data.critical} críticos</strong></p></section><section className="snapshotPanel"><div className="panelHeading"><span>SLA vencidos</span><h2>{data.breached}</h2></div><p><strong>Primera respuesta media: {data.averageFirstResponseMinutes===null?"—":`${data.averageFirstResponseMinutes} min`}</strong></p></section><section className="snapshotPanel"><div className="panelHeading"><span>Última atención</span><h2>{data.lastTicketAt?formatDate(data.lastTicketAt):"—"}</h2></div><p><strong>{data.tickets[0]?.ticketNumber||"Sin tickets"}</strong></p></section><section className="snapshotPanel"><div className="panelHeading"><span>CSAT</span><h2>{data.csat===null?"—":`${data.csat}/5`}</h2></div><p><strong>Encuestas reales posteriores al cierre</strong></p></section></div>{data.tickets.length?<div className="serviceCards">{data.tickets.slice(0,6).map(ticket=><article key={ticket.id}><div><TicketCheck size={18}/><span className={`serviceStatus ${ticket.status.toLowerCase()}`}>{ticket.status}</span></div><h3>{ticket.ticketNumber} · {ticket.subject}</h3><dl><div><dt>Prioridad</dt><dd>{ticket.priority}</dd></div><div><dt>Actualizado</dt><dd>{formatDateTime(ticket.updatedAt)}</dd></div></dl><Link href={`/support/inbox/${ticket.id}`}>Abrir ticket</Link></article>)}</div>:<div className="clientEmpty compact"><TicketCheck size={24}/><h3>No hay tickets registrados para este cliente.</h3></div>}</>:<div className="clientEmpty compact"><TicketCheck size={24}/><h3>Cargando soporte…</h3></div>}</div>}

function ClientAudits({clientId}:{clientId:string}){const{role}=useAccess();const[data,setData]=useState<RelatedAuditSnapshot|null>(null);const[error,setError]=useState("");useEffect(()=>{void clientsApi.audits(role,clientId).then(setData).catch((cause:Error)=>setError(cause.message));},[clientId,role]);return <div className="clientSection"><div className="domainHero"><span><ShieldCheck size={22}/></span><div><h2>Auditorías y hallazgos</h2><p>Próxima revisión, último score, riesgos y remediaciones desde el mismo origen.</p></div>{["GERENTE_GENERAL","JEFE_DESARROLLO","TECH_LEAD"].includes(role)?<Link href={`/audits/plans?clientId=${clientId}`}><Plus size={15}/>Nuevo plan</Link>:null}</div>{error?<div className="clientEmpty compact"><ShieldCheck size={24}/><h3>{error}</h3></div>:data?<div className="clientSummaryGrid"><section className="snapshotPanel"><div className="panelHeading"><span>Próxima auditoría</span><h2>{data.nextAudit?.auditNumber||"Sin programar"}</h2></div><p><strong>{data.nextAudit?formatDateTime(data.nextAudit.scheduledAt):"No existen auditorías programadas."}</strong></p></section><section className="snapshotPanel"><div className="panelHeading"><span>Última revisión</span><h2>{data.lastAudit?.score===null||!data.lastAudit?"—":`${data.lastAudit.score}%`}</h2></div><p><strong>{data.lastAudit?.auditNumber||"Sin auditorías completadas"}</strong></p></section><section className="snapshotPanel"><div className="panelHeading"><span>Hallazgos</span><h2>{data.openFindings.length} abiertos</h2></div><p><strong>{data.criticalFindings} críticos</strong></p></section><section className="snapshotPanel"><div className="panelHeading"><span>Remediación</span><h2>{data.remediations.length} planes</h2></div><p><strong>{data.reports.length} informes versionados</strong></p></section></div>:<div className="clientEmpty compact"><ShieldCheck size={24}/><h3>Cargando auditorías…</h3></div>}</div>}
function ActivityTimeline({events}:{events:ClientEvent[]}){return <div className="clientTimeline">{events.length?events.map((event)=><article key={event.id}><time>{formatDateTime(event.occurredAt)}</time><span/><div><strong>{event.title}</strong><p>{event.description||event.type}</p><small>{event.type}</small></div></article>):<EmptyLine text="No existe actividad registrada para este cliente."/>}</div>;}
function PortalPanel({client}:{client:Client}){
  const {role}=useAccess();
  const [settings,setSettings]=useState<ClientPortalSettings|null>(null);
  const [saving,setSaving]=useState(false);
  const canManage=role==="GERENTE_GENERAL";
  useEffect(()=>{if(canManage)clientsApi.portal(role,client.id).then(setSettings).catch(()=>setSettings(null));},[canManage,client.id,role]);
  async function change(key:keyof ClientPortalSettings,value:boolean){if(!settings)return;setSaving(true);await clientsApi.updatePortal(role,client.id,{[key]:value}).then(setSettings).finally(()=>setSaving(false));}
  const controls:Array<[keyof ClientPortalSettings,string]>=[["enabled","Portal habilitado"],["projectsVisible","Proyectos visibles"],["documentsVisible","Documentos visibles"],["invoicesVisible","Facturas visibles"],["ticketsVisible","Tickets visibles"],["monitoringVisible","Monitoreo visible"],["auditsVisible","Auditorías visibles"]];
  return <div className="portalClientPanel"><div><Globe2 size={25}/><span><h2>Portal Cliente</h2><p>Aislamiento preparado para usuarios externos asociados a este client_id.</p></span><b>{settings?.enabled?"Habilitado":"Deshabilitado"}</b></div><section>{controls.map(([key,label])=><label key={key}><input type="checkbox" disabled={!canManage||saving||!settings||(key!=="enabled"&&!settings.enabled)} checked={Boolean(settings?.[key])} onChange={(event)=>void change(key,event.target.checked)}/><span>{label}</span><small>{canManage?key==="enabled"?"Control de acceso externo":"Mismo origen con política CLIENT_VISIBLE":"Solo Gerencia General puede configurar"}</small></label>)}</section><aside>El portal utiliza los mismos registros con políticas CLIENT_VISIBLE; nunca copia la información del cliente. Cliente: {client.legalName}.</aside></div>;
}
function SettingsPanel({client,roleCanManage,onUpdated}:{client:Client;roleCanManage:boolean;onUpdated:()=>Promise<unknown>}){const {role}=useAccess();const [status,setStatus]=useState(client.status);const [saving,setSaving]=useState(false);async function save(){setSaving(true);await clientsApi.update(role,client.id,{status}).then(()=>void onUpdated()).finally(()=>setSaving(false));}async function archive(){if(!window.confirm("¿Archivar este cliente? Mantendrá todo su historial empresarial."))return;setSaving(true);await clientsApi.archive(role,client.id).then(()=>void onUpdated()).finally(()=>setSaving(false));}return <div className="clientSettings"><section><Settings size={22}/><div><h2>Configuración del cliente</h2><p>Estado, clasificación y preferencias auditables.</p></div></section><label>Estado<select disabled={!roleCanManage} value={status} onChange={(event)=>setStatus(event.target.value as Client["status"])}><option value="ACTIVE">Activo</option><option value="ONBOARDING">Onboarding</option><option value="INACTIVE">Inactivo</option><option value="ARCHIVED">Archivado</option></select></label><button disabled={!roleCanManage||saving||status===client.status} onClick={save}>Guardar cambios</button><div className="dangerZone"><Archive size={19}/><span><strong>Archivar cliente</strong><p>No elimina registros ni relaciones históricas.</p></span><button disabled={role!=="GERENTE_GENERAL"||saving||client.status==="ARCHIVED"} onClick={archive}>Archivar</button></div></div>;}
function EmptyLine({text}:{text:string}){return <div className="clientInlineEmpty"><span>✓</span><p>{text}</p></div>;}
function formatMoney(value:number,currency:string){return new Intl.NumberFormat("es-CL",{style:"currency",currency,maximumFractionDigits:currency==="CLP"?0:2}).format(value);}
function Client360Skeleton(){return <main className="client360"><div className="clientSkeleton detail">{Array.from({length:8},(_,index)=><span key={index}/>)}</div></main>;}
function initials(client:Client){return(client.tradeName||client.legalName).split(" ").slice(0,2).map((word)=>word[0]).join("").toUpperCase();}
function statusLabel(status:Client["status"]){return({ACTIVE:"Activo",ONBOARDING:"Onboarding",INACTIVE:"Inactivo",ARCHIVED:"Archivado"})[status];}
function healthLabel(health:Client["health"]){return({HEALTHY:"Saludable",ATTENTION:"Atención",RISK:"Riesgo",CRITICAL:"Crítico",INSUFFICIENT_DATA:"Información insuficiente"})[health];}

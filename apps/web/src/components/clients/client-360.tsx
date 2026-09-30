"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, BriefcaseBusiness, Building2, CalendarClock, CircleDollarSign, ContactRound, FileStack, Globe2, MonitorCheck, MoreHorizontal, Plus, Receipt, Settings, ShieldCheck, TicketCheck, Upload, Wrench } from "lucide-react";
import type { Client, ClientContact, ClientEvent, ClientPortalSettings, ClientService } from "@zyteron/contracts";
import { useAccess } from "@/components/access-context";
import { clientsApi } from "@/lib/clients-api";
import { subscribeToClient } from "@/lib/clients-realtime";
import { formatDate, formatDateTime, toIsoDate } from "@/lib/date-time";

const tabs = [
  ["summary", "Resumen"], ["contacts", "Contactos"], ["commercial", "Comercial"], ["services", "Servicios"],
  ["projects", "Proyectos"], ["work-orders", "OT"], ["documents", "Documentos"], ["finance", "Finanzas"],
  ["support", "Soporte"], ["monitoring", "Monitoreo"], ["audits", "Auditorías"], ["activity", "Actividad"],
  ["portal", "Portal cliente"], ["settings", "Configuración"],
] as const;
type ClientTab = (typeof tabs)[number][0];

export function Client360({ id, initialTab = "summary" }: { id: string; initialTab?: string }) {
  const { role } = useAccess();
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [services, setServices] = useState<ClientService[]>([]);
  const [activity, setActivity] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tab = (tabs.some(([key]) => key === initialTab) ? initialTab : "summary") as ClientTab;
  const canManage = ["GERENTE_GENERAL", "EJECUTIVA_VENTAS", "COMERCIAL"].includes(role);
  const visibleTabs = useMemo(() => tabs.filter(([key]) => key !== "finance" || ["GERENTE_GENERAL", "FINANZAS"].includes(role)), [role]);

  const refresh = () => Promise.all([clientsApi.get(role, id), clientsApi.contacts(role, id), clientsApi.services(role, id), clientsApi.activity(role, id)])
    .then(([clientData, contactData, serviceData, activityData]) => { setClient(clientData); setContacts(contactData); setServices(serviceData); setActivity(activityData); })
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
      <Link href={`/crm/quotes?clientId=${id}`}><Receipt size={15}/> Nueva cotización</Link>
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
      {tab === "summary" ? <Summary client={client} contacts={contacts} services={services} activity={activity}/> : null}
      {tab === "contacts" ? <Contacts clientId={id} contacts={contacts} roleCanManage={canManage} onCreated={refresh}/> : null}
      {tab === "commercial" ? <Commercial clientId={id}/> : null}
      {tab === "services" ? <Services clientId={id} services={services} roleCanManage={canManage} onCreated={refresh}/> : null}
      {tab === "projects" ? <DomainPanel icon={Building2} title="Proyectos del cliente" description="Avance, responsables, hitos e incidencias provienen del dominio Projects." action={{ href: `/projects?clientId=${id}`, label: "Crear proyecto" }} empty="No hay proyectos activos para este cliente."/> : null}
      {tab === "work-orders" ? <DomainPanel icon={BriefcaseBusiness} title="Órdenes de trabajo" description="OT comerciales y operacionales vinculadas por client_id." action={{ href: `/work-orders?clientId=${id}`, label: "Crear OT" }} empty="No hay órdenes de trabajo para este cliente."/> : null}
      {tab === "documents" ? <DomainPanel icon={FileStack} title="Documentos y versiones" description="Storage privado en clients/{clientId}/ con clasificación y trazabilidad." action={{ href: `/documents/clients?clientId=${id}`, label: "Subir documento" }} empty="No hay documentos asociados a este cliente."/> : null}
      {tab === "finance" ? <FinancePanel/> : null}
      {tab === "support" ? <DomainPanel icon={TicketCheck} title="Soporte y SLA" description="Tickets, prioridades, vencimientos y últimas respuestas desde Support." action={{ href: `/support?clientId=${id}`, label: "Nuevo ticket" }} empty="No hay tickets abiertos para este cliente."/> : null}
      {tab === "monitoring" ? <DomainPanel icon={MonitorCheck} title="Monitoreo del cliente" description="Estado, uptime, latencia, SSL e incidentes desde Monitoring." empty="No hay sitios asociados al monitoreo de este cliente."/> : null}
      {tab === "audits" ? <DomainPanel icon={ShieldCheck} title="Auditorías y hallazgos" description="Próximas revisiones, hallazgos y planes de acción vinculados al cliente." action={role === "GERENTE_GENERAL" || role === "JEFE_DESARROLLO" ? { href: `/audits/scheduled?clientId=${id}`, label: "Nueva auditoría" } : undefined} empty="No hay auditorías programadas para este cliente."/> : null}
      {tab === "activity" ? <ActivityTimeline events={activity}/> : null}
      {tab === "portal" ? <PortalPanel client={client}/> : null}
      {tab === "settings" ? <SettingsPanel client={client} roleCanManage={canManage} onUpdated={refresh}/> : null}
    </section>
  </main>;
}

function Summary({ client, contacts, services, activity }: { client: Client; contacts: ClientContact[]; services: ClientService[]; activity: ClientEvent[] }) {
  return <div className="clientSummaryGrid">
    <section className="relationshipPanel"><div className="panelHeading"><span>Relación Zyteron</span><h2>Contexto del cliente</h2></div><dl><div><dt>Empresa</dt><dd>{client.legalName}</dd></div><div><dt>Giro</dt><dd>{client.businessActivity || "Sin información"}</dd></div><div><dt>Ubicación</dt><dd>{[client.commune, client.region, client.country].filter(Boolean).join(", ")}</dd></div><div><dt>Contacto principal</dt><dd>{contacts.find((item) => item.isPrimary)?.name || "Sin contacto principal"}</dd></div><div><dt>Próximo compromiso</dt><dd>Sin compromiso registrado</dd></div></dl></section>
    <section className="healthPanel"><div className="panelHeading"><span>Client Health</span><h2>{healthLabel(client.health)}</h2></div><p>El estado no se calcula hasta disponer de señales suficientes.</p><div className="healthFactors">{client.healthFactors.map((factor) => <div key={factor.key}><span className={factor.available ? "available" : ""}/><strong>{factor.label}</strong><small>{factor.reason}</small></div>)}</div></section>
    <section className="snapshotPanel services"><div className="panelHeading"><span>Servicios</span><h2>{services.filter((item) => item.status === "ACTIVE").length} activos</h2></div>{services.length ? services.slice(0, 3).map((service) => <p key={service.id}><strong>{service.serviceName}</strong><span>{service.status}</span></p>) : <EmptyLine text="No hay servicios contratados."/>}</section>
    <section className="snapshotPanel projects"><div className="panelHeading"><span>Operación</span><h2>Proyectos y OT</h2></div><EmptyLine text="No hay proyectos activos ni OT abiertas."/></section>
    <section className="snapshotPanel finance"><div className="panelHeading"><span>Finanzas</span><h2>Snapshot financiero</h2></div><EmptyLine text="Finance aún no entrega saldos para este cliente."/></section>
    <section className="snapshotPanel risk"><div className="panelHeading"><span>Soporte y monitoreo</span><h2>Situación operacional</h2></div><EmptyLine text="No hay tickets ni incidentes registrados."/></section>
    <section className="timelinePanel"><div className="panelHeading"><span>Actividad consolidada</span><h2>Últimos eventos</h2></div><ActivityTimeline events={activity.slice(0, 6)}/></section>
  </div>;
}

function Contacts({ clientId, contacts, roleCanManage, onCreated }: { clientId: string; contacts: ClientContact[]; roleCanManage: boolean; onCreated: () => Promise<unknown> }) {
  const { role } = useAccess(); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [form, setForm] = useState({ name:"",email:"",position:"",phone:"",whatsapp:"" });
  async function save() { setSaving(true); await clientsApi.addContact(role, clientId, { ...form, department:null,isPrimary:!contacts.length,billingContact:false,technicalContact:false,commercialContact:true,portalAccess:false,status:"ACTIVE" }).then(() => { setOpen(false); void onCreated(); }).finally(() => setSaving(false)); }
  return <div className="clientSection"><div className="clientSectionHeader"><div><span>Personas y responsabilidades</span><h2>Contactos</h2><p>Contactos comerciales, técnicos, de facturación y acceso futuro al portal.</p></div>{roleCanManage ? <button onClick={() => setOpen((value) => !value)}><Plus size={15}/> Agregar contacto</button> : null}</div>{open ? <div className="inlineClientForm"><input placeholder="Nombre *" value={form.name} onChange={(event) => setForm({ ...form, name:event.target.value })}/><input placeholder="Cargo" value={form.position} onChange={(event) => setForm({ ...form, position:event.target.value })}/><input placeholder="Email *" value={form.email} onChange={(event) => setForm({ ...form, email:event.target.value })}/><input placeholder="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone:event.target.value })}/><input placeholder="WhatsApp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp:event.target.value })}/><button disabled={saving || !form.name || !form.email} onClick={save}>{saving ? "Guardando…" : "Guardar contacto"}</button></div> : null}<div className="contactGrid">{contacts.length ? contacts.map((contact) => <article key={contact.id}><span className="contactAvatar">{contact.name.split(" ").map((word) => word[0]).slice(0,2).join("")}</span><div><h3>{contact.name}{contact.isPrimary ? <b>Principal</b> : null}</h3><p>{contact.position || "Cargo no informado"}</p><a href={`mailto:${contact.email}`}>{contact.email}</a><small>{contact.phone || "Sin teléfono"}</small></div></article>) : <EmptyLine text="No hay contactos asociados a este cliente."/>}</div></div>;
}

function Services({ clientId, services, roleCanManage, onCreated }: { clientId:string; services:ClientService[]; roleCanManage:boolean; onCreated:() => Promise<unknown> }) {
  const { role } = useAccess(); const [open,setOpen]=useState(false); const [saving,setSaving]=useState(false); const [name,setName]=useState(""); const [date,setDate]=useState("");
  async function save(){ const startDate=toIsoDate(date); if(!startDate)return; setSaving(true); await clientsApi.addService(role,clientId,{serviceId:name.toLowerCase().replaceAll(" ","-"),serviceName:name,contractId:null,startDate,renewalDate:null,billingFrequency:null,price:null,currency:"CLP",status:"PENDING",responsibleUserId:null,sla:null,notes:null}).then(()=>{setOpen(false);void onCreated();}).finally(()=>setSaving(false)); }
  return <div className="clientSection"><div className="clientSectionHeader"><div><span>Catálogo contratado</span><h2>Servicios</h2><p>Vigencia, facturación, responsable, SLA y próxima renovación.</p></div>{roleCanManage?<button onClick={()=>setOpen((value)=>!value)}><Plus size={15}/> Agregar servicio</button>:null}</div>{open?<div className="inlineClientForm compact"><input placeholder="Nombre del servicio *" value={name} onChange={(event)=>setName(event.target.value)}/><input placeholder="Inicio DD-MM-AAAA *" value={date} onChange={(event)=>setDate(event.target.value)}/><button disabled={saving||!name||!toIsoDate(date)} onClick={save}>{saving?"Guardando…":"Guardar servicio"}</button></div>:null}<div className="serviceCards">{services.length?services.map((service)=><article key={service.id}><div><Wrench size={18}/><span className={`serviceStatus ${service.status.toLowerCase()}`}>{service.status}</span></div><h3>{service.serviceName}</h3><dl><div><dt>Inicio</dt><dd>{formatDate(`${service.startDate}T12:00:00Z`)}</dd></div><div><dt>Renovación</dt><dd>{service.renewalDate?formatDate(`${service.renewalDate}T12:00:00Z`):"Sin fecha"}</dd></div><div><dt>SLA</dt><dd>{service.sla||"No definido"}</dd></div></dl></article>):<EmptyLine text="No hay servicios contratados para este cliente."/>}</div></div>;
}

function Commercial({ clientId }: { clientId:string }) { return <div className="commercialClientView"><section><span>Pipeline del cliente</span><h2>Relación comercial</h2><p>Oportunidades, cotizaciones, ventas y seguimientos se consultan desde CRM utilizando este client_id.</p><div><Link href={`/crm/opportunities?clientId=${clientId}`}><Plus size={15}/> Nueva oportunidad</Link><Link href={`/crm/quotes?clientId=${clientId}`}><Receipt size={15}/> Nueva cotización</Link></div></section><div className="clientEmpty compact"><BriefcaseBusiness size={22}/><h3>Sin actividad comercial vinculada</h3><p>No hay oportunidades ni cotizaciones para este cliente.</p></div></div>; }
function FinancePanel(){return <div className="financeClientPanel"><div><span>Preparado para Finance</span><h2>Resumen financiero</h2><p>Cliente 360 no mantiene un libro financiero paralelo. Consume facturas, pagos y cobros del dominio Finance.</p></div>{["Total facturado","Total pagado","Saldo pendiente","Facturas abiertas","Facturas vencidas","Último pago","Próximo cobro"].map((label)=><article key={label}><span>{label}</span><strong>Sin datos</strong><small>Esperando integración Finance</small></article>)}<aside><ShieldCheck size={19}/><p><strong>Preparación tributaria y pagos</strong> Interfaces futuras TaxDocumentProvider y PaymentProvider. No se almacenan tarjetas, CVV ni datos PCI.</p></aside></div>;}
function DomainPanel({ icon:Icon,title,description,empty,action }:{icon:typeof Building2;title:string;description:string;empty:string;action?:{href:string;label:string}}){return <div className="clientSection"><div className="domainHero"><span><Icon size={22}/></span><div><h2>{title}</h2><p>{description}</p></div>{action?<Link href={action.href}><Plus size={15}/>{action.label}</Link>:null}</div><div className="clientEmpty compact"><Icon size={24}/><h3>{empty}</h3><p>La relación está preparada mediante client_id y no duplica información.</p></div></div>;}
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
function Client360Skeleton(){return <main className="client360"><div className="clientSkeleton detail">{Array.from({length:8},(_,index)=><span key={index}/>)}</div></main>;}
function initials(client:Client){return(client.tradeName||client.legalName).split(" ").slice(0,2).map((word)=>word[0]).join("").toUpperCase();}
function statusLabel(status:Client["status"]){return({ACTIVE:"Activo",ONBOARDING:"Onboarding",INACTIVE:"Inactivo",ARCHIVED:"Archivado"})[status];}
function healthLabel(health:Client["health"]){return({HEALTHY:"Saludable",ATTENTION:"Atención",RISK:"Riesgo",CRITICAL:"Crítico",INSUFFICIENT_DATA:"Información insuficiente"})[health];}

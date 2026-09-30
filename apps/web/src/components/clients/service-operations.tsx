"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, CircleDollarSign, Download, PauseCircle, PlayCircle, Plus, Search, ServerCog, ShieldCheck, UserRound, Wrench } from "lucide-react";
import type { Client, ClientContract, ServiceCatalogItem, UserDirectoryItem } from "@zyteron/contracts";
import { useAccess } from "@/components/access-context";
import { contractsApi, serviceOperationsApi, type ServiceOperationsItem, type ServiceSummary, usersDirectoryApi } from "@/lib/client-domain-api";
import { clientsApi } from "@/lib/clients-api";
import { formatDate } from "@/lib/date-time";

const empty: ServiceSummary = { active:0, pending:0, suspended:0, renewing:0, withoutResponsible:0, withSla:0, estimatedMonthlyRecurring:0 };

export function ServiceOperations() {
  const { role } = useAccess();
  const [items,setItems] = useState<ServiceOperationsItem[]>([]);
  const [summary,setSummary] = useState(empty);
  const [catalog,setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [clients,setClients] = useState<Client[]>([]);
  const [contracts,setContracts] = useState<ClientContract[]>([]);
  const [users,setUsers] = useState<UserDirectoryItem[]>([]);
  const [search,setSearch] = useState("");
  const [status,setStatus] = useState("");
  const [view,setView] = useState<"portfolio"|"client"|"service"|"renewals"|"owners">("portfolio");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [open,setOpen] = useState(false);
  const canManage = ["GERENTE_GENERAL","EJECUTIVA_VENTAS","COMERCIAL"].includes(role);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page:"1", pageSize:"100" });
    if (search) params.set("search",search);
    if (status) params.set("status",status);
    return serviceOperationsApi.list(role,params).then((result) => { setItems(result.items); setSummary(result.summary); setError(""); }).catch((reason:Error) => setError(reason.message)).finally(() => setLoading(false));
  };
  useEffect(() => { const timer=setTimeout(()=>void load(),250); return()=>clearTimeout(timer); }, [role,search,status]);
  useEffect(() => {
    serviceOperationsApi.catalog(role).then(setCatalog).catch(()=>setCatalog([]));
    clientsApi.list(role,new URLSearchParams({pageSize:"100"})).then((result)=>setClients(result.items)).catch(()=>setClients([]));
    contractsApi.list(role,new URLSearchParams({pageSize:"100"})).then((result)=>setContracts(result.items)).catch(()=>setContracts([]));
    if (canManage) usersDirectoryApi.list(role).then(setUsers).catch(()=>setUsers([]));
  }, [role,canManage]);
  const shown = useMemo(() => view==="renewals" ? items.filter((item)=>item.renewalDate) : view==="owners" ? items.filter((item)=>item.responsibleUserId) : items, [items,view]);
  const metrics = [["Activos",summary.active,"ACTIVE",Activity],["Pendientes",summary.pending,"PENDING_ACTIVATION",CalendarClock],["Suspendidos",summary.suspended,"SUSPENDED",PauseCircle],["Próximos a renovar",summary.renewing,"",CalendarClock],["Sin responsable",summary.withoutResponsible,"",UserRound],["Con SLA",summary.withSla,"",ShieldCheck]] as const;
  async function exportCsv(){await clientsApi.auditExport(role,"services");downloadCsv("servicios.csv",[["Servicio","Cliente","Estado","Precio","Moneda","Periodicidad","Renovación","SLA"],...shown.map((item)=>[item.serviceName,item.clientName??"",item.status,item.agreedPrice??"",item.currency,item.billingFrequency??"",item.renewalDate??"",item.sla??""])]);}

  return <main className="serviceOperations">
    <header className="serviceHeader"><div><span>Service Operations</span><h1>Servicios contratados</h1><p>Qué vendimos, a quién, por cuánto, quién lo atiende y cuándo se renueva.</p></div><div>{canManage?<button className="domainPrimary" onClick={()=>setOpen(true)}><Plus size={16}/>Registrar servicio</button>:null}<button onClick={()=>void exportCsv()}><Download size={15}/>Exportar</button></div></header>
    <section className="serviceMetrics">{metrics.map(([label,value,filter,Icon])=><button key={label} onClick={()=>filter&&setStatus(status===filter?"":filter)}><Icon size={17}/><strong>{value}</strong><span>{label}</span></button>)}<article><CircleDollarSign size={17}/><strong>{money(summary.estimatedMonthlyRecurring)}</strong><span>Recurrente mensual estimado</span></article></section>
    <section className="serviceWorkspace"><div className="domainToolbar"><label><Search size={15}/><input placeholder="Buscar servicio o código" value={search} onChange={(event)=>setSearch(event.target.value)}/></label><select value={status} onChange={(event)=>setStatus(event.target.value)}><option value="">Todos los estados</option>{["QUOTED","PENDING_ACTIVATION","ACTIVE","SUSPENDED","PENDING_RENEWAL","CANCELLED","EXPIRED"].map((value)=><option key={value}>{value}</option>)}</select><div className="serviceViews">{[["portfolio","Cartera"],["client","Por cliente"],["service","Por servicio"],["renewals","Renovaciones"],["owners","Responsables"]].map(([key,label])=><button className={view===key?"active":""} key={key} onClick={()=>setView(key as typeof view)}>{label}</button>)}</div></div>
      {error?<p className="domainError">{error}</p>:null}
      {loading?<div className="domainLoading">Cargando operación de servicios…</div>:shown.length?<div className="serviceOpsCards">{shown.map((item)=><ServiceCard key={item.id} item={item} canManage={canManage} refresh={load}/>)}</div>:<div className="domainEmpty"><ServerCog size={29}/><h2>Este filtro todavía no tiene servicios contratados.</h2><p>Registra un servicio desde el catálogo y conserva precio, periodicidad y vigencia acordados.</p>{canManage?<button onClick={()=>setOpen(true)}>Registrar servicio</button>:null}</div>}
    </section>
    {open?<ServiceForm clients={clients} catalog={catalog} contracts={contracts} users={users} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);void load();}}/>:null}
  </main>;
}

function ServiceCard({item,canManage,refresh}:{item:ServiceOperationsItem;canManage:boolean;refresh:()=>Promise<void>}) {
  const { role } = useAccess(); const [action,setAction]=useState(false); const [error,setError]=useState("");
  async function run(kind:"activate"|"suspend"){setAction(true);setError("");const operation=kind==="activate"?serviceOperationsApi.activate(role,item.id):serviceOperationsApi.suspend(role,item.id);await operation.then(()=>refresh()).catch((reason:Error)=>setError(reason.message)).finally(()=>setAction(false));}
  return <article className={`serviceOpsCard ${item.status.toLowerCase()}`}><header><span><Wrench size={18}/></span><b>{item.status}</b></header><small>{item.category||"SERVICIO"}</small><h3><Link href={`/clients/services/${item.id}`}>{item.serviceName}</Link></h3><Link href={`/clients/${item.clientId}`}>{item.clientName||"Ver cliente"}</Link><dl><div><dt>Precio contratado</dt><dd>{item.agreedPrice===null?"—":money(item.agreedPrice,item.currency)}</dd></div><div><dt>Periodicidad</dt><dd>{item.billingFrequency||"Sin definir"}</dd></div><div><dt>Inicio</dt><dd>{formatDate(`${item.startDate}T12:00:00Z`)}</dd></div><div><dt>Renovación</dt><dd>{item.renewalDate?formatDate(`${item.renewalDate}T12:00:00Z`):"No aplica"}</dd></div><div><dt>SLA</dt><dd>{item.sla||"No definido"}</dd></div><div><dt>Responsable</dt><dd>{item.responsibleUserId||"Por asignar"}</dd></div></dl><div className="requirementChips">{item.requirements?.project?<span>Proyecto</span>:null}{item.requirements?.monitoring?<span>Monitoreo</span>:null}{item.requirements?.support?<span>Soporte</span>:null}</div>{error?<p className="cardError">{error}</p>:null}{canManage?<footer>{["PENDING_ACTIVATION","SUSPENDED"].includes(item.status)?<button disabled={action} onClick={()=>void run("activate")}><PlayCircle size={14}/>Activar</button>:null}{item.status==="ACTIVE"?<button disabled={action} onClick={()=>void run("suspend")}><PauseCircle size={14}/>Suspender</button>:null}</footer>:null}</article>;
}

export function ServiceDetail({id}:{id:string}) {
  const {role}=useAccess(); const [item,setItem]=useState<ServiceOperationsItem|null>(null); const [error,setError]=useState("");
  useEffect(()=>{serviceOperationsApi.get(role,id).then(setItem).catch((reason:Error)=>setError(reason.message));},[id,role]);
  if(error)return <main className="serviceOperations"><p className="domainError">{error}</p><Link href="/clients/services">Volver a servicios</Link></main>;
  if(!item)return <main className="serviceOperations"><div className="domainLoading">Cargando servicio…</div></main>;
  return <main className="serviceOperations"><Link href="/clients/services">← Volver a servicios</Link><header className="serviceHeader"><div><span>{item.category||"Service Operations"}</span><h1>{item.serviceName}</h1><p>{item.clientName}</p></div><b className={`contractBadge ${item.status.toLowerCase()}`}>{item.status}</b></header><section className="contractDetailGrid"><article className="contractEconomics"><small>Precio contratado</small><strong>{item.agreedPrice===null?"—":money(item.agreedPrice,item.currency)}</strong><p>{item.billingFrequency||"Periodicidad pendiente"}</p><span>SLA {item.sla||"no definido"}</span></article><article className="contractValidity"><CalendarClock/><span><small>Inicio</small><strong>{formatDate(`${item.startDate}T12:00:00Z`)}</strong></span><span><small>Renovación</small><strong>{item.renewalDate?formatDate(`${item.renewalDate}T12:00:00Z`):"No aplica"}</strong></span></article><article className="contractTimeline"><small>Relaciones operacionales</small><h2>Contrato y proyecto</h2><p>Contrato: {item.contractId||"Pendiente"}</p><p>Proyecto: {item.projectId||"Pendiente"}</p><p>Responsable comercial: {item.responsibleUserId||"Pendiente"}</p><p>Responsable técnico: {item.technicalOwnerId||"Pendiente"}</p></article><article className="contractDocuments"><header><div><small>Operación relacionada</small><h2>Soporte, monitoreo y actividad</h2></div></header><p>Los tickets e incidentes se consumirán desde sus dominios mediante este client_id y service_id; no se duplican registros.</p></article></section></main>;
}

function ServiceForm({clients,catalog,contracts,users,onClose,onSaved}:{clients:Client[];catalog:ServiceCatalogItem[];contracts:ClientContract[];users:UserDirectoryItem[];onClose:()=>void;onSaved:()=>void}) {
  const { role }=useAccess(); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const [form,setForm]=useState({clientId:"",catalogServiceId:"",contractId:"",responsibleUserId:"",startDate:new Date().toISOString().slice(0,10),renewalDate:"",agreedPrice:"",billingFrequency:"",sla:"",notes:""});
  const selected=catalog.find((item)=>item.id===form.catalogServiceId);
  useEffect(()=>{if(selected)setForm((current)=>({...current,agreedPrice:selected.defaultPrice===null?"":String(selected.defaultPrice),billingFrequency:selected.billingType,renewalDate:selected.requiresRenewal?new Date(Date.now()+365*86400000).toISOString().slice(0,10):""}));},[selected?.id]);
  async function save(){if(!selected)return;setSaving(true);setError("");serviceOperationsApi.create(role,{clientId:form.clientId,catalogServiceId:selected.id,serviceId:selected.code,serviceName:selected.name,contractId:form.contractId||null,projectId:null,startDate:form.startDate,renewalDate:form.renewalDate||null,endDate:null,billingFrequency:form.billingFrequency||null,agreedPrice:form.agreedPrice?Number(form.agreedPrice):null,currency:selected.currency,status:"PENDING_ACTIVATION",responsibleUserId:form.responsibleUserId||null,technicalOwnerId:null,sla:form.sla||null,notes:form.notes||null,portalVisible:false}).then(onSaved).catch((reason:Error)=>setError(reason.message)).finally(()=>setSaving(false));}
  return <div className="domainModal"><form onSubmit={(event)=>{event.preventDefault();void save();}}><button type="button" className="modalClose" onClick={onClose}>×</button><span>Service Operations</span><h2>Registrar servicio contratado</h2><div className="formGrid"><label>Cliente *<select required value={form.clientId} onChange={(event)=>setForm({...form,clientId:event.target.value,contractId:""})}><option value="">Seleccionar</option>{clients.map((client)=><option key={client.id} value={client.id}>{client.tradeName||client.legalName}</option>)}</select></label><label>Servicio de catálogo *<select required value={form.catalogServiceId} onChange={(event)=>setForm({...form,catalogServiceId:event.target.value})}><option value="">Seleccionar</option>{catalog.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Contrato<select value={form.contractId} onChange={(event)=>setForm({...form,contractId:event.target.value})}><option value="">Pendiente de vincular</option>{contracts.filter((contract)=>contract.clientId===form.clientId).map((contract)=><option value={contract.id} key={contract.id}>{contract.contractNumber} · {contract.name}</option>)}</select></label><label>Responsable comercial<select value={form.responsibleUserId} onChange={(event)=>setForm({...form,responsibleUserId:event.target.value})}><option value="">Pendiente de asignar</option>{users.map((user)=><option value={user.id} key={user.id}>{user.name} · {user.role??"Sin rol"}</option>)}</select></label><label>Inicio *<input required type="date" value={form.startDate} onChange={(event)=>setForm({...form,startDate:event.target.value})}/></label><label>Renovación<input type="date" value={form.renewalDate} onChange={(event)=>setForm({...form,renewalDate:event.target.value})}/></label><label>Precio acordado<input type="number" min="0" value={form.agreedPrice} onChange={(event)=>setForm({...form,agreedPrice:event.target.value})}/></label><label>Periodicidad<select value={form.billingFrequency} onChange={(event)=>setForm({...form,billingFrequency:event.target.value})}>{["ONE_TIME","MONTHLY","QUARTERLY","SEMIANNUAL","ANNUAL","CUSTOM"].map((value)=><option key={value}>{value}</option>)}</select></label><label>SLA<input value={form.sla} onChange={(event)=>setForm({...form,sla:event.target.value})}/></label></div><label>Notas<textarea value={form.notes} onChange={(event)=>setForm({...form,notes:event.target.value})}/></label>{selected?<div className="catalogRequirements"><strong>{selected.category}</strong><span>{selected.requiresProject?"Requiere proyecto antes de activar":"Sin proyecto obligatorio"}</span><span>{selected.requiresMonitoring?"Requiere monitoreo":""}</span><span>{selected.requiresSupport?"Requiere soporte y SLA":""}</span></div>:null}{error?<p className="domainError">{error}</p>:null}<footer><button type="button" onClick={onClose}>Cancelar</button><button className="domainPrimary" disabled={saving||!selected}>{saving?"Registrando…":"Registrar servicio"}</button></footer></form></div>;
}

function money(value:number,currency="CLP"){return new Intl.NumberFormat("es-CL",{style:"currency",currency,maximumFractionDigits:currency==="CLP"?0:2}).format(value||0);}
function downloadCsv(name:string,rows:Array<Array<string|number>>){const blob=new Blob([rows.map((row)=>row.map((value)=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();URL.revokeObjectURL(url);}

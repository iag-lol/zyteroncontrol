import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { ClientIntegrationSummary, ExecutiveDashboard, IntegrationSourceHealth } from "@zyteron/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "../domain/server-supabase.js";

type Row = Record<string, any>;
type DomainResult<T> = { value:T; health:IntegrationSourceHealth };

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;
const num = (value:unknown) => Number(value ?? 0);
const sum = (rows:Row[], key:string) => rows.reduce((total, row) => total + num(row[key]), 0);

@Injectable()
export class DomainInsightsService {
  private readonly db = createServerSupabase();

  private database():SupabaseClient {
    if (!this.db) throw new ServiceUnavailableException("Supabase no está configurado para consolidar los dominios.");
    return this.db;
  }

  private async rows(table:string, columns:string, apply:(query:any)=>any = (query) => query):Promise<Row[]> {
    const { data, error } = await apply(this.database().from(table).select(columns));
    if (error) throw error;
    return data ?? [];
  }

  private async domain<T>(domain:string, fallback:T, work:()=>Promise<T>):Promise<DomainResult<T>> {
    try {
      return { value:await work(), health:{ domain, status:"OK", detail:null } };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Origen no disponible";
      return { value:fallback, health:{ domain, status:"DEGRADED", detail:detail.slice(0, 180) } };
    }
  }

  async executive():Promise<ExecutiveDashboard> {
    const openQuoteStatuses = ["DRAFT","PENDING_APPROVAL","APPROVED","READY_TO_SEND","SENT","NEGOTIATING"];
    const openProjectStatuses = ["PLANNING","READY","IN_PROGRESS","BLOCKED","INTERNAL_REVIEW","QA","WAITING_CLIENT","READY_FOR_PRODUCTION","PRODUCTION","MAINTENANCE","ON_HOLD"];
    const openWorkOrderStatuses = ["DRAFT","READY_FOR_HANDOFF","PENDING_PLANNING","PLANNING","PENDING_ASSIGNMENT","ASSIGNED","IN_PROGRESS","IN_REVIEW","WAITING_CLIENT","PENDING_HANDOFF","READY"];
    const openTicketStatuses = ["NEW","TRIAGE","OPEN","ASSIGNED","IN_PROGRESS","WAITING_CLIENT","WAITING_INTERNAL","WAITING_THIRD_PARTY","REOPENED"];
    const activeIncidentStatuses = ["DETECTED","CONFIRMED","ACKNOWLEDGED","INVESTIGATING","MITIGATING","MONITORING"];
    const [commercial, clients, operations, monitoring, people, audits, finance, support, security] = await Promise.all([
      this.domain("COMERCIAL", {salesThisMonth:0,pipelineValue:0,pipelineCount:0,pendingQuotes:0}, async()=>{
        const [sales, opportunities, quotes] = await Promise.all([
          this.rows("sales","amount,currency",q=>q.eq("status","WON").gte("closed_at",monthStart())),
          this.rows("opportunities","estimated_value,currency",q=>q.eq("status","OPEN")),
          this.rows("quotes","id",q=>q.in("status",openQuoteStatuses)),
        ]);
        return { salesThisMonth:sum(sales.filter(row=>row.currency==="CLP"),"amount"), pipelineValue:sum(opportunities.filter(row=>row.currency==="CLP"),"estimated_value"), pipelineCount:opportunities.length, pendingQuotes:quotes.length };
      }),
      this.domain("CLIENTES", {activeClients:0,newClientsThisMonth:0}, async()=>{
        const rows = await this.rows("clients","status,created_at",q=>q.neq("status","ARCHIVED"));
        return { activeClients:rows.filter(row=>row.status==="ACTIVE").length, newClientsThisMonth:rows.filter(row=>String(row.created_at)>=monthStart()).length };
      }),
      this.domain("OPERACIONES", {activeProjects:0,overdueProjects:0,openWorkOrders:0,overdueTasks:0}, async()=>{
        const [projects, orders, tasks] = await Promise.all([
          this.rows("projects","status,target_date",q=>q.in("status",openProjectStatuses)),
          this.rows("work_orders","status",q=>q.in("status",openWorkOrderStatuses)),
          this.rows("tasks","status,due_date",q=>q.lt("due_date",today()).not("status","in","(DONE,CANCELLED)")),
        ]);
        return { activeProjects:projects.length, overdueProjects:projects.filter(row=>row.target_date&&row.target_date<today()).length, openWorkOrders:orders.length, overdueTasks:tasks.length };
      }),
      this.domain("MONITOREO", {onlineMonitors:0,downMonitors:0,criticalIncidents:0,sslExpiring:0}, async()=>{
        const [monitors, incidents] = await Promise.all([
          this.rows("monitors","status,ssl_status",q=>q.eq("enabled",true)),
          this.rows("incidents","severity,status",q=>q.in("status",activeIncidentStatuses)),
        ]);
        return { onlineMonitors:monitors.filter(row=>row.status==="ONLINE").length, downMonitors:monitors.filter(row=>row.status==="OFFLINE").length, criticalIncidents:incidents.filter(row=>row.severity==="CRITICAL").length, sslExpiring:monitors.filter(row=>["EXPIRING_SOON","EXPIRED","INVALID"].includes(row.ssl_status)).length };
      }),
      this.domain("RRHH", {activeEmployees:0}, async()=>({activeEmployees:(await this.rows("employees","id",q=>q.eq("status","ACTIVE"))).length})),
      this.domain("AUDITORIAS", {pendingAudits:0}, async()=>({pendingAudits:(await this.rows("audit_runs","id",q=>q.not("status","in","(COMPLETED,CANCELLED)"))).length})),
      this.domain("FINANZAS", {pendingInvoices:0,overdueReceivables:0}, async()=>{
        const invoices=await this.rows("invoices","status,due_date,balance_due",q=>q.in("status",["ISSUED","PARTIALLY_PAID"]));
        return {pendingInvoices:invoices.length,overdueReceivables:invoices.filter(row=>row.due_date&&row.due_date<today()&&num(row.balance_due)>0).length};
      }),
      this.domain("SOPORTE", {criticalTickets:0}, async()=>({criticalTickets:(await this.rows("support_tickets","id",q=>q.eq("severity","CRITICAL").in("status",openTicketStatuses).is("archived_at",null))).length})),
      this.domain("SEGURIDAD", {securityEvents:0}, async()=>({securityEvents:(await this.rows("security_events","id",q=>q.gte("created_at",new Date(Date.now()-30*86_400_000).toISOString()))).length})),
    ]);
    const sources=[commercial.health,clients.health,operations.health,monitoring.health,people.health,audits.health,finance.health,support.health,security.health];
    const metrics={...commercial.value,...clients.value,...operations.value,...monitoring.value,...people.value,...audits.value,...finance.value,...support.value,...security.value};
    const attention:ExecutiveDashboard["attention"]=([
      ["SOPORTE","Tickets críticos",metrics.criticalTickets,"/support"],
      ["MONITOREO","Sitios caídos",metrics.downMonitors,"/monitoring/status"],
      ["MONITOREO","Incidentes críticos",metrics.criticalIncidents,"/monitoring/incidents"],
      ["OPERACIONES","Proyectos atrasados",metrics.overdueProjects,"/projects"],
      ["OPERACIONES","Tareas vencidas",metrics.overdueTasks,"/tasks"],
      ["FINANZAS","Facturas vencidas",metrics.overdueReceivables,"/finance/collections"],
      ["AUDITORIAS","Auditorías pendientes",metrics.pendingAudits,"/audits"],
      ["SEGURIDAD","Eventos de seguridad (30 días)",metrics.securityEvents,"/security/events"],
    ] as Array<[string,string,number,string]>).filter(([, , count])=>count>0).map(([domain,label,count,href])=>({domain,label,count,href,severity:domain==="SEGURIDAD"||label.includes("crític")?"CRITICAL":"ATTENTION"}));
    return { generatedAt:new Date().toISOString(), status:sources.every(source=>source.status==="OK")?"OK":"DEGRADED", sources, metrics, attention };
  }

  async client(clientId:string, includeFinance=false):Promise<ClientIntegrationSummary> {
    const openQuoteStatuses=["DRAFT","PENDING_APPROVAL","APPROVED","READY_TO_SEND","SENT","NEGOTIATING"];
    const activeProjects=["PLANNING","READY","IN_PROGRESS","BLOCKED","INTERNAL_REVIEW","QA","WAITING_CLIENT","READY_FOR_PRODUCTION","PRODUCTION","MAINTENANCE","ON_HOLD"];
    const openOrders=["DRAFT","READY_FOR_HANDOFF","PENDING_PLANNING","PLANNING","PENDING_ASSIGNMENT","ASSIGNED","IN_PROGRESS","IN_REVIEW","WAITING_CLIENT","PENDING_HANDOFF","READY"];
    const openTickets=["NEW","TRIAGE","OPEN","ASSIGNED","IN_PROGRESS","WAITING_CLIENT","WAITING_INTERNAL","WAITING_THIRD_PARTY","REOPENED"];
    const activeIncidents=["DETECTED","CONFIRMED","ACKNOWLEDGED","INVESTIGATING","MITIGATING","MONITORING"];
    const [commercial,operations,documents,support,monitoring,audits,finance] = await Promise.all([
      this.domain("COMERCIAL",{openOpportunities:0,pipelineValue:0,pendingQuotes:0,sales:0,salesValue:0},async()=>{
        const[o,q,s]=await Promise.all([this.rows("opportunities","estimated_value,currency",x=>x.eq("client_id",clientId).eq("status","OPEN")),this.rows("quotes","id",x=>x.eq("client_id",clientId).in("status",openQuoteStatuses)),this.rows("sales","amount,currency",x=>x.eq("client_id",clientId).eq("status","WON"))]);
        return{openOpportunities:o.length,pipelineValue:sum(o.filter(row=>row.currency==="CLP"),"estimated_value"),pendingQuotes:q.length,sales:s.length,salesValue:sum(s.filter(row=>row.currency==="CLP"),"amount")};
      }),
      this.domain("OPERACIONES",{activeProjects:0,atRiskProjects:0,overdueProjects:0,openWorkOrders:0},async()=>{
        const[p,w]=await Promise.all([this.rows("projects","status,health,target_date",x=>x.eq("client_id",clientId).in("status",activeProjects)),this.rows("work_orders","id",x=>x.eq("client_id",clientId).in("status",openOrders))]);
        return{activeProjects:p.length,atRiskProjects:p.filter(row=>["AT_RISK","CRITICAL"].includes(row.health)).length,overdueProjects:p.filter(row=>row.target_date&&row.target_date<today()).length,openWorkOrders:w.length};
      }),
      this.domain("DOCUMENTOS",{total:0,pendingReview:0,pendingSignature:0},async()=>{
        const links=await this.rows("document_links","document_id",x=>x.eq("link_type","CLIENT").eq("linked_id",clientId));const ids=[...new Set(links.map(row=>row.document_id))];if(!ids.length)return{total:0,pendingReview:0,pendingSignature:0};const docs=await this.rows("documents","status",x=>x.in("id",ids).neq("status","TRASHED"));return{total:docs.length,pendingReview:docs.filter(row=>row.status==="IN_REVIEW").length,pendingSignature:docs.filter(row=>["READY_FOR_SIGNATURE","SIGNING"].includes(row.status)).length};
      }),
      this.domain("SOPORTE",{open:0,critical:0,breached:0},async()=>{const rows=await this.rows("support_tickets","severity,first_response_due_at,first_responded_at,resolution_due_at,resolved_at",x=>x.eq("client_id",clientId).in("status",openTickets).is("archived_at",null));const now=new Date().toISOString();return{open:rows.length,critical:rows.filter(row=>row.severity==="CRITICAL").length,breached:rows.filter(row=>(row.first_response_due_at&&!row.first_responded_at&&row.first_response_due_at<now)||(row.resolution_due_at&&!row.resolved_at&&row.resolution_due_at<now)).length};}),
      this.domain("MONITOREO",{total:0,online:0,down:0,activeIncidents:0},async()=>{const[m,i]=await Promise.all([this.rows("monitors","status",x=>x.eq("client_id",clientId).eq("enabled",true)),this.rows("incidents","id",x=>x.eq("client_id",clientId).in("status",activeIncidents))]);return{total:m.length,online:m.filter(row=>row.status==="ONLINE").length,down:m.filter(row=>row.status==="OFFLINE").length,activeIncidents:i.length};}),
      this.domain("AUDITORIAS",{scheduled:0,openFindings:0,criticalFindings:0},async()=>{const[r,f]=await Promise.all([this.rows("audit_runs","id",x=>x.eq("client_id",clientId).not("status","in","(COMPLETED,CANCELLED)")),this.rows("audit_findings","severity,status",x=>x.eq("client_id",clientId).not("status","in","(RESOLVED,NOT_APPLICABLE,CLOSED)"))]);return{scheduled:r.length,openFindings:f.length,criticalFindings:f.filter(row=>row.severity==="CRITICAL").length};}),
      includeFinance?this.domain("FINANZAS",{openInvoices:0,overdueInvoices:0,balanceDue:0,overdueBalance:0},async()=>{const rows=await this.rows("invoices","status,due_date,balance_due",x=>x.eq("client_id",clientId).in("status",["ISSUED","PARTIALLY_PAID"]));const overdue=rows.filter(row=>row.due_date&&row.due_date<today());return{openInvoices:rows.length,overdueInvoices:overdue.length,balanceDue:sum(rows,"balance_due"),overdueBalance:sum(overdue,"balance_due")};}):Promise.resolve({value:null,health:{domain:"FINANZAS",status:"UNAVAILABLE" as const,detail:"Requiere permiso financiero explícito."}}),
    ]);
    const sources=[commercial.health,operations.health,documents.health,support.health,monitoring.health,audits.health,finance.health];
    return{clientId,generatedAt:new Date().toISOString(),status:sources.some(source=>source.status==="DEGRADED")?"DEGRADED":"OK",sources,commercial:commercial.value,operations:operations.value,documents:documents.value,support:support.value,monitoring:monitoring.value,audits:audits.value,finance:finance.value};
  }
}

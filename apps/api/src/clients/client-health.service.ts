import { Injectable } from "@nestjs/common";
import type { ClientHealthFactor, ClientHealthStatus } from "@zyteron/contracts";

export interface ClientDomainHealthSignals {
  totalContracts: number;
  expiredContracts: number;
  totalServices: number;
  suspendedServices: number;
  totalRenewals: number;
  overdueRenewals: number;
  openSupportTickets?: number;
  criticalSupportTickets?: number;
  supportSlaBreaches?: number;
  openInvoices?:number;
  overdueInvoices?:number;
  activeMonitoringIncidents?:number;
  criticalMonitoringIncidents?:number;
  downMonitors?:number;
  activeProjects?:number;
  overdueProjects?:number;
  atRiskProjects?:number;
}

@Injectable()
export class ClientHealthService {
  evaluate(signals?: ClientDomainHealthSignals): { status: ClientHealthStatus; factors: ClientHealthFactor[] } {
    if (!signals) {
      return {
        status:"INSUFFICIENT_DATA",
        factors:[{key:"client-domain",label:"Señales empresariales",reason:"No existen señales operacionales suficientes.",available:false,status:"UNKNOWN"}],
      };
    }

    const openSupport=signals.openSupportTickets??0,criticalSupport=signals.criticalSupportTickets??0,supportBreaches=signals.supportSlaBreaches??0;
    const paymentsAvailable=signals.openInvoices!==undefined,monitoringAvailable=signals.activeMonitoringIncidents!==undefined,projectsAvailable=signals.activeProjects!==undefined;
    const hasSignals=signals.totalContracts+signals.totalServices+signals.totalRenewals+openSupport+(signals.openInvoices??0)+(signals.activeProjects??0)+(signals.activeMonitoringIncidents??0)>0;
    const factors: ClientHealthFactor[] = [
      {key:"payments",label:"Pagos al día",available:paymentsAvailable,status:!paymentsAvailable?"UNKNOWN":(signals.overdueInvoices??0)>0?"NEGATIVE":"POSITIVE",reason:!paymentsAvailable?"Finance no respondió.":(signals.overdueInvoices??0)>0?`${signals.overdueInvoices} factura(s) vencida(s) con saldo.`:(signals.openInvoices??0)>0?`${signals.openInvoices} factura(s) abierta(s), ninguna vencida.`:"No hay facturas abiertas."},
      {key:"incidents",label:"Monitoreo e incidentes",available:monitoringAvailable,status:!monitoringAvailable?"UNKNOWN":(signals.criticalMonitoringIncidents??0)>0||(signals.downMonitors??0)>0?"NEGATIVE":"POSITIVE",reason:!monitoringAvailable?"Monitoring no respondió.":(signals.downMonitors??0)>0?`${signals.downMonitors} monitor(es) fuera de línea.`:(signals.activeMonitoringIncidents??0)>0?`${signals.activeMonitoringIncidents} incidente(s) activo(s), sin criticidad máxima.`:"No hay incidentes activos."},
      {key:"projects",label:"Proyectos en plazo",available:projectsAvailable,status:!projectsAvailable?"UNKNOWN":(signals.overdueProjects??0)>0||(signals.atRiskProjects??0)>0?"NEGATIVE":"POSITIVE",reason:!projectsAvailable?"Operations no respondió.":(signals.overdueProjects??0)>0?`${signals.overdueProjects} proyecto(s) fuera de plazo.`:(signals.atRiskProjects??0)>0?`${signals.atRiskProjects} proyecto(s) en riesgo.`:(signals.activeProjects??0)>0?`${signals.activeProjects} proyecto(s) activo(s) en control.`:"No hay proyectos activos."},
      {
        key: "support", label: "Tickets y SLA", available: true,
        status: criticalSupport > 0 || supportBreaches > 0 ? "NEGATIVE" : "POSITIVE",
        reason: criticalSupport > 0 ? `${criticalSupport} ticket(s) crítico(s) abierto(s).` : supportBreaches > 0 ? `${supportBreaches} ticket(s) con SLA vencido.` : openSupport > 0 ? `${openSupport} ticket(s) abierto(s), sin señales críticas.` : "No hay tickets abiertos.",
      },
      {
        key: "contracts", label: "Vigencia contractual", available: signals.totalContracts > 0,
        status: signals.expiredContracts > 0 ? "NEGATIVE" : signals.totalContracts > 0 ? "POSITIVE" : "UNKNOWN",
        reason: signals.totalContracts === 0 ? "No existen contratos registrados." : signals.expiredContracts > 0 ? `${signals.expiredContracts} contrato(s) vencido(s).` : "No hay contratos vencidos.",
      },
      {
        key: "services", label: "Continuidad de servicios", available: signals.totalServices > 0,
        status: signals.suspendedServices > 0 ? "NEGATIVE" : signals.totalServices > 0 ? "POSITIVE" : "UNKNOWN",
        reason: signals.totalServices === 0 ? "No existen servicios registrados." : signals.suspendedServices > 0 ? `${signals.suspendedServices} servicio(s) suspendido(s).` : "No hay servicios suspendidos.",
      },
      {
        key: "renewals", label: "Renovaciones", available: signals.totalRenewals > 0,
        status: signals.overdueRenewals > 0 ? "NEGATIVE" : signals.totalRenewals > 0 ? "POSITIVE" : "UNKNOWN",
        reason: signals.totalRenewals === 0 ? "No existen renovaciones registradas." : signals.overdueRenewals > 0 ? `${signals.overdueRenewals} renovación(es) vencida(s) sin cierre.` : "No hay renovaciones vencidas sin cierre.",
      },
    ];
    if(!hasSignals)return{status:"INSUFFICIENT_DATA",factors};
    const status: ClientHealthStatus = signals.overdueRenewals > 0 || criticalSupport > 0 || (signals.criticalMonitoringIncidents??0)>0 || (signals.downMonitors??0)>0 ? "CRITICAL" : signals.expiredContracts > 0 || signals.suspendedServices > 0 || supportBreaches > 0 || (signals.overdueInvoices??0)>0 || (signals.overdueProjects??0)>0 || (signals.atRiskProjects??0)>0 ? "RISK" : "HEALTHY";
    return { status, factors };
  }
}

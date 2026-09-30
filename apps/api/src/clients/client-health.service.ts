import { Injectable } from "@nestjs/common";
import type { ClientHealthFactor, ClientHealthStatus } from "@zyteron/contracts";

export interface ClientDomainHealthSignals {
  totalContracts: number;
  expiredContracts: number;
  totalServices: number;
  suspendedServices: number;
  totalRenewals: number;
  overdueRenewals: number;
}

@Injectable()
export class ClientHealthService {
  evaluate(signals?: ClientDomainHealthSignals): { status: ClientHealthStatus; factors: ClientHealthFactor[] } {
    const unavailable: ClientHealthFactor[] = [
      { key: "payments", label: "Pagos al día", reason: "Finance aún no entrega saldos.", available: false, status: "UNKNOWN" },
      { key: "support", label: "Tickets y SLA", reason: "Support aún no entrega métricas.", available: false, status: "UNKNOWN" },
      { key: "incidents", label: "Incidentes", reason: "Monitoring aún no entrega incidencias.", available: false, status: "UNKNOWN" },
      { key: "projects", label: "Proyectos en plazo", reason: "Projects aún no entrega avance.", available: false, status: "UNKNOWN" },
    ];
    if (!signals || signals.totalContracts + signals.totalServices + signals.totalRenewals === 0) {
      return {
        status: "INSUFFICIENT_DATA",
        factors: [...unavailable, { key: "client-domain", label: "Contratos, servicios y renovaciones", reason: "No existen señales operacionales suficientes.", available: false, status: "UNKNOWN" }],
      };
    }

    const factors: ClientHealthFactor[] = [
      ...unavailable,
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
    const status: ClientHealthStatus = signals.overdueRenewals > 0 ? "CRITICAL" : signals.expiredContracts > 0 || signals.suspendedServices > 0 ? "RISK" : "HEALTHY";
    return { status, factors };
  }
}

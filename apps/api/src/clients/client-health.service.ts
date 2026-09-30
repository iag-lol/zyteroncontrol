import { Injectable } from "@nestjs/common";
import type { ClientHealthFactor, ClientHealthStatus } from "@zyteron/contracts";

@Injectable()
export class ClientHealthService {
  evaluate(): { status: ClientHealthStatus; factors: ClientHealthFactor[] } {
    const definitions: Array<[string, string, string]> = [
      ["payments", "Pagos al día", "Finance aún no entrega saldos."],
      ["support", "Tickets y SLA", "Support aún no entrega métricas."],
      ["incidents", "Incidentes", "Monitoring aún no entrega incidencias."],
      ["projects", "Proyectos en plazo", "Projects aún no entrega avance."],
      ["activity", "Actividad reciente", "No existe actividad suficiente."],
      ["renewals", "Renovaciones", "No existen renovaciones calculadas."],
    ];
    const factors: ClientHealthFactor[] = definitions.map(([key, label, reason]) => ({
      key, label, reason, available: false, status: "UNKNOWN",
    }));
    return { status: "INSUFFICIENT_DATA", factors };
  }
}

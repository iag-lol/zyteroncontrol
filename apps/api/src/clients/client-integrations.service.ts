import { Injectable } from "@nestjs/common";
import { AuditsModule } from "../audits/audits.module.js";
import { CrmModule } from "../crm/crm.module.js";
import { DocumentsModule } from "../documents/documents.module.js";
import { MonitoringModule } from "../monitoring/monitoring.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { QuotesModule } from "../quotes/quotes.module.js";
import { SupportModule } from "../support/support.module.js";
import { WorkOrdersModule } from "../work-orders/work-orders.module.js";
import { clientProviderPorts } from "./client-provider-ports.js";

export const clientDomainModules = {
  CRM: CrmModule,
  QUOTES: QuotesModule,
  WORK_ORDERS: WorkOrdersModule,
  PROJECTS: ProjectsModule,
  DOCUMENTS: DocumentsModule,
  // Referencia por nombre: Finanzas consume Clientes y un import directo crearía un ciclo de módulos ES.
  FINANCE: "FinanceModule",
  SUPPORT: SupportModule,
  MONITORING: MonitoringModule,
  AUDITS: AuditsModule,
  NOTIFICATIONS: NotificationsModule,
  PORTAL_CLIENT: "client_portal_settings",
} as const;

@Injectable()
export class ClientIntegrationsService {
  describe() {
    return Object.keys(clientDomainModules).map((domain) => ({
      domain,
      relation: "client_id",
      ownership: domain === "PORTAL_CLIENT" ? "CLIENTS" : domain,
    })).concat(Object.entries(clientProviderPorts).map(([domain, status]) => ({ domain, relation: status, ownership: "PROVIDER_PORT" })));
  }
}

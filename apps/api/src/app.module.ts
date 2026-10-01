import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RoleGuard } from "./auth/role.guard.js";
import { CrmModule } from "./crm/crm.module.js";
import { HealthController } from "./health.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { UsersModule } from "./users/users.module.js";
import { RolesModule } from "./roles/roles.module.js";
import { PermissionsModule } from "./permissions/permissions.module.js";
import { ClientsModule } from "./clients/clients.module.js";
import { WorkOrdersModule } from "./work-orders/work-orders.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { DevelopmentModule } from "./development/development.module.js";
import { MonitoringModule } from "./monitoring/monitoring.module.js";
import { IncidentsModule } from "./incidents/incidents.module.js";
import { AuditsModule } from "./audits/audits.module.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { HrModule } from "./hr/hr.module.js";
import { FinanceModule } from "./finance/finance.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { SecurityModule } from "./security/security.module.js";
import { VaultModule } from "./vault/vault.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { SupportModule } from "./support/support.module.js";
import { ContactsModule } from "./contacts/contacts.module.js";
import { ContractsModule } from "./contracts/contracts.module.js";
import { ClientServicesModule } from "./client-services/client-services.module.js";
import { RenewalsModule } from "./renewals/renewals.module.js";
import { CommercialModule } from "./commercial/commercial.module.js";

@Module({
  imports: [
    AuthModule,
    CrmModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ClientsModule,
    ContactsModule,
    ContractsModule,
    ClientServicesModule,
    RenewalsModule,
    CommercialModule,
    WorkOrdersModule,
    ProjectsModule,
    TasksModule,
    DevelopmentModule,
    MonitoringModule,
    IncidentsModule,
    AuditsModule,
    DocumentsModule,
    HrModule,
    FinanceModule,
    NotificationsModule,
    SecurityModule,
    VaultModule,
    ReportsModule,
    SettingsModule,
    SupportModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: RoleGuard }],
})
export class AppModule {}

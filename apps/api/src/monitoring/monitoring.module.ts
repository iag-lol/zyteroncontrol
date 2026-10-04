import { Module } from "@nestjs/common";
import { createServerSupabase } from "../domain/server-supabase.js";
import { OperationsModule } from "../operations/operations.module.js";
import { OperationsRepository } from "../operations/operations.repository.js";
import { UsersModule } from "../users/users.module.js";
import { CertificateProbe } from "./certificate-probe.js";
import { HttpChecker } from "./http-checker.js";
import { MonitoringAlerts, MonitoringMailer } from "./monitoring.alerts.js";
import { MonitoringController } from "./monitoring.controller.js";
import { MemoryMonitoringStore } from "./monitoring.memory-store.js";
import { MonitoringRunner } from "./monitoring.runner.js";
import { MonitoringScheduler } from "./monitoring.scheduler.js";
import { monitoringResolverProvider, MonitoringService } from "./monitoring.service.js";
import { MONITORING_STORE, unavailableMonitoringStore } from "./monitoring.store.js";
import { SupabaseMonitoringStore } from "./monitoring.supabase-store.js";

export const monitoringProviders = [
  {
    provide: MONITORING_STORE,
    inject: [OperationsRepository],
    useFactory: (operations: OperationsRepository) => {
      const client = createServerSupabase();
      if (client) return new SupabaseMonitoringStore(client, operations);
      if (process.env.NODE_ENV === "test" || (process.env.NODE_ENV !== "production" && process.env.MONITORING_STORE_MODE === "memory")) return new MemoryMonitoringStore(operations);
      return unavailableMonitoringStore();
    },
  },
  { provide: HttpChecker, useFactory: () => new HttpChecker() },
  { provide: CertificateProbe, useFactory: () => new CertificateProbe() },
  monitoringResolverProvider,
  MonitoringMailer, MonitoringAlerts, MonitoringRunner, MonitoringScheduler, MonitoringService,
];

@Module({
  imports: [OperationsModule, UsersModule],
  controllers: [MonitoringController],
  providers: monitoringProviders,
  exports: [MonitoringService, MONITORING_STORE],
})
export class MonitoringModule {}

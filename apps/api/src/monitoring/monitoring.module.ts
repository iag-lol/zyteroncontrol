import { Module } from "@nestjs/common";
import { createServerSupabase } from "../domain/server-supabase.js";
import { OperationsModule } from "../operations/operations.module.js";
import { OperationsRepository } from "../operations/operations.repository.js";
import { CertificateProbe } from "./certificate-probe.js";
import { HttpChecker } from "./http-checker.js";
import { MonitoringAlerts, MonitoringMailer } from "./monitoring.alerts.js";
import { MonitoringController } from "./monitoring.controller.js";
import { MemoryMonitoringStore } from "./monitoring.memory-store.js";
import { MonitoringRunner } from "./monitoring.runner.js";
import { MonitoringScheduler } from "./monitoring.scheduler.js";
import { monitoringResolverProvider, MonitoringService } from "./monitoring.service.js";
import { MONITORING_STORE } from "./monitoring.store.js";
import { SupabaseMonitoringStore } from "./monitoring.supabase-store.js";

export const monitoringProviders = [
  {
    provide: MONITORING_STORE,
    inject: [OperationsRepository],
    // Sin credenciales Supabase se usa el store volátil, igual que el resto de los dominios en desarrollo.
    useFactory: (operations: OperationsRepository) => { const client = createServerSupabase(); return client ? new SupabaseMonitoringStore(client, operations) : new MemoryMonitoringStore(operations); },
  },
  { provide: HttpChecker, useFactory: () => new HttpChecker() },
  { provide: CertificateProbe, useFactory: () => new CertificateProbe() },
  monitoringResolverProvider,
  MonitoringMailer, MonitoringAlerts, MonitoringRunner, MonitoringScheduler, MonitoringService,
];

@Module({
  imports: [OperationsModule],
  controllers: [MonitoringController],
  providers: monitoringProviders,
  exports: [MonitoringService, MONITORING_STORE],
})
export class MonitoringModule {}

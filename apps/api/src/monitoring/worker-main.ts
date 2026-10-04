import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { config } from "dotenv";
import { resolve } from "node:path";
import { MonitoringModule } from "./monitoring.module.js";

// Worker standalone opcional (Render Background Worker): `node dist/monitoring/worker-main.js`.
// Sin servidor HTTP; comparte la cola con el web service gracias a los leases SKIP LOCKED.
config({ path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")] });

@Module({ imports: [MonitoringModule] })
class MonitoringWorkerModule {}

async function bootstrap() {
  if (process.env.MONITORING_WORKER_ENABLED === "false") throw new Error("MONITORING_WORKER_ENABLED=false: este proceso sólo existe para ejecutar checks.");
  process.env.MONITORING_PROCESS_ROLE = "worker";
  const app = await NestFactory.createApplicationContext(MonitoringWorkerModule);
  app.enableShutdownHooks();
}

void bootstrap();

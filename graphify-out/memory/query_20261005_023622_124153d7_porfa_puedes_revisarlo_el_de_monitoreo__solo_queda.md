---
type: "query"
date: "2026-10-05T02:36:22.101469+00:00"
question: "porfa puedes revisarlo el de monitoreo, solo quedaron los registros manuales que hice, en ningun momento reviso periodicamente la web de forma autonoma o automatica!!!! haz que sea autonomo si se registra una web para monitoreo"
contributor: "graphify"
outcome: "useful"
source_nodes: ["MonitoringScheduler", "worker-main.ts", "MonitoringModule", "monitoring.scheduler.ts"]
---

# Q: porfa puedes revisarlo el de monitoreo, solo quedaron los registros manuales que hice, en ningun momento reviso periodicamente la web de forma autonoma o automatica!!!! haz que sea autonomo si se registra una web para monitoreo

## Answer

Expanded from original query via vocab: [monitoring, endpoint, checks, interval, scheduler, worker, probe, uptime, repository, service, schedule]. Graph traversal identified MonitoringScheduler, worker-main.ts, MonitoringModule and docs/MONITORING.md. Root cause verified in monitoringWorkerEnabled(): production only enabled the scheduler when MONITORING_PROCESS_ROLE=worker, but Render has only the web API and frontend services and no Background Worker or monitoring environment variables. Corrected the API so the embedded scheduler is enabled by default unless MONITORING_WORKER_ENABLED=false; Supabase leases continue preventing duplicate scheduled checks. Updated runtime tests and deployment documentation.

## Outcome

- Signal: useful

## Source Nodes

- MonitoringScheduler
- worker-main.ts
- MonitoringModule
- monitoring.scheduler.ts
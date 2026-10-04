---
type: "query"
date: "2026-10-04T11:31:49.402464+00:00"
question: "da este error Internal server error"
contributor: "graphify"
outcome: "useful"
source_nodes: ["MonitoringDashboard", "SupabaseMonitoringStore", "20261001050000_site_reliability_monitoring.sql", "20261004190000_monitoring_recovery.sql"]
---

# Q: da este error Internal server error

## Answer

Expanded from original query via graph vocab: [monitoring, monitoringdashboard, monitorcheck, endpoint, supabase, error, service, status]. Render showed PGRST205 because public.monitors, public.incidents and public.alert_delivery_events were absent. Applied 20261001050000_site_reliability_monitoring.sql and 20261004190000_monitoring_recovery.sql successfully in ADMINZYTERONCONTROL; the Monitoring Dashboard and Sites now load empty states without HTTP 500.

## Outcome

- Signal: useful

## Source Nodes

- MonitoringDashboard
- SupabaseMonitoringStore
- 20261001050000_site_reliability_monitoring.sql
- 20261004190000_monitoring_recovery.sql
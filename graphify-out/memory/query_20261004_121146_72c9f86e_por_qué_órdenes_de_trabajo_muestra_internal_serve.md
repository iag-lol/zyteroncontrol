---
type: "explain"
date: "2026-10-04T12:11:46.664614+00:00"
question: "¿Por qué Órdenes de trabajo muestra Internal server error y cómo hacer que Monitoreo no exija un proyecto?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["OperationsRepository", "MonitoringService", "SupabaseMonitoringStore", "SitesPage", "project_endpoints", "monitors"]
---

# Q: ¿Por qué Órdenes de trabajo muestra Internal server error y cómo hacer que Monitoreo no exija un proyecto?

## Answer

Órdenes de trabajo ya funciona en producción tras aplicar las migraciones de Operaciones/Monitoreo. Monitoreo queda desacoplado de la obligatoriedad de proyecto: cliente requerido, proyecto opcional, endpoint independiente soportado en API, memoria, Supabase, UI, RLS y payload del worker; tareas correctivas y mantenimiento conservan relación obligatoria con Operaciones.

## Outcome

- Signal: useful

## Source Nodes

- OperationsRepository
- MonitoringService
- SupabaseMonitoringStore
- SitesPage
- project_endpoints
- monitors
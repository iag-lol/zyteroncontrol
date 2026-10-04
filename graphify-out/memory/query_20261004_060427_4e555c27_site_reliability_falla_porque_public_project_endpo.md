---
type: "query"
date: "2026-10-04T06:04:27.272893+00:00"
question: "Site Reliability falla porque public.project_endpoints no existe; Financial y Security fallan porque public.projects no existe"
contributor: "graphify"
outcome: "useful"
source_nodes: ["20261001010000_delivery_operations_center.sql", "20261001050000_site_reliability_monitoring.sql", "20261001150000_financial_accounting_center.sql", "20261004010000_security_control_plane.sql"]
---

# Q: Site Reliability falla porque public.project_endpoints no existe; Financial y Security fallan porque public.projects no existe

## Answer

Expanded from original query via vocab: [site, reliability, monitoring, financial, finance, security, project, projects, endpoint, endpoints, migration, schema]. Los tres errores tienen una sola causa: falta aplicar 20261001010000_delivery_operations_center.sql. Esa migracion es la fuente canonica y crea public.projects y public.project_endpoints; Monitoring declara que reutiliza projects, project_endpoints, deployments y tasks, y Finance y Security referencian public.projects. No se deben crear tablas placeholder en los modulos dependientes. Aplicar las migraciones faltantes en orden ascendente, verificar ambas relaciones con to_regclass y luego volver a ejecutar Monitoring, Finance y Security; sus transacciones fallidas se revirtieron.

## Outcome

- Signal: useful

## Source Nodes

- 20261001010000_delivery_operations_center.sql
- 20261001050000_site_reliability_monitoring.sql
- 20261001150000_financial_accounting_center.sql
- 20261004010000_security_control_plane.sql
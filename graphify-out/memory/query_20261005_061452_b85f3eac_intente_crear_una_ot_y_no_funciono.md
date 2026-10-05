---
type: "query"
date: "2026-10-05T06:14:52.238917+00:00"
question: "intente crear una OT y no funciono"
contributor: "graphify"
outcome: "useful"
source_nodes: ["OperationsWorkspace", "OperationsService", "OperationsRepository", "operationsCreateInitialValue", "work_orders_status_check"]
---

# Q: intente crear una OT y no funciono

## Answer

Expanded from original query via graph vocab: [work, order, operations, create, delivery, repository, controller, service, supabase, client, project, handoff]. Los logs de producción mostraron PostgreSQL 23514: el formulario compartido enviaba status BACKLOG al crear work_orders, violando work_orders_status_check. Se separaron valores iniciales por tipo de entidad mediante operationsCreateInitialValue; una OT ahora envía DRAFT y el backend OperationsService fuerza DRAFT como defensa. Se añadieron pruebas de regresión y se corrigieron también defaults visibles de worklog, deliverable y deployment.

## Outcome

- Signal: useful

## Source Nodes

- OperationsWorkspace
- OperationsService
- OperationsRepository
- operationsCreateInitialValue
- work_orders_status_check
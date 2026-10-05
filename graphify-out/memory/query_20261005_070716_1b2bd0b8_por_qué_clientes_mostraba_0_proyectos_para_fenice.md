---
type: "architecture"
date: "2026-10-05T07:07:16.398661+00:00"
question: "Por qué Clientes mostraba 0 proyectos para Fenice cuando existía una OT y cómo integrar ambas secciones"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ClientsService", "DomainInsightsService", "OperationsRepository", "portfolio", "workOrders", "projects", "createProjectFromWorkOrder"]
---

# Q: Por qué Clientes mostraba 0 proyectos para Fenice cuando existía una OT y cómo integrar ambas secciones

## Answer

La fuente projects tenía 0 filas porque OT-2026-000003 seguía en DRAFT: una OT no es un proyecto hasta convertirla. Se añadió openWorkOrderCount al agregado DomainInsightsService.portfolio, al contrato Client y a la cartera web para mostrar separadamente proyectos activos y OT abiertas con enlaces filtrados por clientId. Se agregó una prueba de regresión que verifica 0 proyectos y 1 OT.

## Outcome

- Signal: useful

## Source Nodes

- ClientsService
- DomainInsightsService
- OperationsRepository
- portfolio
- workOrders
- projects
- createProjectFromWorkOrder
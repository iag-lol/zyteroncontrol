---
type: "query"
date: "2026-09-30T07:58:15.448453+00:00"
question: "¿Cómo conecta Client 360 con los dominios empresariales?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ClientIntegrationsService", "clientDomainModules", "ClientsService", "ClientsRepository", "Client360()"]
---

# Q: ¿Cómo conecta Client 360 con los dominios empresariales?

## Answer

ClientIntegrationsService declara CRM, Quotes, Work Orders, Projects, Documents, Finance, Support, Monitoring, Audits, Notifications y Portal Client; ClientsService expone relaciones por client_id, mientras Client360 consume rutas y resúmenes sin duplicar ownership.

## Outcome

- Signal: useful

## Source Nodes

- ClientIntegrationsService
- clientDomainModules
- ClientsService
- ClientsRepository
- Client360()
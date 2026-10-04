---
type: "query"
date: "2026-10-04T12:56:37.663862+00:00"
question: "y no resolvistev ese error? Internal server error en Soporte Inbox"
contributor: "graphify"
outcome: "useful"
source_nodes: ["SupportWorkspace", "support-api.ts", "SupportController", "SupportTicketService", "SupportRepository", "support.repository.ts"]
---

# Q: y no resolvistev ese error? Internal server error en Soporte Inbox

## Answer

Expanded from original query via vocab: [support, inbox, ticket, detail, message, service, repository, controller, server, error, workspace]. El flujo SupportWorkspace -> supportApi.detail -> SupportController.detail -> SupportTicketService.detail -> SupportRepository.clientContext fallaba con PostgreSQL 42703 porque clientContext seleccionaba client_services.service_type, columna inexistente. Se eliminó esa columna del select real y se añadió una prueba de regresión del contrato de consulta.

## Outcome

- Signal: useful

## Source Nodes

- SupportWorkspace
- support-api.ts
- SupportController
- SupportTicketService
- SupportRepository
- support.repository.ts
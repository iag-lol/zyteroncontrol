---
type: "query"
date: "2026-09-30T10:10:21.841033+00:00"
question: "¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["clients/[[...segments]]/page.tsx", "Client360()", "ClientHub()", "ModulePage()"]
---

# Q: ¿Por qué sólo funciona Todos los clientes y las demás secciones del menú devuelven Internal server error?

## Answer

La ruta catch-all /clients/[[...segments]] trataba 360, contacts, contracts, services y renewals como client IDs y Client360 solicitaba /api/clients/<slug>. La corrección enruta 360 al portafolio, las secciones agregadas a ModulePage y sólo permite que un UUID válido abra Client360.

## Outcome

- Signal: useful

## Source Nodes

- clients/[[...segments]]/page.tsx
- Client360()
- ClientHub()
- ModulePage()
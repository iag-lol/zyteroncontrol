---
type: "query"
date: "2026-09-30T09:39:36.107309+00:00"
question: "¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["NewClientWizard()", ".create()", "ClientsRepository", ".toRow()"]
---

# Q: ¿Por qué POST /api/clients devuelve 500 en producción mientras GET /api/clients funciona y la lista sigue vacía?

## Answer

La conexión y lectura de Supabase funcionan, pero la inserción del registro clients falla antes de persistir. El riesgo principal del payload actual son accountExecutiveId, clientLeadId y developmentLeadId: el formulario acepta texto libre y el repositorio lo envía a columnas PostgreSQL uuid sin validar ni convertir cadenas vacías/nombres a null. Un valor no UUID provoca 22P02 y Nest lo expone como 500. Se necesita el log exacto para confirmarlo y corregir validación/selectores.

## Outcome

- Signal: useful

## Source Nodes

- NewClientWizard()
- .create()
- ClientsRepository
- .toRow()
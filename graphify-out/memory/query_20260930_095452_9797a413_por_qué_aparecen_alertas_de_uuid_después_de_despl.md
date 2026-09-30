---
type: "query"
date: "2026-09-30T09:54:52.220380+00:00"
question: "¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["NewClientWizard()", "validateCreateClient", "clientsApi"]
---

# Q: ¿Por qué aparecen alertas de UUID después de desplegar el wizard corregido?

## Answer

La API nueva está activa y valida UUID, mientras una pestaña abierta antes del despliegue conserva el bundle y estado del formulario anterior. El frontend público actual ya contiene Responsables por asignar y no incluye los tres campos libres. Se resuelve cerrando la pestaña, recargando sin caché y creando el cliente desde un formulario nuevo.

## Outcome

- Signal: useful

## Source Nodes

- NewClientWizard()
- validateCreateClient
- clientsApi
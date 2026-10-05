---
type: "architecture"
date: "2026-10-05T07:30:04.401826+00:00"
question: "¿Cómo reparar el contrato 500 y garantizar cotización aceptada → OT → proyecto?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ContractsRepository", "ContractBuilder", "OperationsRepository", "convert_quote_to_work_order", "operations_ensure_project_for_work_order"]
---

# Q: ¿Cómo reparar el contrato 500 y garantizar cotización aceptada → OT → proyecto?

## Answer

ContractsRepository consultaba columnas inexistentes full_name/contact_type; ahora usa name/contact_types. La migración 20261005080000 agrega creación transaccional e idempotente de proyecto por cada OT, recupera OT anteriores, sincroniza asignación/fechas y devuelve projectId desde convert_quote_to_work_order. ContractBuilder autoselecciona el único proyecto y cotización aceptada.

## Outcome

- Signal: useful

## Source Nodes

- ContractsRepository
- ContractBuilder
- OperationsRepository
- convert_quote_to_work_order
- operations_ensure_project_for_work_order
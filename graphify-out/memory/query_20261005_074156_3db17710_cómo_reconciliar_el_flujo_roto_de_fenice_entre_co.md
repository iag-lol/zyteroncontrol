---
type: "data-flow"
date: "2026-10-05T07:41:56.739505+00:00"
question: "¿Cómo reconciliar el flujo roto de Fenice entre cotización, venta, OT y proyecto?"
contributor: "graphify"
outcome: "corrected"
source_nodes: ["quotes", "sales", "work_orders", "projects"]
---

# Q: ¿Cómo reconciliar el flujo roto de Fenice entre cotización, venta, OT y proyecto?

## Answer

Se añadió una migración idempotente y auditada para enlazar COT-2026-000001, su venta WON, OT-2026-000003 y PRJ-2026-000001. La cotización queda CONVERTED, la OT conserva READY_FOR_HANDOFF y el proyecto PLANNING.

## Outcome

- Signal: corrected

## Source Nodes

- quotes
- sales
- work_orders
- projects
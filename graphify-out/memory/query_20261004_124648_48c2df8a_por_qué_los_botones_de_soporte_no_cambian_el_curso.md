---
type: "query"
date: "2026-10-04T12:46:48.421865+00:00"
question: "Por qué los botones de Soporte no cambian el cursor ni transmiten sensación de clic"
contributor: "graphify"
outcome: "useful"
source_nodes: ["support-workspace.tsx", "SupportWorkspace", "support.css"]
---

# Q: Por qué los botones de Soporte no cambian el cursor ni transmiten sensación de clic

## Answer

El módulo carecía de cursor:pointer y de estados interactivos consistentes. Se añadieron hover, active, focus-visible, disabled, feedback de presión, animación de envío y soporte prefers-reduced-motion en support.css, manteniendo el cambio aislado a SupportWorkspace y SupportModal.

## Outcome

- Signal: useful

## Source Nodes

- support-workspace.tsx
- SupportWorkspace
- support.css
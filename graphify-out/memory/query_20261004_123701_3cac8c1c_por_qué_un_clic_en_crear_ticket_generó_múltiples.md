---
type: "architecture"
date: "2026-10-04T12:37:01.473902+00:00"
question: "¿Por qué un clic en Crear ticket generó múltiples tickets y cómo se corrigió?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["apps/web/src/components/support/support-workspace.tsx:59", "apps/web/src/lib/support-api.ts:10", "apps/api/src/support/support.controller.ts:23", "apps/api/src/support/support.service.ts:55", "apps/api/src/support/support.repository.ts:33", "supabase/migrations/20261004195000_support_ticket_idempotency.sql:1"]
---

# Q: ¿Por qué un clic en Crear ticket generó múltiples tickets y cómo se corrigió?

## Answer

El formulario permitía reenviar mientras la primera solicitud seguía en curso y POST /support/tickets no exigía una clave idempotente. Se añadió un bloqueo síncrono y estado Creando en CreateTicket, una clave estable Idempotency-Key en supportApi, validación obligatoria en ambos controladores y una reserva persistente con hash en SupportRepository/SupportTicketService respaldada por support_idempotency_keys. La misma solicitud y clave retorna el ticket original; una clave reutilizada con otro payload se rechaza.

## Outcome

- Signal: useful

## Source Nodes

- apps/web/src/components/support/support-workspace.tsx:59
- apps/web/src/lib/support-api.ts:10
- apps/api/src/support/support.controller.ts:23
- apps/api/src/support/support.service.ts:55
- apps/api/src/support/support.repository.ts:33
- supabase/migrations/20261004195000_support_ticket_idempotency.sql:1
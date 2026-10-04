---
type: "query"
date: "2026-10-04T05:59:06.448567+00:00"
question: "Failed to run sql query: ERROR 42703: column audience_role does not exist en commercial_notifications"
contributor: "graphify"
outcome: "useful"
source_nodes: ["20260930160000_commercial_sales_operations.sql", "20261004020000_commercial_notifications_owner_fix.sql", "commercial_notifications_event_key_uidx", "private.can_manage_sales()"]
---

# Q: Failed to run sql query: ERROR 42703: column audience_role does not exist en commercial_notifications

## Answer

Expanded from original query via vocab: [commercial, notifications, notification, owner, role, policy, migration, schema]. La tabla existente provenia de un esquema anterior y CREATE TABLE IF NOT EXISTS no agregaba audience_role. Se corrigieron 20260930160000_commercial_sales_operations.sql y 20261004020000_commercial_notifications_owner_fix.sql para reconciliar owner_id, audience_role y todas las columnas consumidas por las funciones, la API y la politica RLS antes de recrearla; tambien se preservan destinatarios legacy user_id, recipient_role o role y se asegura la unicidad de event_key. Validacion: 179 pruebas, lint y typecheck aprobados.

## Outcome

- Signal: useful

## Source Nodes

- 20260930160000_commercial_sales_operations.sql
- 20261004020000_commercial_notifications_owner_fix.sql
- commercial_notifications_event_key_uidx
- private.can_manage_sales()
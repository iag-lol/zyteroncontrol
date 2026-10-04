---
type: "query"
date: "2026-10-04T05:52:35.213310+00:00"
question: "Ayúdame con ERROR 42703: column user_id does not exist en commercial_notifications_own de Comercial Sales SQL"
contributor: "graphify"
outcome: "useful"
source_nodes: ["20260930160000_commercial_sales_operations.sql", "20261004020000_commercial_notifications_owner_fix.sql", "private.can_manage_sales()"]
---

# Q: Ayúdame con ERROR 42703: column user_id does not exist en commercial_notifications_own de Comercial Sales SQL

## Answer

Expanded from original query via graph vocab: [commercial, sales, notifications, owner, user, policy, migration, role]. La tabla desplegada usa owner_id, pero la migración, las funciones de proyección y la política RLS usaban user_id. Se alineó todo a owner_id, se agregó backfill compatible desde user_id y se creó 20261004020000_commercial_notifications_owner_fix.sql. Las pruebas Comerciales pasan 11/11 y la suite completa 179/179.

## Outcome

- Signal: useful

## Source Nodes

- 20260930160000_commercial_sales_operations.sql
- 20261004020000_commercial_notifications_owner_fix.sql
- private.can_manage_sales()
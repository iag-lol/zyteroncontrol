---
type: "query"
date: "2026-09-30T06:46:34.303786+00:00"
question: "¿Cómo se conectan los dominios, permisos y rutas empresariales?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["EnterpriseShell()", "canAccessGroup()", "RoleGuard()", "RequireRoles()", "app.module.ts", "ModulePage()"]
---

# Q: ¿Cómo se conectan los dominios, permisos y rutas empresariales?

## Answer

EnterpriseShell filtra la navegación con canAccessGroup; RoleGuard protege el contenido; app.module registra los dominios NestJS; RequireRoles aplica permisos backend; ModulePage resuelve las rutas Next.js y los estados vacíos compartidos.

## Outcome

- Signal: useful

## Source Nodes

- EnterpriseShell()
- canAccessGroup()
- RoleGuard()
- RequireRoles()
- app.module.ts
- ModulePage()
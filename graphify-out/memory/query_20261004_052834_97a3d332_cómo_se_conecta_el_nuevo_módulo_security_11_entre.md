---
type: "query"
date: "2026-10-04T05:28:34.049347+00:00"
question: "Cómo se conecta el nuevo módulo Security 11 entre UI, API, autorización, repositorio, contratos y migración, y existen referencias rotas"
contributor: "graphify"
outcome: "useful"
source_nodes: ["security-workspace.tsx", "security-api.ts", "SecurityController", "SecurityService", "SecurityRepository", "20261004010000_security_control_plane.sql"]
---

# Q: Cómo se conecta el nuevo módulo Security 11 entre UI, API, autorización, repositorio, contratos y migración, y existen referencias rotas

## Answer

Expanded from original query via graph vocab: [security, controller, service, repository, workspace, contracts, api]. El grafo actualizado conecta security-workspace.tsx con security-api.ts; SecurityController con SecurityService y SecurityRepository; SecurityController con RoleGuard mediante SecurityModule y AppModule; y reconoce la migración 20261004010000_security_control_plane.sql con sus funciones de seguridad. Diagnóstico estructural final: 3902 nodos, 11121 aristas, 179 comunidades, 0 endpoints faltantes, 0 endpoints colgantes y 0 duplicados exactos.

## Outcome

- Signal: useful

## Source Nodes

- security-workspace.tsx
- security-api.ts
- SecurityController
- SecurityService
- SecurityRepository
- 20261004010000_security_control_plane.sql

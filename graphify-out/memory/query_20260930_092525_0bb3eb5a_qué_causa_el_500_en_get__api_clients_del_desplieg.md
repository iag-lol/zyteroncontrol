---
type: "query"
date: "2026-09-30T09:25:25.442959+00:00"
question: "¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ClientsRepository", ".list()", "role.guard.ts", "health.controller.ts"]
---

# Q: ¿Qué causa el 500 en GET /api/clients del despliegue Render si /api/health responde 200 y CORS ya es correcto?

## Answer

La solicitud llega correctamente a la API y supera CORS/autorización. El 500 ocurre en ClientsRepository al ejecutar Supabase: credenciales/URL incorrectas o pertenecientes a proyectos distintos, tabla public.clients ausente en el proyecto apuntado, o fallo SQL devuelto por PostgREST. El rol GERENTE_GENERAL no causa este 500; un rol inválido produciría 403.

## Outcome

- Signal: useful

## Source Nodes

- ClientsRepository
- .list()
- role.guard.ts
- health.controller.ts
---
type: "query"
date: "2026-09-30T09:15:35.768642+00:00"
question: "¿Por qué Zyteron Control necesita dos servicios en Render?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["web/package.json", "api/package.json", "clients-api.ts", "main.ts"]
---

# Q: ¿Por qué Zyteron Control necesita dos servicios en Render?

## Answer

El repositorio contiene dos procesos independientes: apps/web ejecuta Next.js y entrega la interfaz al navegador; apps/api ejecuta NestJS, expone /api, aplica permisos y accede a Supabase con la service role. Un Web Service de Render ejecuta un único Start Command/proceso, por lo que la configuración actual necesita un servicio para cada proceso, aunque ambos provengan del mismo repositorio.

## Outcome

- Signal: useful

## Source Nodes

- web/package.json
- api/package.json
- clients-api.ts
- main.ts
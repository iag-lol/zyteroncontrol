---
type: "query"
date: "2026-09-30T08:17:14.193944+00:00"
question: "¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["web/package.json", "next.config.ts", "clients-api.ts", "api/package.json"]
---

# Q: ¿Qué directorio raíz y comandos de build/start requiere Render para desplegar la aplicación web Next.js dentro de este monorepo pnpm?

## Answer

Mantener Root Directory vacío para ejecutar desde la raíz del monorepo. Instalar con pnpm 10.17.1, compilar @zyteron/contracts y @zyteron/web, e iniciar Next con el puerto PORT de Render. La API NestJS debe desplegarse como un segundo Web Service.

## Outcome

- Signal: useful

## Source Nodes

- web/package.json
- next.config.ts
- clients-api.ts
- api/package.json
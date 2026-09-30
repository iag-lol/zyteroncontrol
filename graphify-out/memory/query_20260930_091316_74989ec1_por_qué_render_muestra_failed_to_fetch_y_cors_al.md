---
type: "query"
date: "2026-09-30T09:13:16.859192+00:00"
question: "¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["clients-api.ts", "main.ts", "web/package.json", "api/package.json"]
---

# Q: ¿Por qué Render muestra Failed to fetch y CORS al llamar localhost:4000 desde zyteroncontrol.onrender.com?

## Answer

El frontend Next.js usa el fallback http://localhost:4000/api porque NEXT_PUBLIC_API_URL no estaba definido en su servicio durante el build. La API usa el fallback http://localhost:3000 porque WEB_ORIGIN no está definido en el servicio de API. Deben desplegarse dos servicios, configurar NEXT_PUBLIC_API_URL en frontend y WEB_ORIGIN en API, y reconstruir el frontend porque NEXT_PUBLIC_* se fija durante el build.

## Outcome

- Signal: useful

## Source Nodes

- clients-api.ts
- main.ts
- web/package.json
- api/package.json
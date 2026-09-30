# Zyteron Control

Centro de control operacional interno de Zyteron. Este arranque implementa el primer vertical identificado en la especificación: **Lead → Oportunidad → Cotización → Orden de trabajo → Proyecto**.

## Estructura

- `apps/web`: panel interno en Next.js.
- `apps/api`: API NestJS con autorización deny-by-default.
- `packages/contracts`: tipos compartidos del dominio.
- `docs`: decisiones y hoja de ruta técnica.
- `graphify-out`: mapa consultable de la especificación original.

## Requisitos

- Node.js 22 (mínimo 20.9)
- pnpm 10
- Docker, sólo para PostgreSQL local

## Puesta en marcha

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose up -d postgres
pnpm dev
```

El panel queda en `http://localhost:3000` y la API en `http://localhost:4000/api`.

## Seguridad del arranque

La API protege todos los endpoints salvo los marcados explícitamente como públicos. `AUTH_MODE=development` permite simular un rol mediante `x-zyteron-role`; fuera de ese modo la API rechaza la solicitud hasta integrar Supabase Auth. `SUPABASE_SERVICE_ROLE_KEY` sólo se utiliza en NestJS y nunca se publica en variables `NEXT_PUBLIC_*`.

## Clientes / Client 360

- `/clients`: cartera con búsqueda y paginación server-side, filtros, tres vistas y exportación CSV.
- `/clients/new`: alta guiada de siete pasos con validación real de RUT chileno.
- `/clients/[id]`: Client 360 con contactos, servicios, actividad, Health explicable, Portal Cliente y conexiones a los dominios transversales.
- `supabase/migrations/20260930070000_client_360.sql`: agregado de datos, índices, RLS deny-by-default, outbox y Realtime.
- Sin credenciales Supabase, el backend utiliza un repositorio volátil únicamente en desarrollo para permitir pruebas locales. Configurando `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, utiliza PostgreSQL/Supabase.

Validación:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Estado actual

- Layout empresarial responsive y navegación completa por dominios.
- Consulta del pipeline comercial desde la API.
- Creación de registros comerciales por API.
- Contratos TypeScript compartidos.
- Health check público.
- Estados vacíos reales: no se inyectan métricas ni registros ficticios.
- Persistencia Client 360 preparada para Supabase PostgreSQL mediante migración versionada.

Consulta [ADR-001](docs/ADR-001-primer-vertical.md) para el alcance y las decisiones.

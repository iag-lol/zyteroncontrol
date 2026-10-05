# Reparación e integración de Monitoreo

Fecha de auditoría: 04-10-2026. Rama de trabajo: `fix/monitoring-recovery`.

## Estado verificable

Esta documentación distingue código implementado de infraestructura desplegada. La rama contiene la reparación y las pruebas locales; la migración correctiva y el Background Worker aún deben desplegarse y verificarse en Render/Supabase. No se declara producción operativa sin esa evidencia.

| Función | Resultado en la rama | Evidencia | Entorno validado | Pendiente externo |
|---|---|---|---|---|
| API/engine de monitores | Implementado | `apps/api/src/monitoring` | Tests locales | Desplegar rama |
| Persistencia | Supabase obligatorio; `503` explícito si falta | `monitoring.module.ts`, test runtime | Tests locales | Aplicar migraciones |
| Scheduler | Worker integrado en el API por defecto; Background Worker opcional | `monitoring.scheduler.ts`, script `start:monitoring-worker` | Tests locales | Verificar heartbeat y checks periódicos en Render |
| Concurrencia de checks | Lease, versión y `SKIP LOCKED` | migración canónica | SQL revisado | Smoke test con dos workers |
| Alertas durables | Outbox con lease, reintento y deduplicación | migración correctiva + scheduler | Tests unitarios/locales | Confirmar entrega real |
| Realtime | Canal privado autenticado; fallback a sondeo informado | `monitoring-realtime.ts` | Tests web | Verificar publicación/RLS real |
| UI Client → Project → Endpoint | Implementada con directorios y sin UUID manual | `sites.tsx` | Typecheck/build local | QA con datos reales |
| URL/SSRF/TLS | HTTPS implícito, DNS/IP/redirects protegidos | service, guard y probes | Tests locales | Prueba controlada en staging |
| Diagnóstico | Endpoint protegido `/api/monitoring/diagnostics` | controller/service | Tests locales | Comparar SHA y heartbeat Render |

## Auditoría de ramas

- Base publicada revisada: `origin/main` en `d5f5e36`.
- Rama histórica revisada: `origin/claude/monitoring` en `524dd34`.
- Diferencia observada al iniciar: 14 commits exclusivos de `main` y 7 de la rama histórica.
- Se recuperaron selectivamente el esquema/tests, motor/API/worker/SSRF, UI, documentación y montaje en Project 360.
- No se reemplazó la migración canónica de `main`: su contenido ya incluía la corrección final de privilegios de la rama histórica.
- Se conservaron las versiones actuales de Security, Settings, Finance, Support, Documents y Client 360; sólo se integraron sus puntos de extensión de Monitoreo.
- Render fue inspeccionado en modo lectura: el API publicado continúa en `d5f5e36`, despliegue exitoso, y sólo están los dos web services existentes. Esta rama y el Background Worker todavía no están desplegados. Las URLs públicas no respondieron dentro de 20–30 s desde el entorno de validación (instancia gratuita dormida o inaccesible), por lo que no se registra un smoke test productivo aprobado.

## Arquitectura de despliegue decidida

El despliegue actual de dos web services usa el worker integrado:

1. API web: `pnpm --filter @zyteron/api start`. `MONITORING_WORKER_ENABLED` puede omitirse o configurarse en `true`.
2. Web Next.js: no ejecuta checks; sólo consume el API.

Si se contrata un Background Worker dedicado, éste usa `pnpm --filter @zyteron/api start:monitoring-worker`, `MONITORING_PROCESS_ROLE=worker` y `MONITORING_WORKER_ENABLED=true`. Recién entonces el web service del API se configura con `MONITORING_PROCESS_ROLE=api` y `MONITORING_WORKER_ENABLED=false`.

Ambos usan el mismo `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. El navegador sólo usa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; la service-role jamás se expone al frontend.

Variables relevantes:

- API y worker: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; `MONITORING_PROCESS_ROLE` sólo identifica el proceso en diagnósticos.
- Scheduler: `MONITORING_WORKER_ENABLED=true` explícito u omitido; opcionalmente `MONITORING_TICK_MS`, `MONITORING_MAX_CONCURRENCY`, `MONITORING_ALLOWED_PORTS`.
- Web: `NEXT_PUBLIC_API_URL=https://<api>.onrender.com/api`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Correo opcional: `RESEND_API_KEY`, `MONITORING_MAIL_FROM`. Un HTTP aceptado por Resend queda `ACCEPTED`, no se presenta falsamente como entregado.

## Orden de despliegue y rollback

1. Aplicar `20261001050000_site_reliability_monitoring.sql` si aún no figura en el historial real.
2. Aplicar `20261004190000_monitoring_recovery.sql`.
3. Desplegar API con scheduler integrado y verificar `/api/health` y `/api/monitoring/diagnostics` con una sesión autorizada.
4. Confirmar heartbeat, SHA, `persistenceMode=supabase`, `scheduler.active=true`, próxima tarea y último check.
5. Crear un monitor controlado, ejecutar `Check now`, comprobar historial, Realtime y un incidente de prueba autorizado.

Rollback seguro: configurar `MONITORING_WORKER_ENABLED=false` en el API y volver el código. Si existe un Background Worker dedicado, detenerlo primero. La migración correctiva es aditiva; no borrar tablas ni evidencia. Las columnas adicionales pueden permanecer hasta una migración de retiro revisada.

## Condiciones que bloquean un “producción verificada”

- Migraciones no confirmadas en el proyecto Supabase real.
- Worker sin heartbeat reciente o con SHA distinto al API esperado.
- `persistenceMode` distinto de `supabase`.
- Canal Realtime sin estado `SUBSCRIBED` (la UI mostrará sondeo/reconexión).
- Alertas de correo sin proveedor o sin destinatario (`PROVIDER_NOT_CONFIGURED` / `NO_ADDRESS`).

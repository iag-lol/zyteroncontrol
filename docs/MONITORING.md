# Módulo 05 · Monitoreo / Site Reliability Center

Supervisa sitios, APIs y endpoints de los proyectos de Operaciones: disponibilidad, latencia, certificados TLS, incidentes, mantenimiento y alertas. No crea proyectos propios: todo monitor pertenece a un `project_endpoints` de un `projects` existente y hereda su cliente.

```
Proyecto → Endpoint → Monitor → Check periódico → Falla → Umbral → Incidente → Notificación
        → Acknowledge → Investigación → Recuperación → Resolución → Uptime / Historial
```

## Componentes

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Migración | `supabase/migrations/20261001050000_site_reliability_monitoring.sql` | Tablas, índices, RPC transaccionales, RLS, Realtime, RBAC, vistas de portal |
| Contratos | `packages/contracts/src/monitoring.ts` (subpath `@zyteron/contracts/monitoring`) | Tipos compartidos API/Web |
| SSRF | `apps/api/src/monitoring/ssrf-guard.ts` | Política de destinos y lookup DNS validado |
| Ejecutor HTTP | `http-checker.ts` | Check real con timeout, redirects, límite de bytes |
| Certificados | `certificate-probe.ts` | Probe TLS y clasificación |
| Motor | `monitoring.engine.ts` | Decisión pura: estado, umbrales, incidente, recuperación |
| Persistencia | `monitoring.supabase-store.ts` / `monitoring.memory-store.ts` | Supabase (producción) o memoria (desarrollo/tests) |
| Worker | `monitoring.scheduler.ts`, `monitoring.runner.ts`, `worker-main.ts` | Scheduler distribuido, housekeeping, SSL |
| Alertas | `monitoring.alerts.ts` | Reglas, destinatarios, escalamiento, deduplicación, canales |
| API | `monitoring.controller.ts`, `monitoring.service.ts`, `monitoring.rbac.ts` | Endpoints, permisos y alcance |
| Web | `apps/web/src/components/monitoring/*`, `apps/web/src/app/monitoring.css` | Command Center, NOC, incidentes, uptime, SSL… |

## Reutilización de Operaciones

- `project_endpoints`: se agrega `client_id` derivado por trigger (también se propaga si el proyecto cambia de cliente). Altas y cambios del endpoint pasan por `OperationsRepository` (`createEndpoint`, `getEndpoint`, `updateEndpoint`).
- `tasks`: "Crear tarea correctiva" crea una tarea real del proyecto; el vínculo queda en `incident_links` (validado por trigger contra el proyecto del incidente).
- `deployments`: el detalle del incidente muestra deployments de las 48 h previas a la primera falla como **contexto**, nunca como causa.
- `operations_events` y `client_events`: un trigger proyecta los hitos relevantes (offline, confirmado, reconocido, recuperado, resuelto, mantenimiento, SSL vencido) a Project Activity y Client Activity.
- Bugs de Desarrollo: `incident_links` con `link_type='BUG'` guarda `target_id` o referencia externa sin FK, para no depender de tablas que aún no existen.

## Modelo de datos

| Tabla | Uso |
|---|---|
| `monitors` | Configuración + estado vivo (status, contadores, lease, `state_version`, SSL actual) |
| `monitor_checks` | Evidencia cruda (bigint identity) |
| `monitor_hourly_rollups`, `monitor_daily_rollups` | Agregados por hora y por día calendario America/Santiago |
| `ssl_observations` | Cada probe TLS (emisor, vigencia, huella, error) |
| `incidents`, `incident_events`, `incident_links` | Ciclo de vida, timeline, vínculos |
| `maintenance_windows` | Ventanas por proyecto o endpoint |
| `monitor_alert_rules`, `alert_delivery_events` | Reglas y ledger de entregas (dedup + bandeja in-app) |
| `monitor_severity_rules`, `monitoring_settings` | Políticas configurables |
| `monitoring_events` | Bitácora/stream (Realtime) |
| `monitoring_worker_heartbeats` | Latido de cada worker |
| `monitoring_status_pages` | Preparada para status page pública (deshabilitada, sin ruta) |

## Scheduler y workers (Render)

- Cada instancia ejecuta un ciclo cada `MONITORING_TICK_MS` (15 s por defecto) y reclama monitores vencidos con `monitoring_claim_due_monitors`: `SELECT … FOR UPDATE OF m SKIP LOCKED` + lease de 120 s. Dos workers nunca ejecutan el mismo check; si un worker muere, el lease vence y otro lo retoma.
- `monitoring_apply_check` valida que el lease siga siendo del worker y que `state_version` no haya cambiado (deshabilitar un monitor invalida checks en vuelo), y en una sola transacción guarda el check, crea/actualiza el incidente, eventos, outbox y estado.
- Tareas periódicas idempotentes: transiciones de mantenimiento (advisory lock), escalamientos (guardas por nivel), auto-resolución, probes SSL (compare-and-set de `ssl_next_check_at`), rollups cada 5 min y purga cada 6 h.
- **Opción económica (por defecto):** el worker corre dentro del web service de la API en Render. Sin servicios adicionales.
- **Arquitectura productiva:** Render Background Worker con `pnpm --filter @zyteron/api start:monitoring-worker`, `MONITORING_PROCESS_ROLE=worker` y `MONITORING_WORKER_ENABLED=true`. El web service usa `MONITORING_PROCESS_ROLE=api` y `MONITORING_WORKER_ENABLED=false`; así un escalado del API no multiplica runners.
- En desarrollo el worker puede ejecutarse con el API salvo que `MONITORING_PROCESS_ROLE=api`. Variables: `MONITORING_WORKER_ENABLED`, `MONITORING_PROCESS_ROLE`, `MONITORING_TICK_MS`, `MONITORING_MAX_CONCURRENCY` (8), `MONITORING_ALLOWED_PORTS` (80,443,8080,8443), `RESEND_API_KEY` + `MONITORING_MAIL_FROM` (email opcional).
- No se usa Azure (Monitor, Functions, Service Bus ni Application Insights) ni `pg_cron`.

## Check HTTP

- `GET` por defecto (`HEAD` opcional; nunca `POST`). User-Agent `ZyteronMonitor/1.0 (+https://www.zyteron.cl)`, sin cookies ni `Authorization`.
- Timeout real con `AbortController` (1–30 s, siempre menor que el intervalo). Redirects manuales (máx. 0–5) con detección de ciclos.
- **Latencia** = tiempo hasta las cabeceras de la respuesta final, incluidos redirects. Sólo respuestas exitosas alimentan estadísticas de latencia.
- Content check opcional: inspecciona como máximo `content_inspect_bytes` (64 KB por defecto) y nunca guarda el cuerpo.
- Intervalos permitidos: 1, 5, 10, 15, 30 y 60 min (check en base de datos). Límite por host: 2 solicitudes concurrentes por worker. CHECK NOW: cooldown de 60 s por monitor y 10 por minuto por usuario.

## Estados del endpoint

| Estado | Regla |
|---|---|
| `UNKNOWN` | Sin checks aún o tras terminar un mantenimiento |
| `ONLINE` | Último check exitoso, sin umbrales de latencia superados |
| `DEGRADED` | Fallas consecutivas por debajo del umbral, recuperación por confirmar o latencia ≥ umbral de advertencia/crítico configurado (sin umbral configurado nunca se marca por latencia) |
| `OFFLINE` | Fallas consecutivas ≥ `failure_threshold` |
| `MAINTENANCE` | Ventana activa |
| `DISABLED` | Monitor deshabilitado |

## Uptime

`uptime = checks exitosos / checks evaluados`, por período.

- Política `monitoring_settings.uptime_maintenance_policy`: `EXCLUDE` (por defecto) quita los checks dentro de mantenimiento del numerador y del denominador; `INCLUDE` los cuenta como cualquier otro. La política vigente se muestra junto a cada cifra.
- Sin checks evaluados el valor es «Sin datos», nunca 100 %.
- Uptime global del Command Center: promedio simple del uptime 24 h de cada monitor con datos (cada endpoint pesa igual).
- 24 h/7 d/30 d por monitor se calculan desde checks crudos; 90 d y vistas de flota desde agregados diarios. Si el monitor es más nuevo que el período se indica «datos desde DD-MM-AAAA».

## Latencia

Actual, promedio y p50/p95 para 1 h, 24 h, 7 d y 30 d (percentil continuo, equivalente a `percentile_cont`). p50 requiere ≥ 5 y p95 ≥ 20 respuestas exitosas; con menos muestras se muestra «—». Umbrales `warning_latency_ms` y `critical_latency_ms` son por monitor.

## Retención y particionamiento

- Crudos: `raw_retention_days` (30, configurable 7–90). Horarios: 90 días. Diarios: 730 días. La purga recalcula los agregados del borde antes de borrar y elimina por lotes de 5.000.
- Volumen estimado: 100 monitores × 1 check/min × 30 días ≈ 4,3 M filas: no requiere particionamiento.
- **Umbral recomendado para particionar** `monitor_checks` por mes (`checked_at`): > 50 M filas, > 20 GB o purgas de más de unos minutos. Con particiones la purga pasa a ser `DROP PARTITION`.

## Mantenimiento

- Estados `PLANNED → ACTIVE → COMPLETED` automáticos por fecha UTC; `CANCELLED` manual. La UI captura DD-MM-AAAA y HH:mm America/Santiago y envía UTC.
- Política por monitor: `CHECK_AND_SUPPRESS` (sigue registrando evidencia marcada `in_maintenance`, sin incidentes ni alertas si la ventana suprime) o `PAUSE_CHECKS`.
- Al terminar la ventana el monitor vuelve a `UNKNOWN` y el siguiente check decide; una falla persistente genera el incidente en ese momento.

## Alertas

- Regla aplicable: la asignada al monitor o la más específica (`MONITOR` > `PROJECT` > `CLIENT` > `GLOBAL`) cuya severidad mínima se cumpla. La regla global sembrada replica el ejemplo: responsable al confirmar, Project Lead a los 5 min, Jefe de Desarrollo a los 15 min, Gerencia inmediata si es crítico. Todo editable en `/monitoring/alert-rules`.
- Destinatarios dinámicos (`ENDPOINT_RESPONSIBLE`, `INCIDENT_ASSIGNEE`, `PROJECT_LEAD`, `DEVELOPMENT_MANAGER`, `GENERAL_MANAGER`, `PROJECT_MEMBERS`); sin emails fijos. Si un rol del proyecto no existe se usa el siguiente responsable o el rol `JEFE_DESARROLLO`.
- Deduplicación: `alert_delivery_events.dedup_key` = etapa + incidente/monitor + destinatario + canal. El escalamiento avanza con guardas (`escalation_level`, sin reconocimiento).
- Canales: `IN_APP` y `REALTIME` siempre funcionan (fila en el ledger publicada por Realtime con RLS por destinatario). `EMAIL` vía Resend sólo con `RESEND_API_KEY` y `MONITORING_MAIL_FROM`; si no, queda `PROVIDER_NOT_CONFIGURED`. `WEB_PUSH` queda registrado como `PROVIDER_NOT_CONFIGURED` (requiere VAPID).
- Sonido: perfil `URGENT` para críticos; sólo suena si el usuario lo activó con un clic (política de autoplay del navegador).

## Realtime

Canal privado `private:monitoring:reliability` sobre `monitors`, `incidents`, `incident_events`, `maintenance_windows`, `monitoring_events` y `alert_delivery_events`, autenticado con la sesión del usuario. Las políticas RLS deciden qué filas recibe cada uno. Sin Supabase configurado la UI declara «Sondeo cada 30 s».

## API

Prefijo `/api/monitoring`:

- Monitores: `GET/POST /monitors`, `GET/PATCH /monitors/:id`, `POST /monitors/:id/enable|disable|check-now`, `GET /monitors/:id/checks` (paginado, filtros `result`, `statusCode`, `from`, `to`), `GET /monitors/:id/stats`.
- Endpoints: `GET /endpoints/:id`.
- Incidentes: `GET /incidents`, `GET /incidents/:id`, `POST /incidents/:id/acknowledge|assign|change-status|resolve|close|comments|visibility|create-task|link-bug`, `PATCH /incidents/:id/postmortem`.
- Mantenimiento: `GET/POST /maintenance`, `PATCH /maintenance/:id`, `POST /maintenance/:id/cancel`.
- Estado: `GET /status`, `/status/projects/:projectId`, `/status/clients/:clientId`, `/uptime`, `/performance`, `/ssl`, `/history`, `/dashboard`.
- Configuración: `GET/POST/PATCH /alert-rules`, `GET /alerts`, `POST /alerts/:id/read`, `GET/PATCH /settings`, `GET /workers`, `GET /me`.
- Exportación: `GET /exports/uptime.csv|incidents.csv|ssl.csv`; agregados mensuales `GET /reports/monthly?month=AAAA-MM&clientId=` (uptime, downtime, incidentes, MTTA, MTTR, latencia, SSL, mantenimiento). XLSX/PDF y Report Builder quedan para el motor global de informes.

## Portal Cliente y status page

- Vistas `monitoring_portal_status`, `monitoring_portal_incidents` y `monitoring_portal_maintenance` (security barrier) entregan sólo columnas seguras del cliente del usuario de portal y con `monitoring_visible` activo: nunca descripción interna, causa raíz, errores ni URLs internas.
- `monitoring_status_pages` reserva slug y preferencias para `status.zyteron.cl/client/…`; no existe ruta pública todavía.

## Verificación

- `pnpm test`: SSRF, ejecutor HTTP contra servidores locales reales, motor de incidentes, SSL, RBAC/IDOR, Realtime y migración.
- Migración probada sobre PostgreSQL real (PGlite) con escenario de RLS y con el motor TS enviando payloads reales a las RPC.
- E2E HTTP con la app Nest real contra `https://www.zyteron.cl` (falla controlada con una ruta QA inexistente del mismo dominio).

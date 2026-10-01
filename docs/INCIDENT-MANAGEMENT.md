# Gestión de incidentes de monitoreo

## Detección y confirmación

Una falla aislada no crea incidente:

```
check fallido → contador de fallas +1 → siguiente check → … → fallas ≥ failure_threshold → INCIDENTE CONFIRMADO
```

- `failure_threshold` (1–10, por defecto 3) y `recovery_threshold` (1–10, por defecto 2) son por monitor.
- El incidente se crea en la misma transacción que el check (`monitoring_apply_check`). `detected_at` es la primera falla de la racha; `confirmed_at`, el check que alcanzó el umbral.
- Un índice único parcial garantiza **un solo incidente activo por monitor**, aunque haya varios workers.
- Se autoasigna al responsable del endpoint. Numeración `INC-AAAA-000001` desde una secuencia (segura ante concurrencia; el año es el de America/Santiago).

## Severidad

Orden de resolución: severidad fijada en el monitor → regla de `monitor_severity_rules` más específica (cliente > prioridad del proyecto > tipo de endpoint > ambiente) → `MEDIUM`. Reglas sembradas y editables: producción con prioridad URGENT/CRITICAL → CRITICAL; producción → HIGH; staging → LOW; desarrollo → INFO.

## Estados

`DETECTED → CONFIRMED → ACKNOWLEDGED → INVESTIGATING ⇄ MITIGATING → MONITORING → RESOLVED / POSTMORTEM_REQUIRED → CLOSED`

| Acción | Permiso | Efecto |
|---|---|---|
| Acknowledge | `incident.acknowledge` | `acknowledged_at`, `acknowledged_by`; detiene el escalamiento |
| Asignar | `incident.assign` (Jefe Desarrollo, Gerencia, Tech Lead, Operaciones) | Reasigna y notifica al nuevo responsable |
| Investigar / Mitigar / Observar | `incident.manage` | Transición validada; si nadie reconoció, cuenta como reconocimiento |
| Resolver | `incident.resolve` | Exige texto de resolución (≥ 10 caracteres) y que el endpoint no siga fallando |
| Cerrar | `incident.resolve` | Desde resuelto; si requiere postmortem, debe estar completo |
| Reabrir | `incident.manage` | Desde `RESOLVED` → `INVESTIGATING` |

Cada cambio se registra en `incident_events` (actor, estados, mensaje) y, cuando corresponde, en `monitoring_events` y `business_event_outbox`.

## Recuperación

- Con `recovery_threshold` éxitos consecutivos se registra `RECOVERY_DETECTED`, `recovered_at` y el downtime.
- Política `monitoring_settings.recovery_policy`:
  - `MONITORING` (por defecto): el incidente pasa a «En observación». Tras `auto_resolve_after_minutes` estables (30 min por defecto; vacío = manual) se resuelve automáticamente con un texto factual, sin causa raíz inventada.
  - `AUTO_RESOLVE`: se resuelve al confirmar la recuperación.
- Si vuelve a fallar durante la observación (umbral completo), el mismo incidente vuelve a `CONFIRMED` (o `INVESTIGATING` si ya fue reconocido): evento `RELAPSED`.

## Reapertura

- Nueva caída confirmada dentro de `reopen_window_minutes` (30 min por defecto) desde la resolución de un incidente `RESOLVED` o `POSTMORTEM_REQUIRED` del mismo monitor → se **reabre** ese incidente (`reopened_count + 1`, nuevo reconocimiento requerido, escalamiento reiniciado).
- Fuera de la ventana, o si el incidente ya está `CLOSED`, se crea un incidente nuevo.

## Downtime, MTTA y MTTR

- **Downtime** = suma de cada caída del incidente, desde su confirmación hasta la recuperación confirmada (`confirmed_at → recovered_at`; en recaídas, desde la nueva confirmación). Se muestra como «7 min», «1 h 42 min».
- **MTTA** (Mean Time To Acknowledge) = promedio de `confirmed_at → acknowledged_at`. Excluye incidentes reabiertos (su reconocimiento corresponde a otra caída) y registros sin datos.
- **MTTR** (Mean Time To Resolve) = promedio de `confirmed_at → resolved_at`. No es downtime: un incidente puede recuperarse en minutos y resolverse después de la investigación.
- El informe mensual muestra los tres por separado con su número de muestras.

## Mantenimiento

Con una ventana activa que suprime alertas, una falla que alcanza el umbral no crea incidente ni alertas: queda el evento `INCIDENT_SUPPRESSED` y los checks se conservan con `in_maintenance = true`. Al terminar la ventana, si la falla persiste, el siguiente check crea el incidente.

## Escalamiento

Definido por regla (`/monitoring/alert-rules`), por ejemplo: 0 min responsable → 5 min Project Lead → 15 min Jefe de Desarrollo; CRITICAL notifica a Gerencia de inmediato con sonido urgente. El worker evalúa cada minuto los incidentes `DETECTED`/`CONFIRMED` sin reconocer y avanza `escalation_level` con guardas; cada etapa se entrega una sola vez por destinatario y canal.

## Investigación

El detalle muestra: banner de severidad, duración en curso, timeline completo, notas internas, ficha (responsable, tiempos), checks alrededor de la caída, deployments de las 48 h previas (contexto, no causalidad), tareas y bugs vinculados, visibilidad para cliente y postmortem.

## Postmortem

Requerido para las severidades de `postmortem_severities` (HIGH y CRITICAL por defecto): causa raíz, impacto, resolución y acciones preventivas (≥ 10 caracteres cada una). El sistema no redacta análisis: sólo registra lo que escribe el equipo.

## Tareas y bugs

- «Crear tarea» crea una tarea real de Operaciones en el proyecto del incidente (prioridad según severidad, responsable del incidente por defecto), idempotente por `Idempotency-Key`, y la vincula en `incident_links`.
- «Vincular bug» guarda una referencia (`BUG-142`, URL o UUID) sin depender del módulo Bugs de Desarrollo.

## Cliente

`client_visibility = CLIENT_VISIBLE` exige un `client_summary` redactado para el cliente y sin IPs. El portal sólo ve número, severidad, estado, resumen y tiempos; nunca descripción interna, notas, errores técnicos ni causa raíz.

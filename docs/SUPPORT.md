# Zyteron Support

El módulo 08 utiliza `support_tickets` como registro único para atención de clientes y solicitudes internas. No crea proyectos, tareas, bugs, incidentes, facturas ni hallazgos paralelos: los vincula mediante `ticket_relations` y delega la creación a los servicios propietarios.

## Flujo operativo

`NEW → TRIAGE → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`. Las esperas de cliente, equipo interno o tercero son estados explícitos. `RESOLVED` exige código y resumen; `CLOSED` representa validación o cierre posterior. Toda reapertura conserva motivo, contador e historial.

La prioridad expresa urgencia de atención y la severidad expresa impacto. La cola inteligente combina SLA vencido, criticidad, prioridad, falta de asignación, reapertura y tiempo sin respuesta.

## Seguridad

- RLS deny-by-default y alcance por rol, cola, asignación, proyecto o cliente.
- `INTERNAL_NOTE` no es seleccionable por Portal Cliente, incluso si modifica la URL o el UUID.
- Solicitudes internas pueden ser `NORMAL`, `CONFIDENTIAL` o `RESTRICTED`.
- Adjuntos: bucket privado, MIME/size allowlist, SHA-256 y URL firmada de cinco minutos.
- Fechas persisten en UTC y se presentan en `America/Santiago`.

## Integraciones

Task, Bug y Change Request se crean a través de Operations/Development. Incident, Audit Finding y Finance se vinculan por referencia hasta que sus módulos propietarios expongan servicios estables. Los eventos externos salen por `business_event_outbox`.

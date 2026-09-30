# ADR-002 — Renovaciones materializadas

## Decisión

Las renovaciones se representan mediante `client_renewals` y conservan una referencia a su origen (`source_type`, `source_id`). No son una copia completa del contrato o servicio.

## Motivo

Una renovación tiene workflow propio, responsable, contacto, negociación, alertas e idempotencia. Una proyección puramente derivada desde fechas de contratos o servicios no puede conservar ese historial operacional.

## Integridad

- La combinación origen/fecha es única para evitar duplicados.
- El cierre se ejecuta en una función PostgreSQL transaccional.
- Los cambios contractuales y de servicio siguen viviendo en sus tablas de origen.
- La conversión comercial se comunica mediante el outbox existente; no se crea un CRM paralelo.

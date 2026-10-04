# Support SLA

El backend es la única fuente de objetivos y vencimientos. La UI solo presenta `first_response_due_at`, `resolution_due_at` y el snapshot calculado.

La política se resuelve en este orden: servicio → cliente → global. Cada política referencia un calendario `24x7`, `BUSINESS_HOURS` o `CUSTOM`, con zona horaria, días laborables, horario y feriados configurables.

- First Response Time: creación hasta la primera `PUBLIC_REPLY` real de un agente. Notas internas, eventos y acuses automáticos no cuentan.
- Resolution Time: creación hasta `RESOLVED`, descontando pausas configuradas.
- SLA Compliance: objetivos completados antes de su vencimiento.
- Reopen Rate: proporción de tickets que regresaron a gestión.

`WAITING_CLIENT` pausa por defecto la política global. Cada inicio, pausa, reanudación, advertencia, breach y cumplimiento queda en `sla_events`. Los porcentajes de warning/escalamiento son datos de `sla_targets`, no constantes de frontend.

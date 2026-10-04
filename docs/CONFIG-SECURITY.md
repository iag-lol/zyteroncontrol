# Configuration Security

El Control Plane aplica deny-by-default en API y RLS. Lectura y mutación requieren rol y permiso explícitos; cambios críticos, integraciones, webhooks, rollbacks, jobs y habilitaciones requieren AAL2.

No pueden desactivarse desde Settings las invariantes de RLS, aislamiento tenant, Vault o almacenamiento seguro. Los secretos plaintext se rechazan por validación; logs, auditoría y respuestas usan valores sanitizados.

Los cambios sujetos a aprobación separan solicitante y aprobador. El historial y la auditoría son append-only. Toda excepción debe tener motivo, responsable, vigencia y evidencia revisable.

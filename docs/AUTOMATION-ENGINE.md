# Automation Engine

Las reglas siguen `WHEN / IF / THEN`: evento de catálogo, condiciones con operadores permitidos y acciones seguras. Se crean deshabilitadas y en dry-run. La prueba registra coincidencia y acciones que se ejecutarían, sin side effects.

Las versiones son inmutables. La habilitación exige AAL2 y auditoría. `correlationId`, `causationId` y `maxDepth` previenen bucles; los retries quedan acotados y los fallos pueden llegar a dead-letter. Nuevas acciones deben añadirse al catálogo permitido y ejecutarse mediante workers/outbox, nunca directamente dentro de la transacción del evento.

# Configuration Change Management

Flujo normal: proponer valor tipado, validar esquema y ownership, exigir AAL2 cuando corresponda, registrar motivo, aplicar nueva versión, escribir historial/auditoría y publicar outbox.

Los cambios con `approvalRequired` quedan en `REVIEW`. El solicitante no puede autoaprobar; un segundo actor autorizado aprueba y la aplicación crea una versión nueva. El rollback tampoco reescribe historia: recupera un valor anterior como una nueva versión auditada.

Antes de producción se revisan dependencias, estado de integraciones, automatizaciones, webhooks, jobs y Security Gate. Después del cambio se verifica diagnóstico y se conserva evidencia. Ante degradación se usa rollback, kill switch o deshabilitación según la capacidad afectada.

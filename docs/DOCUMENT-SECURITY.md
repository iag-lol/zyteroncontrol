# Seguridad documental

La seguridad combina RBAC, ACL por recurso y RLS deny-by-default. `private.document_can_read` y `private.document_can_write` validan rol, propietario, grants explícitos, clasificación y alcance de Portal Cliente.

## Upload

El backend valida archivo no vacío, límite por tipo, extensión/MIME permitido, MIME detectado por magic bytes y hash SHA-256. El metadata enviado por el navegador no se considera evidencia suficiente. Coincidencias de hash generan una advertencia; nunca fusionan ni eliminan documentos automáticamente.

`FileSecurityScanner` es un puerto. Sin adapter configurado, el estado es `NOT_CONFIGURED`; el sistema jamás afirma que el archivo está limpio. Resultados sospechosos, infectados o fallidos se aíslan en cuarentena y no se convierten en versión actual.

## Descarga

`GET /documents/:id/download` vuelve a comprobar autenticación, acceso, clasificación, versión y cuarentena. Devuelve una URL firmada de cinco minutos y registra el acceso. Los enlaces externos almacenan solamente el hash del token, tienen vencimiento, límite de usos y revocación.

No se guardan secretos en el timeline, outbox ni payloads de auditoría. El service role se usa únicamente en backend.

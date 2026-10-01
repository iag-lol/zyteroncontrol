# Versionado documental

Cada carga crea una fila nueva en `document_versions`. `create_document_version` bloquea el documento con `FOR UPDATE`, calcula el siguiente número dentro de la transacción y evita carreras.

Una versión conserva filename, Storage path, MIME declarado/detectado, tamaño, SHA-256, estado malware, autor, fecha y resumen de cambio. El archivo anterior no se sobrescribe.

Crear una versión nueva cancela revisiones pendientes de la versión anterior y devuelve el documento a `DRAFT`. Una versión `LOCKED` o con `signed_at` no permite mutar archivo, hash, número o identidad. Las firmas congelan el SHA-256 exacto enviado al proveedor.

`current_version_id` y `current_version_number` son punteros de lectura; el historial sigue siendo la fuente de verdad.

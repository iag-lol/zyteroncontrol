# Document Control Center

Módulo 09 es el servicio documental central de Zyteron Control. Clientes, Comercial, Contratos, Operaciones, Desarrollo, Auditorías, Soporte y Finanzas vinculan expedientes mediante `document_links`; no crean copias funcionales del mismo archivo.

## Modelo

- `documents`: identidad, tipo, clasificación, estado, responsable, visibilidad, vencimiento y retención.
- `document_versions`: binarios inmutables, MIME declarado/detectado, tamaño, SHA-256 y resultado del scanner.
- `document_links`: vínculo flexible con CLIENT, PROJECT, CONTRACT, QUOTE, WORK_ORDER, FINANCE, AUDIT, SUPPORT y futuros dominios.
- `document_reviews` y `document_approvals`: decisiones formales sobre una versión específica.
- `signature_*`: solicitudes, firmantes y eventos del proveedor.
- `document_events`, `document_access_events` y outbox: trazabilidad y propagación empresarial.

El bucket `enterprise-documents` es privado. Las rutas físicas no representan la taxonomía visible; el árbol del explorador es una proyección lógica.

## API principal

`GET/POST /documents`, `GET/PATCH /documents/:id`, `POST /documents/:id/versions`, `GET /documents/:id/download`, `POST /documents/:id/reviews`, `POST /documents/:id/signatures`, endpoints de share, templates, archivo, restauración, papelera e integridad.

## Estados

`DRAFT → IN_REVIEW → APPROVED → READY_FOR_SIGNATURE → SIGNING → SIGNED → PUBLISHED`. También existen `CHANGES_REQUESTED`, `REJECTED`, `SUPERSEDED`, `ARCHIVED` y `TRASHED`.

No se incluyen documentos ficticios. En desarrollo sin Supabase se usa memoria volátil y solamente se inicializa el catálogo de tipos.

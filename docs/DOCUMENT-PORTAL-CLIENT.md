# Documentos en Portal Cliente

Portal Cliente consulta `GET /client/documents`. Un documento es visible solo si se cumplen simultáneamente:

- existe un `document_link` CLIENT hacia el cliente de la identidad autenticada;
- `client_visible = true`;
- clasificación `PUBLIC` o `CLIENT`;
- el documento no está archivado ni en papelera.

RLS reproduce estas condiciones mediante `private.document_portal_client_id`. Un contacto de otro cliente no puede listar, abrir ni descargar el expediente. Comentarios, permisos y actividad interna no se exponen.

Compartir y dejar de compartir son acciones auditadas. Cambiar clasificación a una más sensible invalida la visibilidad cliente por constraint y política del servicio.

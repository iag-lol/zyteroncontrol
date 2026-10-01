# Support Portal Cliente

El futuro `clientes.zyteron.cl/support` consumirá `/api/client/support/*`. No mantiene una copia de tickets.

La identidad autenticada se resuelve mediante `client_portal_users → client_contact → client_id`. El backend ignora cualquier `client_id` enviado en el cuerpo y RLS vuelve a validar el tenant.

El cliente puede crear, listar, consultar, responder, adjuntar, reabrir, aceptar resolución y evaluar. Solo observa tickets con `CLIENT_VISIBLE`, mensajes `PUBLIC_REPLY`/`SYSTEM_EVENT` y adjuntos `CLIENT_VISIBLE`. `INTERNAL_NOTE` es imposible de seleccionar mediante la política de base de datos.

Una solución aceptada pasa de `RESOLVED` a `CLOSED`. La encuesta CSAT admite una respuesta por ticket cerrado.

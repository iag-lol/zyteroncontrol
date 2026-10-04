# Support Email

`SupportChannelProvider` define el puerto de salida. Los adapters previstos son Microsoft Graph y un proveedor genérico; no se usa contraseña IMAP hardcodeada.

La entrada utiliza `Message-ID`, `In-Reply-To`, `References` y el identificador de thread del proveedor. `support_email_threads` garantiza idempotencia y evita un ticket nuevo por respuesta. Un remitente desconocido se mantiene sin cliente verificado y entra a triage.

Una respuesta pública se registra primero en `ticket_messages`. Después genera un evento/outbox para entrega. Si el proveedor falla, el mensaje persiste como `DELIVERY_FAILED` y puede reintentarse; nunca se pierde la conversación.

Portal y correo comparten el mismo thread lógico. WhatsApp permanece solo como canal futuro; no existe integración simulada.

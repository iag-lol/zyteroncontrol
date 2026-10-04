# Outgoing Webhooks

Solo se permiten destinos HTTPS. Las suscripciones declaran eventos, retry acotado y una referencia de secreto; nunca guardan el secreto HMAC en texto plano.

Cada entrega usa `deliveryId`, timestamp y outbox transaccional. El endpoint de prueba encola `ZYTERON_WEBHOOK_TEST`; no realiza una llamada dentro de la transacción HTTP. Los workers deben firmar el payload, deduplicar por delivery ID y registrar solo código, duración y error sanitizado.

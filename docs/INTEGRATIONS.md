# Integration Hub

El catálogo incluye capacidades externas y su estado real: `NOT_CONFIGURED`, `CONFIGURED`, `CONNECTED`, `DEGRADED`, `ERROR` o `DISABLED`. Configurar no significa conectar; una integración solo puede habilitarse después de una prueba exitosa.

Las credenciales no se almacenan en Settings. Solo se acepta `secretReference` de Security Vault y metadata no sensible. La interfaz y la auditoría enmascaran la referencia. Los adapters deben devolver estados sanitizados, latencia y error seguro, sin tokens ni respuestas completas del proveedor.

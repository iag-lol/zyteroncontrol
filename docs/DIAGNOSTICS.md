# System Diagnostics

Diagnostics ejecuta checks explícitos de API, Supabase, Realtime y Storage. Reporta estado, latencia y mensaje seguro; no expone URLs privadas, headers, tokens, variables completas ni payloads del proveedor.

`HEALTHY` solo se usa con evidencia positiva. La ausencia de configuración se informa como `NOT_CONFIGURED`, y un fallo como `ERROR`. Los resultados se conservan para tendencia y auditoría, pero no reemplazan Monitoring ni Security.

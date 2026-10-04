# Identity and Access Management

Supabase Auth es la fuente primaria. `auth.users`, perfiles, empleados y usuarios cliente permanecen separados. Las contraseñas no se copian a tablas de Zyteron.

Tipos: `INTERNAL_USER`, `CLIENT_USER`, `SERVICE_IDENTITY`. Los roles autorizadores viven en `app_metadata`; `user_metadata` solo puede contener atributos no confiables de presentación.

Altas, cambios y bajas deben originarse en workflows aprobados. Offboarding debe bloquear login, revocar sesiones/dispositivos/grants y retirar accesos externos. Break-glass requiere cuenta separada, MFA fuerte, custodia y evento crítico por uso; no se crea automáticamente.

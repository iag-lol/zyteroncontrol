# Enterprise Configuration Control Plane

`/settings` gobierna configuración tipada y versionada sin reemplazar las fuentes canónicas de cada dominio. People mantiene organización; Security mantiene RBAC y postura; Documents mantiene plantillas; Support mantiene SLA. El backend expone una vista compuesta y conserva trazabilidad de cambios.

Cada entrada define `namespace`, `key`, tipo, entorno, clasificación, esquema, propietario, vigencia y versión. La ausencia de una entrada usa un default seguro; nunca habilita acceso por omisión. Los cambios registran actor, rol, motivo, antes/después sanitizado y evento outbox.

Los namespaces críticos y las clasificaciones `RESTRICTED` o `CRITICAL` requieren AAL2. RR.HH. solo administra `hr`, `organization` y `calendar`; Finanzas solo `finance`; Gerencia y Security Admin administran globalmente.

Despliegue: aplicar `supabase/migrations/20261004060000_enterprise_control_plane.sql`, validar permisos y ejecutar typecheck, tests, lint y build.

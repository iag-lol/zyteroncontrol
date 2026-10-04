# Security Architecture

Clasificación: RESTRICTED. Este documento describe controles, no secretos.

Zyteron aplica verificación en cadena: Supabase Auth valida identidad; `RoleGuard` acepta roles solo desde `app_metadata`; `AuthorizationService` valida permisos explícitos, sesión y dispositivo; `RequireAal2` exige step-up en operaciones críticas; PostgreSQL RLS restringe acceso directo; `security_audit_events` conserva evidencia append-only.

El backend es la frontera confiable. El frontend nunca decide autorización. La Service Role solo existe en la API y no se entrega a usuarios humanos. Los eventos, incidentes y auditorías son dominios separados.

Dependencias externas no configuradas se reportan como `NOT_CONFIGURED`. Vault almacena metadata y `encrypted_reference`; un proveedor criptográfico real debe implementar `VaultSecretProvider` para revelar secretos.

Flujos críticos:

- Recurso normal: identidad → rol → permiso → scope/RLS → dato → auditoría.
- Recurso crítico: AAL2 → solicitud JIT → aprobación segregada → grant temporal → acceso → expiración.
- Incidente: evento → triage → incidente → contención → recuperación → postmortem.
- Release: tests → scans → Security Gate → deploy o bloqueo.

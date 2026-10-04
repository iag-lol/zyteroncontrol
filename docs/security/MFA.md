# MFA and Step-up

Supabase Auth administra TOTP y AAL. La interfaz permite enrolar un factor y verificarlo sin almacenar la semilla en Zyteron.

Las rutas críticas usan `RequireAal2`: roles, lock, sesiones, dispositivos, Vault, grants y Security Gate. La lista de roles privilegiados vive en `security_settings.privileged_roles`.

Recuperación MFA requiere verificación de identidad, workflow de seguridad, motivo, aprobador para cuentas críticas y auditoría. Email OTP no sustituye MFA fuerte.

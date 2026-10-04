# Security Testing

Cobertura mínima: Auth, MFA/AAL, RBAC, ABAC, RLS, cross-tenant, IDOR, Vault, sesiones, dispositivos, uploads, webhooks, exports, privacidad y límites de Security Admin.

Tests ofensivos se ejecutan solo en staging/controlado, con secretos sintéticos. Scanner automático no equivale a pentest. Fallos Critical producen salida no cero y bloquean el Gate.

# OWASP ASVS 5.0 Matrix

Objetivo: Level 2. `VERIFIED` exige una prueba ejecutable o evidencia externa.

| Área | Control Zyteron | Evidencia | Prueba | Estado |
|---|---|---|---|---|
| Authentication | Supabase Auth; rol solo `app_metadata` | `role.guard.ts` | `security.test.ts` | VERIFIED |
| MFA | Supabase TOTP y claim AAL2 | Security MFA Center | Operación AAL1 denegada | IMPLEMENTED |
| Session | Session metadata + revoke deny list | `AuthorizationService.observe` | revoke session test | VERIFIED |
| Authorization | RBAC permissions + AAL decorators | `role_permissions` | unit/integration tests | IMPLEMENTED |
| Data access | RLS Security deny-by-default | migration Security | migration/RLS matrix | IMPLEMENTED |
| Secrets | Referencia cifrada, sin plaintext | Vault provider port | Vault tests | VERIFIED |
| Logging | Safe metadata + audit append-only | migration/triggers | security tests | IMPLEMENTED |
| Files | Documents scanner port/private storage | Documents module | document tests | PARTIAL |
| API | CORS allowlist, headers, request ID | `main.ts` | static audit | VERIFIED |
| Secure delivery | audit/lint/types/tests/build gate | package scripts | `pnpm security:ci` | IMPLEMENTED |
| Backup | Evidence + recovery tests | Backup Center | restore drill | NOT_IMPLEMENTED |
| DAST/Pentest | Importable scans/findings | Security Testing | external report | NOT_IMPLEMENTED |

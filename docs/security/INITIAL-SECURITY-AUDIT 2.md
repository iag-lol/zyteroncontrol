# Initial Security Audit

Clasificación: RESTRICTED. Evidencia redactada; no contiene valores de credenciales.

| Finding | Severidad | Módulo | Evidencia | Recomendación | Estado |
|---|---|---|---|---|---|
| Rol obtenido como fallback desde `user_metadata` | CRITICAL | Auth | Guard anterior permitía metadata modificable por usuario | Usar solo `app_metadata` | REMEDIATED |
| Modo desarrollo podía confiar en headers en producción | CRITICAL | API | `AUTH_MODE=development` no verificaba entorno | Abort production startup | REMEDIATED |
| Permisos y AAL no eran una fuente común | HIGH | Auth | Solo existía allowlist por rol | Motor central con permisos y AAL | REMEDIATED |
| Sesiones/dispositivos no eran revocables desde la aplicación | HIGH | Auth | No existía deny list observada | Metadata, estados y rechazo en guard | REMEDIATED |
| Headers de seguridad incompletos | HIGH | Web/API | Sin CSP/HSTS homogéneo | Headers explícitos | REMEDIATED |
| Rate limiting distribuido/edge | HIGH | Platform | API aplica límites por proceso; falta coordinación multi-instancia/WAF | Configurar edge antes de escalar producción | OPEN P1 |
| SAST/SCA/secret scanner externos | HIGH | CI/CD | Proveedores no configurados | Integrar herramientas mantenidas | OPEN P1 |
| Backup y restore real | CRITICAL para Gate | Recovery | Sin evidencia del proveedor ni restore PASS | Conectar proveedor y ejecutar drill | OPEN P1 |
| Validación legal de privacidad y alcance regulatorio | HIGH | Privacy | Requiere DPO/asesoría | Revisión especialista documentada | OPEN P1 |
| Pentest independiente | HIGH | Portal readiness | No realizado | Ejecutar en staging antes de Portal completo | OPEN P1 |

El comando `pnpm security:audit` vuelve a inspeccionar archivos versionados y genera reportes JSON/Markdown sin revelar coincidencias sensibles.

# Secure SDLC

La ruta reproducible es `pnpm security:ci`: auditoría estática, lint, typecheck, tests y build. SAST, SCA y secret scanning externos deben registrar ejecuciones en `security_scans`.

Una vulnerabilidad Critical, secreto expuesto, RLS crítica faltante, test de autorización fallido o Service Role pública bloquea producción. DAST se ejecuta solo en staging controlado. Dependencias usan lockfile.

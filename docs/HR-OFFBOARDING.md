# Offboarding

La salida controla documentación, revocación de accesos, transferencia operativa, Finance, devolución de activos y cierre documental. `EMPLOYEE_OFFBOARDING_STARTED`, `ACCESS_REVOCATION_REQUIRED` y `ASSET_RETURN_REQUIRED` se publican mediante outbox.

No se puede finalizar mientras existan tareas críticas o activos sin devolver. Al completar, la relación activa termina y el colaborador pasa a `TERMINATED`; el historial nunca se elimina.

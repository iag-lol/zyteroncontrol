# Retención, legal hold y purga

Las políticas definen días de retención y gracia en papelera. La migración incluye perfiles generales, contractuales y de evidencia; pueden administrarse sin cambiar el binario.

`ARCHIVED` retira el documento de la operación normal sin eliminarlo. `TRASHED` fija `trashed_at` y `purge_after`, con restauración disponible. La purga requiere rol autorizado, estado TRASHED y plazo vencido.

`legal_hold = true` bloquea archivo, papelera y purga, incluso si la política ya venció. La eliminación física futura debe ejecutarse mediante un job controlado que registre identificación, autoridad, regla aplicada y resultado, nunca mediante cascade automático.

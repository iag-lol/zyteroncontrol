# Vault

`vault_items` guarda nombre, clasificación, ownership, ambiente, fechas y `encrypted_reference`. No existe columna de valor secreto.

Reveal requiere permiso, scope, AAL2, motivo y grant JIT activo. Cada resultado se registra sin el secreto. Sin un proveedor real, la respuesta es `NOT_CONFIGURED`/503.

La KEK/master key nunca pertenece al frontend, Git, base de datos, logs ni notificaciones. Rotación real ocurre en el proveedor; Zyteron registra metadata y evidencia.

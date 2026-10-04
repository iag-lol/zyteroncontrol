# RBAC and ABAC

RBAC reutiliza `app_permissions` y `role_permissions`. `AuthorizationService` falla cerrado cuando no puede demostrar un permiso requerido. Gerencia no posee un bypass invisible: recibe grants explícitos.

ABAC agrega usuario, sesión, AAL, dispositivo, cliente, proyecto, ownership, clasificación y grant temporal. El ID enviado por el navegador nunca define scope por sí solo.

Cambios privilegiados exigen AAL2, motivo y segundo aprobador cuando el rol está clasificado como privilegiado.

# Firma electrónica

`EnterpriseSignatureProvider` desacopla el dominio del proveedor. El adapter por defecto es `NOT_CONFIGURED`: la API devuelve conflicto y la interfaz deshabilita/explica la acción. No se generan firmas, certificados ni estados ficticios.

Una solicitud exige documento aprobado, versión actual y firmantes reales. El sistema bloquea la versión y persiste provider, ID externo, hash congelado, firmantes, orden y evidencia.

Los webhooks requieren validación criptográfica del adapter y `eventId` idempotente. Un evento `COMPLETED` cambia documento a `SIGNED` y fija `signed_at`, sin modificar el binario original. La evidencia entregada por el proveedor se conserva como JSON controlado.

Para producción debe implementarse un adapter real, configurar credenciales en secretos de Render/Supabase y registrar el callback HTTPS del proveedor.

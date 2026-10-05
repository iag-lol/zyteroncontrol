# Firma electrónica

`EnterpriseSignatureProvider` desacopla Documentos, Contratos y RR.HH. del proveedor. La implementación productiva es `ExternalElectronicSignatureProvider`: no fabrica firmas ni estados y permanece `NOT_CONFIGURED` hasta que existan todos los secretos requeridos.

## Configuración privada

Estas variables se configuran **sólo en el servicio API**:

- `PUBLIC_API_URL`: URL pública con prefijo `/api`, por ejemplo `https://zyteroncontrol-api.onrender.com/api`.
- `ELECTRONIC_SIGNATURE_PROVIDER_NAME`: código estable del proveedor, por ejemplo `ECERT`.
- `ELECTRONIC_SIGNATURE_PROVIDER_URL`: URL HTTPS de la API o gateway contratado.
- `ELECTRONIC_SIGNATURE_API_KEY`: credencial de servidor.
- `ELECTRONIC_SIGNATURE_WEBHOOK_SECRET`: secreto HMAC distinto de la API key.

Nunca se reciben llaves o secretos desde el frontend, no se guardan en Supabase y no se suben a Git.

## Contrato del adaptador HTTP

El proveedor elegido (o un gateway delgado que adapte su API) debe exponer:

| Método | Ruta | Contrato |
|---|---|---|
| `POST` | `/signature-requests` | Recibe `externalId`, documento (`downloadUrl` temporal, nombre, MIME, versión y SHA-256), firmantes ordenados y `callbackUrl`. Devuelve `{ id, status }`. |
| `GET` | `/signature-requests/:id` | Devuelve `{ status, evidence }`. |
| `POST` | `/signature-requests/:id/cancel` | Cancela una solicitud pendiente. |

Estados aceptados: `DRAFT`, `SENT`, `IN_PROGRESS`, `COMPLETED`, `DECLINED`, `CANCELLED`, `EXPIRED` y `FAILED`. El adaptador normaliza alias comunes, pero rechaza estados desconocidos.

## Webhooks e integridad

El callback registrado es `POST /api/webhooks/signature/<PROVIDER_NAME>`. El proveedor envía:

- cuerpo JSON con `eventId`, `requestId` y `type`;
- header `X-Signature: sha256=<hex>` (o `X-Webhook-Signature`);
- HMAC-SHA256 calculado sobre los bytes exactos del cuerpo usando `ELECTRONIC_SIGNATURE_WEBHOOK_SECRET`.

La API valida la firma con comparación constante, deduplica por `provider + eventId`, consulta el estado real al proveedor y reconcilia el expediente. `COMPLETED` marca documento y versión como firmados; rechazo, vencimiento, cancelación o error desbloquean la versión y devuelven el documento a aprobado.

## Flujo de negocio

Una solicitud exige documento aprobado, versión actual y al menos un firmante real. Se validan nombre, correo, orden y duplicados. El proveedor recibe un enlace privado de descarga de 15 minutos y el hash congelado. La versión queda bloqueada durante la firma y la evidencia segura del proveedor se conserva sin tokens, secretos ni llaves.

El mismo motor es consumido por contratos de clientes, contratos laborales, anexos y documentos generales. La validez y el nivel de firma (simple/avanzada) dependen del proveedor, producto contratado, verificación de identidad y formalidades aplicables al documento; el sistema no los presume.

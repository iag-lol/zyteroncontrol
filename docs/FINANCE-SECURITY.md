# Seguridad del Módulo 07 · Finanzas

## Defensa en capas

1. **Base de datos**: RLS habilitado en todas las tablas financieras (deny by default). Las políticas son sólo de lectura por rol (`private.can_view_accounting`, `private.can_view_billing`, `private.portal_finance_client`); toda escritura pasa por la API con service role. Los procedimientos `finance_*` sólo los ejecuta `service_role`.
2. **Invariantes en triggers**: partida doble, inmutabilidad de asientos/facturas emitidas/pagos confirmados/aplicaciones/folios/DTE resueltos/snapshots, auditoría append-only, prohibición de borrado físico.
3. **API**: `@RequireRoles` (sólo roles con algún permiso financiero) y luego verificación del permiso exacto y del alcance por cliente en cada servicio. Segregación de funciones en aprobaciones (factura, gasto, pago a proveedor, F29 listo).
4. **Web**: el menú y las acciones se filtran por permiso, pero la autorización real está en la API y la base.

## Datos sensibles

| Dato | Tratamiento |
|---|---|
| Tarjetas (PAN/CVV) | Nunca pasan por Zyteron: Payment Brick de Mercado Pago tokeniza en el navegador. |
| `MERCADOPAGO_ACCESS_TOKEN`, secreto de webhook | Sólo backend. El frontend recibe únicamente la Public Key. |
| Certificado digital y llave privada | Secreto del servidor; la base guarda metadatos y huella. Nunca en frontend, Git ni logs. |
| CAF (incluye `RSASK`) | Cifrado AES-256-GCM en bucket privado `finance-secrets`. |
| Cuentas bancarias de proveedores | Últimos 4 dígitos en claro; número completo sólo cifrado (requiere `FINANCE_ENCRYPTION_KEY`) y su lectura queda auditada. |
| Cuentas bancarias propias | Sólo últimos 4 dígitos; sin credenciales bancarias. |
| Links de pago | Token aleatorio de 256 bits; se guarda sólo SHA-256; expiración y revocación; alcance de una factura. |
| Evidencias (comprobantes, XML, cartolas) | Bucket privado `finance-documents`, con SHA-256. |

## Entradas no confiables

- XML (DTE recibidos, evidencias, CAF): parser propio que **rechaza DOCTYPE/ENTITY** (XXE / expansión de entidades), con límites de tamaño y profundidad.
- XLSX: lectura de ZIP con límite de descompresión (50 MB) contra zip bombs.
- CSV exportado: celdas que empiezan con `= + - @` se neutralizan (CSV injection).
- Webhook de Mercado Pago: firma HMAC-SHA256 obligatoria, ventana de tiempo de 15 minutos, idempotencia por `(provider, event_key)`, y el estado se vuelve a consultar en la API oficial (no se confía en el cuerpo del webhook ni en el navegador).
- Proveedor DTE externo: sólo HTTPS.

## Auditoría

`finance_audit_events` (append-only) registra creación, edición, aprobación, emisión, contabilización, reversas, conciliaciones, clasificaciones tributarias, cambios de configuración (con valores anteriores y nuevos), exportaciones de informes y lecturas de datos bancarios completos. Es visible para Gerencia y Finanzas.

## Calendario de pagos de cotizaciones

- Tablas `quote_payment_plans` y `quote_payment_installments` con RLS deny-by-default: sólo políticas `SELECT` (Gerencia, Finanzas, Contador, Jefatura de Ventas, Comercial; Ejecutiva sólo cotizaciones propias vía `private.can_view_quote_payments`, `security definer` con `search_path` fijo). Escrituras exclusivamente por la API (service role).
- Triggers: sin `DELETE`; cuota pagada inmutable; cuota/plan anulados no se reactivan; `PAID` sólo con la opción de pago habilitada (`QUOTE_PAYMENT_NOT_OPEN`), fecha de pago no futura y factura SII adjunta (CHECK: folio, tipo, ruta y SHA-256 del archivo, responsable).
- `quote_payment_materialize` y `quote_payment_reschedule` revocadas para `public/anon/authenticated`; sólo `service_role`.
- Bucket `quote-invoices` privado (10 MB, PDF/XML). El tipo real se verifica por contenido (`%PDF-` o XML parseado sin DTD/entidades); el XML debe corresponder al tipo, folio, receptor y emisor declarados. Descarga interna sólo vía API autenticada con auditoría; el portal lee únicamente objetos de su cliente, de cuotas pagadas y visibles (`quote_invoices_portal_read`).
- Portal: `PORTAL_CLIENT` resuelve su cliente desde `client_portal_users` activo + `client_portal_settings.invoices_visible` (no se confía en cabeceras); la vista `portal_quote_payments` es `security_barrier` y oculta folio y ruta salvo en cuotas pagadas y visibles.
- Auditoría: `QUOTE_PAYMENT_PLAN_CREATED/UPDATED/PAUSE/RESUME/CANCEL`, `QUOTE_INSTALLMENT_PAID/CANCELLED`, `QUOTE_INVOICE_PUBLISHED/HIDDEN` en `finance_audit_events`; `finance_events` alimenta Client 360 y el outbox.

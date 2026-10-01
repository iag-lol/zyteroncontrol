# Emisión electrónica (DTE) y certificación ante el SII

Este documento describe cómo Zyteron Control emite Documentos Tributarios Electrónicos (DTE) y qué debe completar Zyteron SpA para operar en producción. Zyteron **no simula** respuestas del SII, **no automatiza el navegador de sii.cl**, **no usa la Clave Tributaria** y **no presenta como emitido** un documento que el SII no aceptó.

## 1. Modelo

| Concepto | Dónde vive | Regla |
|---|---|---|
| Borrador de factura (`invoices`) | Documento interno | No es un DTE. Puede editarse hasta que se emite. |
| Documento tributario (`tax_documents`) | Uno vigente por factura | Estados `DRAFT → VALIDATED → SIGNED → SUBMITTED → RECEIVED_BY_SII → ACCEPTED / ACCEPTED_WITH_REPAIRS / REJECTED`. |
| Folios (`tax_folios`) | Desde CAF autorizados | `AVAILABLE → RESERVED → USED / VOIDED`. Un folio usado o anulado **nunca** vuelve a estar disponible. Reserva concurrente con `FOR UPDATE SKIP LOCKED`. |
| Eventos (`tax_document_events`) | Bitácora inmutable | Cada transición, Track ID, código y glosa del SII. |

La factura pasa a `ISSUED` sólo cuando el SII responde `ACCEPTED` o `ACCEPTED_WITH_REPAIRS`. Un `REJECTED` devuelve la factura a «Lista para emitir», deja el folio como usado y genera la notificación `DTE_REJECTED`. Los DTE aceptados no se anulan: se corrigen con nota de crédito (61, código 1 anula, 2 corrige texto, 3 corrige montos) o nota de débito (56) referenciadas al original.

## 2. Proveedores (`TaxDocumentProvider`)

Interfaz común: `createDraft`, `validate`, `sign`, `send`, `issue`, `issueCreditNote`, `issueDebitNote`, `getSubmissionStatus`, `getDocumentStatus`, `downloadXml`, `downloadPdf`, `cancelOrCorrect`, `syncReceivedDocuments`.

### 2.1 `SiiDirectDteProvider` (integración directa con servicios oficiales)

1. Construye el `Documento` DTE v1.0 (Encabezado, Detalle ≤ 60 líneas, Referencia, Totales) con montos enteros en CLP.
2. Genera el **TED** (`DD` + `FRMT`) firmando con SHA1withRSA usando la llave `RSASK` del CAF del folio reservado.
3. Firma el `Documento` con **XMLDSig RSA-SHA1** (C14N inclusivo) usando el certificado digital del servidor. La firma se calcula con los namespaces que tendrá dentro de `EnvioDTE` (`xmlns` SII y `xmlns:xsi`) para que no se invalide al ensobrar.
4. Ensobra en `EnvioDTE` (Carátula con `RutReceptor` 60803000-K), firma el `SetDTE` y valida contra el **XSD oficial** con `xmllint` (`DTE_XSD_DIR`). Si el XSD no está disponible, la emisión directa queda bloqueada.
5. Autentica con el flujo oficial semilla → semilla firmada → token (`CrSeed.jws`, `GetTokenFromSeed.jws`).
6. Sube el envío a `cgi_dte/UPL/DTEUpload` y registra el **Track ID**.
7. Consulta el estado con `QueryEstUp.jws` (manual desde la ficha o automático vía scheduler).

Ambientes: certificación `maullin.sii.cl`, producción `palena.sii.cl`.

### 2.2 `ExternalCertifiedDteProvider` (proveedor certificado)

Adaptador HTTP genérico para un emisor electrónico certificado. Requiere `DTE_PROVIDER_URL` (HTTPS) y `DTE_PROVIDER_API_KEY`. Contrato esperado del proveedor:

| Método | Ruta | Respuesta |
|---|---|---|
| `POST` | `/documents` | `{ id, folio, status, trackId, message, xmlBase64?, pdfBase64? }` |
| `GET` | `/documents/:id` | `{ status, code, message, folio }` |
| `GET` | `/documents/:id/xml` · `/pdf` | `{ xmlBase64 }` · `{ pdfBase64 }` |
| `GET` | `/received?since=` | `{ items: [{ xmlBase64 }] }` |

Si el proveedor elegido usa otro contrato, se adapta en `finance.dte-providers.ts` sin tocar el resto del módulo.

### 2.3 Emisión externa registrada

Para DTE emitidos fuera de Zyteron (portal del SII u otro sistema): «Registrar emisión externa» exige folio, fecha y evidencia. Si la evidencia es el XML del DTE, se verifican RUT emisor, RUT receptor, tipo, folio, fecha y total contra la factura. El documento queda `SUBMITTED` con la glosa «aceptación del SII no verificada por Zyteron» hasta registrar la evidencia de aceptación.

## 3. Requisitos que habilitan «Emitir DTE»

El botón está deshabilitado y muestra la lista exacta de faltantes (`GET /finance/invoices/:id/readiness`):

- Proveedor DTE configurado.
- Datos del emisor: RUT, razón social, giro, código Acteco, dirección y comuna.
- Resolución SII (número y fecha; en certificación: número 0 y fecha de postulación).
- Producción: autorización del SII declarada por Gerencia con evidencia.
- Tipo de documento habilitado (y certificado, en producción).
- SII directo: certificado vigente en el secreto del servidor, metadatos registrados, XSD oficial y folios CAF disponibles.
- Receptor con RUT válido, razón social, giro, dirección y comuna.
- Factura aprobada (`READY_TO_ISSUE`). Notas: documento referenciado con folio.

## 4. Certificado digital

- El PEM (llave privada + certificado) se entrega al servidor como **secreto** (variable de entorno cuyo nombre se registra como `secret_ref`, por defecto `DTE_CERTIFICATE_PEM`; frase opcional en `<secret_ref>_PASSPHRASE`). Para convertir un `.pfx`: `openssl pkcs12 -in cert.pfx -nodes -out cert.pem`.
- La llave **nunca** llega al frontend, a la base de datos, a Git ni a los logs. La API sólo guarda metadatos (sujeto, emisor, serie, vigencia, huella SHA-256).
- Alertas de vencimiento a 60, 30, 15, 7, 3 y 1 días (una por umbral) y bloqueo al vencer.

## 5. CAF (folios)

- Se descarga desde sii.cl y se carga en Configuración contable (`POST /finance/dte/caf`).
- Se valida RUT, tipo, rango y llave; el XML completo se guarda **cifrado** (AES-256-GCM con `FINANCE_ENCRYPTION_KEY`) en el bucket privado `finance-secrets`.
- Los folios se materializan como filas y se reservan de a uno. Un intento abandonado antes de enviar deja el folio `VOIDED` (debe informarse la anulación de folios en el SII).

## 6. Proceso de certificación ante el SII

Checklist para Zyteron SpA (ambiente de certificación, `dte_environment = CERTIFICATION`):

1. **Postulación** como emisor electrónico en sii.cl con el certificado digital del representante.
2. **Set de pruebas**: descargar el set asignado, emitir cada caso desde Zyteron (factura 33, exenta 34, nota de crédito 61, nota de débito 56) y enviarlo. Verificar `ACCEPTED` en cada Track ID.
3. **Simulación**: emitir documentos representativos de la operación real.
4. **Intercambio de información**: recibir, validar y responder (acuse de recibo / recepción de mercaderías) los envíos de prueba del SII. La bandeja de DTE recibidos importa y valida los XML; las respuestas formales de intercambio se generan con el mecanismo oficial del SII.
5. **Muestras de impresión**: generar las representaciones impresas con timbre PDF417. Zyteron sólo entrega PDF cuando existe folio y timbre real (desde el proveedor o un renderizador con PDF417 validado); nunca un PDF sin timbre.
6. **Declaración de cumplimiento** firmada en sii.cl.
7. **Autorización**: con la resolución, Gerencia registra la evidencia («Declarar autorización de producción»), se cargan los CAF de producción y se cambia el ambiente a `PRODUCTION`.

Cada tipo de documento se marca «Certificado» con la evidencia (resolución/fecha). Tipos 39, 41, 46 y 52 están catalogados pero deshabilitados hasta certificarlos.

## 7. Documentos recibidos y RCV

- **Bandeja de compras**: importación de XML (`DTE` o `EnvioDTE`) con parser seguro (rechaza `DOCTYPE`/`ENTITY`), validación de totales, receptor y TED, y detección de duplicados por emisor + tipo + folio. La firma de documentos recibidos queda `NOT_VERIFIED` hasta implementarse la verificación XMLDSig de terceros.
- **Crédito fiscal**: nunca se presume recuperable; contabilidad clasifica explícitamente (del giro, activo fijo, uso común con monto proporcional, supermercado, bienes raíces, no recuperable, no corresponde) con fundamento.
- **RCV**: se importa el CSV oficial descargado desde sii.cl y se concilia (`MATCHED`, `MISSING_LOCAL`, `MISSING_SII`, `AMOUNT_MISMATCH`, `STATUS_MISMATCH`). No hay scraping ni automatización del portal.

## 8. Pendientes conocidos antes de producción

- Validar la firma XMLDSig y el TED con el set de pruebas real del SII (el cálculo está cubierto por tests criptográficos locales, no por una respuesta del SII).
- Representación impresa con timbre PDF417 si se usa la integración directa.
- Respuestas de intercambio (RecepcionDTE / ResultadoDTE / EnvioRecibos) y registro de aceptación/reclamo vía servicio oficial.
- Verificación de firma de DTE recibidos.

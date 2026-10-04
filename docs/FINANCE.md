# Módulo 07 · Financial & Accounting Control Center

Finanzas y contabilidad de Zyteron SpA con partida doble real, facturación electrónica preparada para el SII, cobros, cuentas por pagar, bancos, impuestos, cierre e informes. Stack: Next.js 16 · NestJS · Supabase (Postgres, Auth, Storage privado, Realtime, RLS). Sin Azure.

## Principios no negociables

- **TOTAL DEBE = TOTAL HABER o no se contabiliza.** La API valida y la base vuelve a validar en el trigger `finance_journal_entries_guard` (mínimo dos líneas, Debe XOR Haber por línea, cuentas imputables y activas, período abierto, fecha dentro del período).
- Asientos contabilizados **inmutables**: se corrigen con reversa (una sola por asiento) y un asiento nuevo. Sólo los borradores se descartan.
- Numeración `AST-AAAA-NNNNNN`, `INV-`, `PAG-`, `GTO-`, `PPV-` con secuencias de la base (seguras ante concurrencia).
- Las reglas automáticas crean **borradores en revisión**; contabilizar es siempre una acción humana con `journal.post`. El copiloto no contabiliza, emite, presenta, elimina ni paga.
- Nada se inventa: sin regla activa, un hecho económico queda `UNMAPPED`; sin datos, las métricas declaran «datos insuficientes».
- Nunca borrado físico de documentos emitidos, pagos, aplicaciones, folios, movimientos bancarios, conciliaciones, snapshots ni auditoría.
- Fechas contables `date` (AAAA-MM-DD) y timestamps UTC; la UI muestra DD-MM-AAAA y HH:mm 24 h en America/Santiago.

## Arquitectura

| Capa | Ubicación |
|---|---|
| Migración | `supabase/migrations/20261001150000_financial_accounting_center.sql` |
| Contratos | `packages/contracts/src/finance.ts` (incluye la matriz RBAC compartida) |
| API | `apps/api/src/finance/` |
| Web | `apps/web/src/components/finance/`, `apps/web/src/app/finance/`, `apps/web/src/app/payments/[token]` |
| Pruebas SQL | `supabase/tests/finance/` (PGlite con todas las migraciones) |

Archivos de la API: `finance.repository.ts` (repositorio dual memoria/Supabase con los invariantes de la base replicados), `finance.sources.ts` (lee Clientes, Servicios, Contratos, Ventas, Comisiones, Proyectos y Worklogs sin duplicarlos), `finance.ledger.ts` (libro, períodos, motor de reglas, estados), `finance.billing.ts`, `finance.dte*.ts`, `finance.payments.ts`, `finance.payables.ts`, `finance.banking.ts`, `finance.close.ts`, `finance.reports.ts`, `finance.settings.ts`, `finance.controller.ts`.

## Flujos

- **Ventas → Facturación**: una venta ganada aparece en «Pendiente de facturar»; el borrador se precarga con la cotización aceptada. Nunca se factura automáticamente.
- **Servicios/contratos → programaciones**: servicios recurrentes activos se sugieren; las programaciones generan borradores idempotentes por período.
- **Factura**: `DRAFT → PENDING_APPROVAL → READY_TO_ISSUE → ISSUING → ISSUED → PARTIALLY_PAID / PAID / CREDITED`. Aprobación configurable (umbral) con segregación (quien crea no aprueba). IVA desde `tax_rule_versions` vigente a la fecha de emisión. Ver `docs/SII-DTE-CERTIFICATION.md`.
- **Cobros**: un pago manual nace `PENDING_VERIFICATION` con comprobante o movimiento de cartola; sólo verificado se aplica y contabiliza. Aplicaciones muchos-a-muchos, parciales, sobrepago como saldo a favor, reversas con motivo, devoluciones sobre saldo no aplicado (las manuales se completan con comprobante).
- **Mercado Pago**: Payment Brick embebido en `/payments/:token`; `ACCESS_TOKEN` sólo en backend; el monto lo fija el servidor; el estado se lee desde la API oficial y el webhook `/api/webhooks/payments/mercadopago` valida `x-signature` (HMAC de `id;request-id;ts`) y es idempotente. Comisión y neto separados; liquidaciones conciliadas por fecha de liberación.
- **Links de pago**: token aleatorio de 256 bits, sólo se guarda su SHA-256, expira (1–30 días), alcance de una factura, revocable; la vista pública no expone IDs internos.
- **Pagos de cotizaciones** (`/finance/quote-payments` y botón «Pagos» en cada cotización aceptada de Comercial): una cotización `ACCEPTED`/`CONVERTED` con cliente puede tener un calendario de **pago único** o **mensual** (N cuotas o indefinido; el indefinido se genera hasta 2 meses adelante y el scheduler extiende el horizonte). Cada cuota vence el día de pago del mes (ajustado al último día si el mes es más corto) y la opción **«Registrar pago» se habilita `activation_days_before` días antes** (por defecto 5) y sigue activa —como «Vencida»— hasta marcarse pagada. Marcar pagada **exige adjuntar la factura del SII** (PDF o XML; el XML se valida contra tipo, folio, receptor = cliente y emisor = empresa), que se guarda en el bucket privado `quote-invoices` bajo `clients/{cliente}/quotes/{cotización}/…`; un folio SII respalda una sola cuota. La cuota pagada es inmutable; con pagos registrados el plan sólo cambia monto pendiente, plazo y anticipación. Nada se elimina: cuotas y planes se anulan con motivo. Notificaciones `QUOTE_PAYMENT_OPEN` y `QUOTE_PAYMENT_OVERDUE` (Finanzas y la ejecutiva dueña). El portal cliente (futuro) lee `GET /api/portal/quote-payments` o la vista `portal_quote_payments` y sólo descarga facturas de cuotas pagadas y marcadas visibles. Registrar el pago no emite DTE, no consulta al SII y no genera asientos automáticos.
- **Cuentas por pagar**: gasto con respaldo → aprobación por políticas configurables por monto/categoría/centro/nivel → cuenta por pagar → solicitud de pago → aprobación (segregación) → registro de la transferencia con comprobante o cargo de cartola. Zyteron no transfiere dinero.
- **Bancos**: cartolas CSV/XLSX con vista previa, mapeo, validación y hash determinístico anti-duplicados; conciliación con sugerencias explicadas (monto, fecha, referencia, nombre), MATCH/SPLIT/MERGE/IGNORE/CREATE y deshacer con motivo. La auto-conciliación está apagada por defecto y nunca toma casos ambiguos.
- **Cierre**: checklist configurable con controles automáticos (DTE pendientes, compras sin clasificar, bancos, IVA revisado, gastos, borradores, hechos sin asiento) y manuales con evidencia; snapshot inmutable con SHA-256; reapertura sólo con permiso y motivo (bloqueado: sólo Gerencia).
- **Impuestos**: IVA etiquetado «Estimación interna»; preparación F29 con líneas trazables (`PREPARATION → REVIEWED → READY → FILED_EXTERNALLY → ACCEPTED`), presentación sólo con evidencia de sii.cl; obligaciones sin fechas legales supuestas.
- **Comisiones**: Comercial calcula; Finanzas determina elegibilidad por políticas (pagada, % cobrado, fin de período), aprueba y registra el pago con comprobante y asiento.
- **Informes**: Estado de Resultados, Balance General (Activo = Pasivo + Patrimonio), Comprobación, Libro Diario, Libro Mayor, Flujo de Caja (REAL vs PROYECCIÓN con escenarios Base/Conservador/Optimista), aging CxC/CxP, Ventas, Compras, IVA, rentabilidad por cliente/proyecto y presupuesto vs real. Exportación CSV/XLSX/PDF auditada; un período cerrado se reproduce desde su snapshot.
- **Contador Zyteron**: consultas determinísticas con período, montos exactos, fuentes, drill-down y hora de actualización; cada consulta queda en `finance_analysis_runs`; las propuestas de asiento sólo se convierten en borrador con `journal.create`.
- **Integraciones**: Client 360 (pestaña Finanzas real), Project 360 (rentabilidad; márgenes sólo para roles contables), `finance_events` → `client_events` y `business_event_outbox` en la misma transacción, notificaciones `INVOICE_DRAFT_CREATED`, `INVOICE_APPROVAL_REQUIRED`, `DTE_ACCEPTED`, `DTE_REJECTED`, `INVOICE_DUE_SOON`, `INVOICE_OVERDUE`, `PAYMENT_RECEIVED`, `PAYMENT_FAILED`, `PAYMENT_REFUNDED`, `AP_DUE`, `EXPENSE_APPROVAL_REQUIRED`, `BANK_RECONCILIATION_REQUIRED`, `ACCOUNTING_PERIOD_READY_TO_CLOSE`, `TAX_REVIEW_REQUIRED`.

## Roles y permisos

| Rol | Alcance |
|---|---|
| Gerencia General, Finanzas | Todos los permisos del módulo |
| Contador | Contabilidad, impuestos, bancos, DTE, informes y exportación; lectura de facturación, cobros, CxP y gastos |
| Jefatura de Ventas, Comercial | Facturación (ver/crear borrador), cuentas por cobrar, cobranza, ver pagos. Nunca el libro |
| Ejecutiva de Ventas | Facturación y cobranza **sólo de sus clientes** (en Client 360) |
| Pagos de cotizaciones | Gerencia, Finanzas, Jefatura de Ventas y Comercial: ver, configurar y marcar pagadas · Ejecutiva: ver y configurar **sólo sus cotizaciones** (no marca pagos) · Contador: lectura |
| Desarrollo y resto | Sin acceso |
| Portal Cliente (futuro) | Vistas `finance_portal_invoices` / `finance_portal_payments` / `portal_quote_payments` con sus propios documentos |

La matriz vive en `@zyteron/contracts` (`financeRoleMatrix`) y es espejo exacto de `role_permissions` de la migración (verificado por test).

## Configuración del servidor

| Variable | Uso |
|---|---|
| `FINANCE_ENCRYPTION_KEY` | 32 bytes (base64 o hex) para cifrar cuentas bancarias de proveedores y CAF |
| `DTE_CERTIFICATE_SECRET_REF` / `DTE_CERTIFICATE_PEM` | Certificado digital (sólo servidor) |
| `DTE_XSD_DIR`, `DTE_SENDER_RUT` | Esquemas oficiales y RUT de quien envía |
| `DTE_PROVIDER_URL`, `DTE_PROVIDER_API_KEY` | Proveedor certificado externo |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`, `PUBLIC_API_URL` | Pagos en línea |
| `CLIENT_PORTAL_URL` | Base de los links de pago (por defecto `https://clientes.zyteron.cl`) |
| `RESEND_API_KEY`, `FINANCE_MAIL_FROM` | Recordatorios de cobranza |
| `FINANCE_SCHEDULER_INTERVAL_MINUTES` | Ejecución periódica (≥ 5) de `POST /api/finance/scheduler/run-due` |

## Verificación

```bash
pnpm --filter @zyteron/contracts build
pnpm --filter @zyteron/api test        # incluye src/finance/finance.test.ts
pnpm --filter @zyteron/web test
pnpm lint && pnpm typecheck && pnpm build
cd supabase/tests/finance && npm install && npm run scenario   # 45 controles SQL sobre PostgreSQL (PGlite)
# E2E de API (55 controles): levantar apps/api con AUTH_MODE=development y PORT=4517, luego
API=http://localhost:4517/api npm run e2e
npm run scenario:quotes               # 29 controles SQL del calendario de pagos de cotizaciones
# E2E de pagos de cotizaciones (26 controles): la API debe poder «enviar» la cotización para aceptarla; en local se usa un stub de correo SÓLO de pruebas:
#   RESEND_API_KEY=test-stub SALES_MAIL_FROM=ventas@zyteron.test node --import ./supabase/tests/finance/test-mail-stub.mjs apps/api/dist/main.js
API=http://localhost:4517/api npm run e2e:quotes
# En Supabase, tras aplicar la migración: supabase/tests/security/verify_quote_payments.sql (lectura + prueba revertida)
```

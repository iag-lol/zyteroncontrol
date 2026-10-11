# Flow: estado verificable

Código y experiencia implementados/probados localmente; conexión Sandbox y despliegue pendientes. No declararlo operativo ni cobrar en producción por haber aprobado tests simulados.

## Criterios y flujo

1. Finanzas conserva factura/schedule/contrato/cliente/moneda/importe. Una orden Flow es un intento; nunca una venta. Reserva e idempotencia en PostgreSQL antes de pedir checkout. Si create pierde respuesta, retener CREATE_UNKNOWN y conciliar; no repetir a ciegas.
2. Checkout oficial Flow en **la misma pestaña**. Flow documenta redirect alojado; no iframe suportado. El origen cambia durante Flow/banco. No almacenar ni recibir PAN/CVV ni instalar una captura de tarjeta propia.
3. Callback de token = aviso. Inbox persistente, comprobación firmada API, coincidencia con comercio/entorno/referencia/importe/moneda. Sólo estado 2 y paymentData consistente acreditan pago. Browser query/status/return, ACTIVE de suscripción o un invoice pagado manualmente no bastan.
4. Pago, aplicación canónica y jobs de contabilidad/comprobante se crean atómicamente. Eventos contables por allocation ID son idempotentes. Respuesta rechazada/cancelada/pending no crea abono ni comprobante. Se conserva el bruto; comisión decimal por separado. Si factura ya fue pagada, el excedente verificado queda como crédito sin aplicar.
5. PDF privado sólo para payment CONFIRMED. Ejemplo público contiene marca SANDBOX/DEMO. Es comprobante, **no DTE/boleta tributaria**. Resend usa idempotency-key y destinatario financiero revalidado. ACCEPTED no significa entregado; envío UNKNOWN >23h necesita conciliación manual para evitar duplicados.
6. Plan mensual finite CLP: oferta por Finanzas, contrato vigente, próxima fecha futura y fin explícito, versión/hash de términos y consentimiento. Por ahora fechas 1–28; días 29–31, acuerdos vencidos/indefinidos o cambio de programación requieren revisión antes de activar. Native subscription_start y periods_number limitan cargos al acuerdo. No convertir un pago aislado en mandato.
7. Consulta/alta/cancelación financiera exige membership/contact billing ACTIVE, portal enabled, auth.sessions vigente y grant OTP/MFA server-side reciente. El workflow Auth que genera dichos grants aún está pendiente; no rellenar manualmente para “habilitar” clientes.
8. Cliente pide cancelación; un job avisa internamente a Finanzas y verifica Flow. Con cobertura desconocida se solicita cancelación inmediata al proveedor pero efectos técnicos quedan en revisión. Con cobertura verificada se conserva el período ya pagado. Se corta generación futura del schedule una vez verificada la cancelación; deuda existente se conserva.
9. Mantención sólo con Flow CANCELLED, paidThrough agotado, binding resource/service/client/policy y ACK específico de Next.js firmado HMAC. No suspender el servicio Render entero: sirve de control por sitio. Coverage tardía antes de ACK invalida generation; pago nuevo tras suspensión efectiva requiere conciliación/reapertura manual.
10. Calendario demo proyecta meses/años hasta fin del contrato. Confirmados/pending/proyección se distinguen. El calendario conectado necesita el BFF de sesión real y Finance schedules/cycles; no publicar fixtures como cuotas reales.

## Configuración preparada, sin secretos

Backend aislado: `apps/api/.env.flow.example` dentro del worktree Control. Portal: `apps/portal/.env.example`. Sitios: `docs/flow/site-template/.env.example` y `proxy.ts` para Next 16 (en Next 15 adaptar middleware y runtime según versión).

`FLOW_SITE_REGISTRY` empieza vacío y worker apagado. Cada sitio requiere clave HEX independiente y recurso aprobado. No usar la service_role key en una web cliente. El template requiere origen HTTPS fijo y devuelve 503 si Control no puede verificarse; dimensionar disponibilidad/redundancia antes de habilitarlo. Una caída de comunicación no registra cancelación/suspensión financiera.

No apuntar Sandbox a la DB financiera productiva. Aplicar la migración sólo en staging separado, auditar grants/RLS reales y fijar `finance_flow_deployment` con entorno/fingerprint del apiKey; no contiene clave ni secreto. Habilitar worker sólo después de validar URLs, email, permisos y schema. Las claves van a env privado/Render, nunca a Git, chats, browser bundle ni archivos de evidencia.

## Validación y límites

API 382 tests (11 Flow nuevos), SQL PGlite 15, Playwright 10, tipos/lint/build pertinentes, PDF renderizado. SQL fixture importa definiciones canónicas de payments, guard y allocator; no emula todo Supabase/PostgREST/Auth/Storage. Fetch de proveedor en unit tests es simulado. Ninguna prueba acredita todavía un pago con Sandbox real ni efectos sobre una web alojada.

Piloto pendiente: Sandbox approve/reject/cancel/pending + callbacks duplicados y desordenados + pérdida de respuesta; acceso A/B, OTP/MFA expiración/revocación; importe/moneda/commerce/env alterados; cron caída/lease/retry; correo fallo/conciliación/destinatario; cuota próxima/fin de contrato; cancelación dentro/fuera cobertura; ACK incorrecto, tardío, network failure y sitio de otro cliente.

## Fuentes primarias revisadas

- [Flow API](https://developers.flow.cl/api): payment/create, getStatusExtended, getStatusByFlowOrderExtended, plans/customer/subscription/invoice y firma.
- [Integración Flow](https://developers.flow.cl/docs/tutorial-basics/integration-flow): urlConfirmation y retorno, checkout alojado.
- [Resend API](https://resend.com/docs/api-reference/emails/send-email), [idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Entorno y cuentas

Render/Git: **basededatos.server@gmail.com**, todavía pendiente confirmar la sesión activa. Render visible se identificó como Isaac; no se cambió estado remoto. Supabase: **Eduardo Avila · zyteron.spa@gmail.com**, identidad confirmada; ADMINZYTERONCONTROL referencia hyvregmkdawcbeuhhaqc observado como sistema existente, sin migración aplicada.

Despliegue, DB de staging y aceptación del piloto deben ser revisables antes de habilitar usuarios. No existe garantía de “cero errores”; los límites y pruebas pendientes quedan expresos.


## Actualización de conexión (11-10-2026)

Marca de interfaz/comprobante/email: Zyteron, sin promoción del proveedor. URLs internas `/api/flow` y nombres técnicos permanecen para compatibilidad. No hay soporte documentado de checkout alojado sin la identidad externa de la pasarela.

El backend tiene prefijo global **/api**. Configurar `ZYTERON_API_URL=https://API-STAGING.example/api`, confirmación `https://API-STAGING.example/api/webhooks/payments/flow`, retorno `https://PORTAL-STAGING.example/api/flow/return` y registro `.../api/flow/registration-return`. Template de sitio usa `/api/site-mode/:resource` y `/ack`.

Prueba real de autenticación Sandbox (sin crear cobros): claves visibles en integración de la cuenta eduardo.avila@zyteron.cl rechazadas por `/api/plans/list`, HTTP401/code501. No se usaron en producción ni se persistieron como configuración válida. Se requiere login Sandbox del usuario. `scripts/flow/http-smoke.mjs` verifica montaje HTTP y fallos cerrados del módulo compilado.

Render Google basado en basededatos.server@gmail.com ya verificado, workspace tea-csp9vv3gbbvc73e6q2v0. GitHub con ese Google conduce a signup, no al repo iag-lol. Dirección del usuario pendiente para destino del código; sin push ni despliegue. Conectores Render/Supabase siguen en Fenice y no deben mutar Zyteron.

# Zyteron: activación de pruebas

## Estado

La rama `feature/zyteron-payments-staging` reúne API, migración y portal bajo `apps/portal`. Se integró `origin/main` (81f139a), conservando la corrección de reintentos de comprobantes. No habilita pagos ni modifica servicios productivos por sí sola.

`render.payments-staging.yaml` define dos servicios Starter de una instancia, sin despliegue automático. El proceso API incluye el worker financiero; no requiere un tercer servicio para la primera prueba. El worker empieza apagado. Las claves se introducen como variables privadas, nunca en este archivo.

## Entornos y cuentas

- Render: basededatos.server@gmail.com, workspace tea-csp9vv3gbbvc73e6q2v0.
- Git: iag-lol/zyteroncontrol, autorizado expresamente por el usuario.
- Supabase: zyteron.spa@gmail.com, organización actual cssnoptmxkydetgomqyb.
- Acceso de pruebas: https://dashboard.sandbox.flow.cl/. El enlace legado `/app/web/misDatos.php` redirigió a producción y no debe utilizarse para obtener credenciales Sandbox.

La verificación firmada y de solo lectura del 11-10-2026 identificó las primeras claves como productivas: producción HTTP200, Sandbox HTTP401/code501. Se borró el archivo temporal de credenciales. No se creó ningún cobro. La cuenta Sandbox nueva está en su onboarding.

## Base aislada y costo antes de crear recursos

Los dos proyectos gratuitos actuales de Supabase están ocupados; el dashboard bloquea un tercero. No aplicar la migración Sandbox en ADMINZYTERONCONTROL. Opción preparada: organización separada de pruebas en Pro con un proyecto Micro, manteniendo los dos proyectos actuales sin cambios.

Estimación base: Supabase Pro con un Micro cubierto por el crédito, USD25/mes; dos servicios Render Starter, USD14/mes; total USD39/mes, más impuestos y consumos adicionales. No se contrató ni cobró nada. Verificar el importe mostrado en el checkout antes de contratar. Fuentes: https://supabase.com/docs/guides/platform/billing-faq y https://render.com/pricing.

## Secuencia de activación

1. Completar alta Sandbox y validar claves mediante `plans/list`; debe responder HTTP200 en Sandbox. No intentar crear pagos como prueba de autenticación.
2. Obtener autorización de costo o una alternativa de staging aislada antes de crear recursos. No pausar ni borrar proyectos existentes para liberar cupo sin instrucción específica.
3. Crear base vacía de pruebas, aplicar las migraciones revisadas y auditar RLS/grants. No copiar contactos, facturas, credenciales ni datos financieros productivos para el piloto.
4. Configurar URLs HTTPS exactas del portal y API, el fingerprint de cuenta/entorno en `finance_flow_deployment`, almacenamiento privado y variables del blueprint. El BFF usa la base API con `/api`.
5. Crear sólo datos sintéticos identificados como pruebas. Configurar emisor de correo verificado y allowlist Sandbox. Un servicio de correo que acepta un envío no prueba que se entregó.
6. Habilitar worker y pagos de prueba cuando el schema y parámetros sean consistentes. Ejecutar aprobado/rechazado/pendiente/cancelado, retorno falsificado y callbacks repetidos. Sólo pago confirmado por API puede acreditar y generar comprobante.
7. Implementar/verificar el flujo Auth de sesión/grant reciente antes de activar alta/cancelación de suscripciones. No poblar manualmente grants para saltarlo. Verificar ciclo mensual, fin de contrato y cancelación al agotarse cobertura con ACK del sitio concreto.
8. Documentar evidencia del piloto. Un build o una prueba unitaria no acredita una transacción externa. La activación productiva requiere revisión posterior del piloto y credenciales productivas separadas.

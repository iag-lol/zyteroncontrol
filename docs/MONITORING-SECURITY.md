# Monitoreo · Seguridad

El monitor hace solicitudes salientes a URLs configurables. Sin controles sería un vector SSRF y un escáner abierto. Esta es la defensa implementada.

## Política de destinos (`ssrf-guard.ts`)

1. **Protocolos:** sólo `http:` y `https:`. Se rechazan `file:`, `ftp:`, `gopher:`, `data:`, `javascript:` y cualquier otro.
2. **Credenciales en la URL:** prohibidas (`user:pass@host`).
3. **Puertos:** 80, 443, 8080 y 8443 (`MONITORING_ALLOWED_PORTS` puede cambiarlos). Evita usar el monitor como escáner de puertos.
4. **Hostnames internos:** `localhost`, `*.localhost`, `*.local`, `*.internal`, `*.lan`, `*.svc`, `*.cluster.local`, `metadata.google.internal`, `instance-data`, `host.docker.internal` y nombres de una sola etiqueta.
5. **Rangos bloqueados (IPv4):** 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16 (metadata), 172.16/12, 192.0.0/24, 192.0.2/24, 192.88.99/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4, 255.255.255.255.
6. **Rangos bloqueados (IPv6):** `::`, `::1`, 100::/64, 2001::/23, 2001:db8::/32, 2002::/16, fc00::/7, fe80::/10, fec0::/10, ff00::/8. Las IPv4 embebidas (mapeadas `::ffff:`, NAT64 `64:ff9b::`) se evalúan con las reglas IPv4.
7. **Formatos alternativos:** el parser WHATWG normaliza `2130706433`, `0x7f000001` y similares antes de evaluar; quedan bloqueados.

## DNS rebinding

- El lookup que usa el socket (`createSafeLookup`) resuelve, valida **todas** las respuestas (si cualquiera es privada se rechaza) y entrega al socket exactamente la IP validada. No hay ventana entre validar y conectar.
- Se usa `agent: false`, por lo que cada solicitud y cada redirect vuelven a resolver y validar.
- Al registrar un monitor (`assertMonitorTarget`) se exige además que el dominio resuelva y sea público.

## Redirecciones

Se siguen manualmente; cada `Location` vuelve a pasar por la política de URL y por el lookup validado. Máximo configurable de 0 a 5 y detección de ciclos.

## Recursos

- Timeout global real con `AbortController` (máx. 30 s) que cubre conexión, TLS, redirects y lectura.
- Sin content check, el socket se destruye al recibir cabeceras: nunca se descarga el cuerpo. Con content check se leen como máximo 64 KB (configurable hasta 256 KB).
- Cabeceras de respuesta limitadas a 16 KB.
- Concurrencia por host (2 por worker), concurrencia global por worker (8) e intervalos mínimos de 1 minuto.
- CHECK NOW: permiso, alcance de proyecto, cooldown por monitor (60 s), 10 por minuto por usuario y la misma política SSRF del worker.

## Datos y registros

- No se envían cookies, `Authorization` ni credenciales. Monitores autenticados quedan fuera de alcance hasta contar con Vault (sin contraseñas en texto plano).
- No se guarda el cuerpo de la respuesta ni cabeceras. Los mensajes de error son textos propios en español, sin IPs, trazas ni cabeceras; máximo 300 caracteres.
- El probe TLS lee el certificado con `rejectUnauthorized=false` sólo para clasificarlo; no envía datos de aplicación. El check HTTP siempre valida la cadena.
- Resúmenes para cliente (`client_summary`) rechazan direcciones IP; las notas de incidente son siempre internas.

## Autorización

- **RBAC:** permisos `monitoring.dashboard.view`, `monitoring.summary.view`, `monitor.view|create|edit|disable`, `endpoint.view|manage`, `incident.view|acknowledge|assign|manage|resolve`, `ssl.view`, `maintenance.view|create|manage`, `alert_rule.view|manage`, `monitoring.export`, `monitoring.settings.manage` (sembrados en `app_permissions`/`role_permissions` y espejados en `monitoring.rbac.ts`).
- **Alcances:** Gerente `ALL`; Jefe de Desarrollo y Operaciones `DEPARTMENT` (toda la operación de delivery); Tech Lead `PROJECT`; Programador, Desarrollo y Soporte `ASSIGNED`; Ventas `OWN` (sólo resumen sanitizado de Client 360). Portal cliente: sólo vistas de portal.
- **Anti-IDOR:** cada endpoint de la API resuelve el recurso y valida el proyecto contra el alcance del actor; no depende del sidebar. Un rol con alcance limitado y sin `userId` no ve nada (deny by default).
- **RLS:** deny by default. Usuarios autenticados sólo tienen `SELECT` con `private.can_view_monitoring_project(project_id)`; las escrituras ocurren únicamente vía API con `service_role`. Las RPC del motor están revocadas para `anon` y `authenticated`. Alertas: sólo el destinatario (usuario o rol con alcance del proyecto).

## Consentimiento

Sólo se monitorean endpoints registrados en proyectos de Zyteron o autorizados por el cliente. No existe una funcionalidad de escaneo libre: cada URL queda asociada a un proyecto, responsable y auditoría (`MONITOR_CREATED`).

## Pruebas

`ssrf.test.ts` cubre localhost, 127.0.0.1, ::1, 10.x, 172.16.x, 192.168.x, 169.254.169.254, formatos decimal/hex, IPv4 mapeada, `file://` y otros protocolos, credenciales, puertos, DNS que resuelve a privada, respuestas mixtas, rebinding entre conexiones y redirects hacia IP privada, metadata, DNS interno, `localhost` y `file://` contra un servidor HTTP real.

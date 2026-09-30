# ADR-001: primer vertical de Zyteron Control

## Estado

Aceptado para el arranque.

## Contexto

El grafo de requisitos conecta de forma explícita CRM, Lead, Oportunidad, Cotización, Orden de Trabajo y Proyecto. También exige Next.js, NestJS, PostgreSQL, RBAC/ABAC y una postura de seguridad deny-by-default.

## Decisión

Iniciar con un monorepo TypeScript y un vertical navegable del flujo comercial. La interfaz consume una API que aplica roles en servidor. El almacenamiento inicial en memoria permite validar el recorrido; PostgreSQL queda preparado y se conectará antes de incorporar datos reales.

## Límites de esta iteración

- Supabase Auth es el proveedor de identidad seleccionado; la integración de sesión productiva aún requiere las credenciales del proyecto.
- No se procesan datos reales ni secretos.
- El modo de rol por cabecera existe únicamente para desarrollo.
- PDF de cotización, Blob Storage, portal cliente, SignalR y Bicep quedan fuera de este primer corte.

## Próximos hitos

1. Persistencia PostgreSQL, migraciones y auditoría de cambios.
2. Supabase Auth y mapeo de claims a RBAC/ABAC.
3. Mutaciones desde la interfaz y validación de transiciones.
4. Generación de cotización PDF y almacenamiento privado.
5. Infraestructura Bicep separada para development, staging y production.

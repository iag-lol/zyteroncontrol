# Copias históricas, excluidas de migraciones

Estos cuatro archivos estaban versionados en `supabase/migrations` con el mismo timestamp que sus versiones canónicas. El CLI intentaba registrar dos veces una versión y fallaba al instalar una base nueva.

Se preservan aquí como archivo histórico. No son migraciones adicionales ni deben ejecutarse: las versiones activas son los archivos sin ` 2` en `supabase/migrations`. Tres copias son idénticas; la copia de seguridad es anterior a los ajustes de referencias opcionales de la versión canónica.

Mover estas copias no cambia el esquema ni la historia de versiones de una base desplegada. No se reparó ni reescribió remotamente la tabla de migraciones.

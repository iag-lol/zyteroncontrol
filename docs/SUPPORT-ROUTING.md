# Support Routing

Las reglas viven en `support_routing_rules` y se evalúan por posición usando tipo, categoría, canal y cliente. Una regla puede seleccionar cola y prioridad. Sin coincidencia no se inventa responsable.

Las colas declaran privacidad y estrategia: `ROUND_ROBIN`, `LEAST_LOADED`, `PROJECT_OWNER`, `SERVICE_OWNER` o `MANUAL`. La implementación inicial ejecuta enrutamiento y asignación manual segura; las estrategias automáticas quedan configurables para activarse cuando exista directorio/presencia operativo.

La carga del agente es ponderada por prioridad, urgencia y breach, no solo por cantidad. La presencia opcional se limita a routing operativo y no constituye vigilancia laboral.

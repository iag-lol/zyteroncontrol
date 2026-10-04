# Alert Policy Engine

Settings define routing; los dominios propietarios emiten los eventos. Cada política declara fuente, evento, severidad mínima, condiciones, resolutores de destinatarios, canales, ventana de deduplicación, quiet hours y escalamiento.

Las políticas nacen deshabilitadas. La función de prueba solo resuelve una vista previa y no envía mensajes. Las alertas críticas pueden saltar quiet hours únicamente si la política lo declara. Nunca se inventan destinatarios: se resuelven desde roles, ownership y directorios canónicos.

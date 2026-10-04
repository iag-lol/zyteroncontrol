# Support Knowledge

La base de conocimiento separa artículo y versión. Cada modificación crea `knowledge_versions`; las versiones son inmutables y el artículo señala `current_version`.

Estados: `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED`. Visibilidad: `INTERNAL`, `CLIENT`, `PUBLIC` futuro. Las sugerencias iniciales usan términos del asunto/descripción y nunca bloquean la creación del ticket.

Support Copilot opera exclusivamente en modo `DRAFT_ONLY`: puede resumir, sugerir clasificación, detectar información faltante y proponer una respuesta con fuentes. Un agente debe revisar y enviar. No promete plazos, reembolsos ni resultados, y nunca recibe notas internas de otro tenant o datos financieros no autorizados.

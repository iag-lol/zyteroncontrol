# Plantillas documentales

Se reutiliza `document_templates`, creado originalmente por Comercial, y se amplía como catálogo central. `document_template_versions` conserva versiones, variables, resumen de cambio y estado.

Las variables se sustituyen server-side con escape HTML. `SafePreviewRenderer` entrega una previsualización marcada `PREVIEW — NO ES UN DOCUMENTO EMITIDO`; no pretende ser un PDF productivo.

La emisión PDF real debe conectar `DocumentRenderingService` con un renderer server-side mantenido, generar el binario, pasar por la misma validación/escaneo y crear una versión del expediente. Una plantilla publicada nunca debe editarse retroactivamente: se crea otra versión.

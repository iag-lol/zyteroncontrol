# Esquemas oficiales SII para DTE

Los cuatro archivos XSD de este directorio se descargaron desde la publicación oficial del Servicio de Impuestos Internos:

- Página: https://www.sii.cl/servicios_online/1039-formato_xml-1184.html
- Archivo: https://www.sii.cl/servicios_online/docs/xml/schema_dte.zip
- Descarga verificada: 2026-10-05

`EnvioDTE_v10.xsd` incluye `DTE_v10.xsd`, `SiiTypes_v10.xsd` y `xmldsignature_v10.xsd`. Los cuatro se cargan localmente para validar cada `EnvioDTE` sin enviar datos tributarios a terceros.

SHA-256:

- `DTE_v10.xsd`: `7d34c27956f1a22692c334d407f8b04f1fdf39bf1c39941f636bd8bb169e9110`
- `EnvioDTE_v10.xsd`: `33ea8dd38c895c359dddbcd21feb5acf8a4717f7f67524a6b0dd9a83d76920eb`
- `SiiTypes_v10.xsd`: `7a76c185045abed4cecbc4eef5328895b3d85aeedd4f4bf4bece5bb8ed7c8008`
- `xmldsignature_v10.xsd`: `427e3225cd379ae92bae464b892dbf964665af92d453ac61774cffab38b95edb`

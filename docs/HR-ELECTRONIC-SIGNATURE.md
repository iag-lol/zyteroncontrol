# Firma electrónica laboral

RR.HH. reutiliza `ElectronicSignatureProvider` de Documents. La secuencia válida es: versión final → hash SHA-256 → revisión/aprobación → bloqueo → solicitud al proveedor → evidencia → estado contractual.

El proveedor predeterminado es `NOT_CONFIGURED`; en ese estado la API bloquea la solicitud. No existen firmas dibujadas, certificados inventados ni almacenamiento de claves privadas del firmante.

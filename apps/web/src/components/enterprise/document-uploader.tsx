"use client";

export function DocumentUploader() {
  return <label className="documentUploader"><input type="file" /><strong>Seleccionar documento</strong><span>La carga se habilitará cuando Blob Storage esté conectado.</span></label>;
}


"use client";

import type { ReactNode } from "react";

export function ConfirmDialog({ open, title, children, onCancel, onConfirm }: { open: boolean; title: string; children: ReactNode; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div className="modalBackdrop"><section className="modal" role="dialog" aria-modal="true"><h2>{title}</h2>{children}<div className="formActions"><button className="secondaryButton" onClick={onCancel}>Cancelar</button><button className="primaryButton" onClick={onConfirm}>Confirmar</button></div></section></div>;
}

export function AuditDrawer({ open, children, onClose }: { open: boolean; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <aside className="auditDrawer"><button onClick={onClose}>Cerrar</button>{children}</aside>;
}


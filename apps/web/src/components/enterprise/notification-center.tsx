import { EmptyState } from "./empty-state";

export function NotificationCenter() {
  return <section className="notificationCenter"><header><strong>Notificaciones</strong><a href="/notifications">Ver todas</a></header><EmptyState title="Sin notificaciones" description="No existen notificaciones registradas." /></section>;
}


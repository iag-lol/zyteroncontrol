import Link from "next/link";
import { EmptyState } from "./empty-state";

export function NotificationCenter() {
  return <section className="notificationCenter"><header><strong>Notificaciones</strong><Link href="/notifications">Ver todas</Link></header><EmptyState title="Sin notificaciones" description="No existen notificaciones registradas." /></section>;
}

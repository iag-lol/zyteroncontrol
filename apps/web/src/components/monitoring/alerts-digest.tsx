"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAccess } from "@/components/access-context";
import { canAccessGroup } from "@/lib/access-control";
import { monitoringApi } from "@/lib/monitoring-api";
import { formatDateTime } from "@/lib/monitoring-format";
import { useMonitoringQuery } from "./ui";

/** Alertas de monitoreo del usuario dentro del centro de notificaciones global (sin sonido: ése vive en Monitoreo). */
export function MonitoringAlertsDigest({ fallback = null }: { fallback?: ReactNode }) {
  const { role } = useAccess();
  const enabled = canAccessGroup(role, "monitoring");
  const alerts = useMonitoringQuery(() => enabled ? monitoringApi.alerts(role) : Promise.resolve([]), [role, enabled]);
  const items = (alerts.data ?? []).filter((alert) => !alert.readAt).slice(0, 5);
  if (!enabled || !items.length) return <>{fallback}</>;
  return <div className="relEmbed" style={{ padding: "8px 12px", gap: 6 }}>
    <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--rel-green)" }}>Monitoreo</strong>
    {items.map((alert) => <Link key={alert.id} href={alert.href ?? "/monitoring"} style={{ display: "grid", gap: 2, color: "inherit", textDecoration: "none", fontSize: 12 }}><span style={{ fontWeight: 800 }}>{alert.title}</span><small style={{ color: "var(--rel-muted)" }}>{formatDateTime(alert.createdAt)}</small></Link>)}
  </div>;
}

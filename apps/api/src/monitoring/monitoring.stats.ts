import type { Incident, IncidentMetrics, LatencyWindow, MonitorCheck, UptimeBucket, UptimeWindow } from "@zyteron/contracts/monitoring";

// Fórmulas documentadas en docs/MONITORING.md. Son el espejo TS de las funciones SQL de la migración.

export const MIN_SAMPLES_P50 = 5;
export const MIN_SAMPLES_P95 = 20;

/** Interpolación lineal, equivalente a percentile_cont de PostgreSQL. */
export function percentile(sorted: number[], fraction: number) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}

/**
 * Uptime = checks exitosos / checks evaluados. Con política EXCLUDE los checks dentro de mantenimiento no
 * cuentan ni a favor ni en contra; con INCLUDE cuentan como cualquier otro. Sin checks evaluados → null.
 */
export function uptimeOf(checks: Pick<MonitorCheck, "success" | "inMaintenance">[], policy: "EXCLUDE" | "INCLUDE"): UptimeWindow {
  const maintenance = checks.filter((check) => check.inMaintenance);
  const evaluated = policy === "EXCLUDE" ? checks.filter((check) => !check.inMaintenance) : checks;
  const ok = evaluated.filter((check) => check.success).length;
  return { checks: checks.length, successes: checks.filter((check) => check.success).length, maintenanceChecks: maintenance.length, percentage: evaluated.length ? round(100 * ok / evaluated.length, 4) : null };
}

/** Latencia sólo de respuestas exitosas (los timeouts no son latencia real del servicio). */
export function latencyOf(checks: Pick<MonitorCheck, "success" | "latencyMs">[]): LatencyWindow {
  const values = checks.filter((check) => check.success && check.latencyMs !== null).map((check) => check.latencyMs!).sort((a, b) => a - b);
  if (!values.length) return { samples: 0, avg: null, p50: null, p95: null, min: null, max: null };
  return {
    samples: values.length, avg: round(values.reduce((sum, value) => sum + value, 0) / values.length, 2),
    p50: values.length >= MIN_SAMPLES_P50 ? percentile(values, 0.5) : null, p95: values.length >= MIN_SAMPLES_P95 ? percentile(values, 0.95) : null,
    min: values[0]!, max: values[values.length - 1]!,
  };
}

/**
 * MTTA = confirmed_at → acknowledged_at (excluye incidentes reabiertos: su reconocimiento corresponde a otra caída).
 * MTTR = Mean Time To Resolve = confirmed_at → resolved_at. Downtime medio = suma de caídas confirmadas por incidente.
 */
export function incidentMetrics(incidents: Pick<Incident, "confirmedAt" | "acknowledgedAt" | "resolvedAt" | "downtimeSeconds" | "reopenedCount" | "status">[]): IncidentMetrics {
  const seconds = (from: string, to: string) => (new Date(to).getTime() - new Date(from).getTime()) / 1000;
  const mtta = incidents.filter((item) => item.confirmedAt && item.acknowledgedAt && !item.reopenedCount && seconds(item.confirmedAt, item.acknowledgedAt) >= 0).map((item) => seconds(item.confirmedAt!, item.acknowledgedAt!));
  const mttr = incidents.filter((item) => item.confirmedAt && item.resolvedAt && seconds(item.confirmedAt, item.resolvedAt) >= 0).map((item) => seconds(item.confirmedAt!, item.resolvedAt!));
  const downtime = incidents.filter((item) => item.downtimeSeconds !== null).map((item) => item.downtimeSeconds!);
  const mean = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  return { incidents: incidents.length, resolved: incidents.filter((item) => item.resolvedAt).length, mttaSeconds: mean(mtta), mttaSamples: mtta.length, mttrSeconds: mean(mttr), mttrSamples: mttr.length, meanDowntimeSeconds: mean(downtime), totalDowntimeSeconds: downtime.reduce((sum, value) => sum + value, 0) };
}

const santiagoParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/** Inicio (UTC) del día calendario America/Santiago que contiene el instante. */
export function santiagoDayStart(instant: Date) {
  const parts = Object.fromEntries(santiagoParts.formatToParts(instant).map((part) => [part.type, part.value]));
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  const offset = wall - Math.floor(instant.getTime() / 1000) * 1000;
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - offset);
}

export function bucketize(checks: MonitorCheck[], granularity: "hour" | "day", policy: "EXCLUDE" | "INCLUDE"): UptimeBucket[] {
  const groups = new Map<string, MonitorCheck[]>();
  for (const check of checks) {
    const at = new Date(check.checkedAt);
    const key = granularity === "hour" ? new Date(Math.floor(at.getTime() / 3_600_000) * 3_600_000).toISOString() : santiagoDayStart(at).toISOString();
    groups.set(key, [...(groups.get(key) ?? []), check]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([periodStart, items]) => {
    // Igual que monitor_*_rollups: percentil sobre las muestras exitosas disponibles del período.
    const uptime = uptimeOf(items, policy), latency = latencyOf(items);
    const values = items.filter((item) => item.success && item.latencyMs !== null).map((item) => item.latencyMs!).sort((a, b) => a - b);
    return { periodStart, checks: items.length, successes: uptime.successes, failures: items.length - uptime.successes, maintenanceChecks: uptime.maintenanceChecks, uptime: uptime.percentage, avgLatencyMs: latency.avg, p95LatencyMs: percentile(values, 0.95) };
  });
}

export function round(value: number, digits: number) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }

import type { IncidentSeverity, IncidentStatus, MonitorStatus, SslStatus } from "@zyteron/contracts/monitoring";
import { formatDate, formatDateTime, formatTime } from "./date-time";

export { formatDate, formatDateTime, formatTime };

/** "7 min", "1 h 42 min", "2 d 3 h" — mismo criterio que el backend. */
export function formatDuration(totalSeconds: number | null | undefined) {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) return "Sin dato";
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60), days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60), rest = minutes % 60;
  if (days) return hours ? `${days} d ${hours} h` : `${days} d`;
  if (hours) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  return `${minutes} min`;
}
export function since(value: string | null | undefined, now = Date.now()) { return value ? formatDuration((now - new Date(value).getTime()) / 1000) : "Sin dato"; }
export function formatPercent(value: number | null | undefined, digits = 2) { return value === null || value === undefined ? "Sin datos" : `${value.toLocaleString("es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`; }
export function formatMs(value: number | null | undefined) { return value === null || value === undefined ? "—" : value >= 1000 ? `${(value / 1000).toLocaleString("es-CL", { maximumFractionDigits: 2 })} s` : `${Math.round(value)} ms`; }
export function formatInterval(seconds: number) { return seconds >= 3600 ? `${seconds / 3600} h` : `${seconds / 60} min`; }

export const monitorStatusLabel: Record<MonitorStatus, string> = { UNKNOWN: "Sin datos", ONLINE: "Online", DEGRADED: "Degradado", OFFLINE: "Offline", MAINTENANCE: "Mantenimiento", DISABLED: "Deshabilitado" };
export const incidentStatusLabel: Record<IncidentStatus, string> = { DETECTED: "Detectado", CONFIRMED: "Confirmado", ACKNOWLEDGED: "Reconocido", INVESTIGATING: "Investigando", MITIGATING: "Mitigando", MONITORING: "En observación", RESOLVED: "Resuelto", POSTMORTEM_REQUIRED: "Postmortem pendiente", CLOSED: "Cerrado" };
export const severityLabel: Record<IncidentSeverity, string> = { INFO: "Info", LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Crítica" };
export const sslStatusLabel: Record<SslStatus, string> = { HEALTHY: "Saludable", EXPIRING_SOON: "Por vencer", EXPIRED: "Vencido", INVALID: "Inválido", UNKNOWN: "Desconocido", NOT_APPLICABLE: "No aplica" };
export const environmentLabel: Record<string, string> = { PRODUCTION: "Producción", STAGING: "Staging", DEVELOPMENT: "Desarrollo", QA: "QA", DEMO: "Demo" };
export const endpointTypeLabel: Record<string, string> = { WEB: "Web principal", API: "API", ADMIN: "Admin", CLIENT_PORTAL: "Portal cliente", STAGING: "Staging", EXTERNAL_SERVICE: "Servicio externo" };
export const errorTypeLabel: Record<string, string> = { TIMEOUT: "Timeout", DNS: "DNS", CONNECTION: "Conexión", TLS: "TLS", SSRF_BLOCKED: "Bloqueado SSRF", HTTP_STATUS: "Status HTTP", CONTENT_MISMATCH: "Contenido", REDIRECT_LIMIT: "Redirects", REDIRECT_LOOP: "Loop redirect", RESPONSE_TOO_LARGE: "Respuesta grande", INVALID_URL: "URL inválida", UNKNOWN: "Desconocido" };
export const isActiveIncident = (status: IncidentStatus) => ["DETECTED", "CONFIRMED", "ACKNOWLEDGED", "INVESTIGATING", "MITIGATING", "MONITORING"].includes(status);

/** Banda de disponibilidad para colorear barras; siempre se acompaña del valor en texto. */
export function uptimeBand(value: number | null): "good" | "warning" | "serious" | "critical" | "empty" {
  if (value === null) return "empty";
  if (value >= 99.9) return "good";
  if (value >= 99) return "warning";
  if (value >= 95) return "serious";
  return "critical";
}

/** Convierte "DD-MM-AAAA" + "HH:mm" (America/Santiago) a ISO UTC para el backend. */
export function santiagoToIso(date: string, time: string) {
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date.trim()), hm = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!dmy || !hm || Number(hm[1]) > 23 || Number(hm[2]) > 59) return null;
  const [, day, month, year] = dmy;
  const guess = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hm[1]), Number(hm[2]));
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
  const asSantiago = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute));
  const result = new Date(guess - (asSantiago - guess));
  return formatDate(result) === date.trim() && formatTime(result) === time.trim() ? result.toISOString() : null;
}

/** Filtro opcional por fecha DD-MM-AAAA: vacío o inválido → sin filtro. */
export function optionalSantiagoIso(date: string, time: string) { return date.trim() ? santiagoToIso(date, time) ?? undefined : undefined; }

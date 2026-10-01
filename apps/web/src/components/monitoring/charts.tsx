"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import type { Incident, UptimeBucket } from "@zyteron/contracts/monitoring";
import { Activity } from "lucide-react";
import { formatDate, formatDateTime, formatMs, formatPercent, formatTime, uptimeBand } from "@/lib/monitoring-format";
import { Empty, ErrorBox, Loading } from "./ui";

// Gráficos con datos reales únicamente: los períodos sin checks se muestran como "Sin datos", nunca se rellenan.
export const SERIES = { avg: "#178f62", p95: "#4a6fd8" } as const; // validado con validate_palette.js (modo claro)

export function ChartFrame({ loading, error, empty, emptyText, children, height = 160 }: { loading: boolean; error?: string; empty: boolean; emptyText: string; children: ReactNode; height?: number }) {
  if (loading) return <Loading height={height} label="Cargando gráfico" />;
  if (error) return <ErrorBox error={error} />;
  if (empty) return <Empty title="Sin datos para graficar" text={emptyText} icon={Activity} />;
  return <>{children}</>;
}

/** Completa la serie temporal esperada (horas o días) para que los huecos sean visibles. */
export function fillPeriods(buckets: UptimeBucket[], granularity: "hour" | "day", count: number) {
  const byKey = new Map(buckets.map((bucket) => [granularity === "hour" ? bucket.periodStart.slice(0, 13) : formatDate(bucket.periodStart), bucket]));
  const step = granularity === "hour" ? 3_600_000 : 86_400_000;
  const end = granularity === "hour" ? Math.floor(Date.now() / step) * step : Date.now();
  return Array.from({ length: count }, (_, index) => {
    const at = new Date(end - (count - 1 - index) * step);
    const key = granularity === "hour" ? at.toISOString().slice(0, 13) : formatDate(at);
    return { at: at.toISOString(), bucket: byKey.get(key) ?? null };
  });
}

/** Barras de disponibilidad por período; color por banda + tooltip + tabla (el color no es el único canal). */
export function UptimeBars({ buckets, granularity, count, incidents = [], label }: { buckets: UptimeBucket[]; granularity: "hour" | "day"; count: number; incidents?: Incident[]; label: string }) {
  const periods = useMemo(() => fillPeriods(buckets, granularity, count), [buckets, granularity, count]);
  const [hover, setHover] = useState<number | null>(null);
  const incidentKeys = useMemo(() => new Set(incidents.map((incident) => granularity === "hour" ? incident.detectedAt.slice(0, 13) : formatDate(incident.detectedAt))), [incidents, granularity]);
  const keyOf = (at: string) => granularity === "hour" ? at.slice(0, 13) : formatDate(at);
  const hovered = hover === null ? null : periods[hover]!;
  return <div className="relChart" onMouseLeave={() => setHover(null)}>
    <div className={`relBars ${periods.length > 48 ? "dense" : ""}`} role="list" aria-label={label}>
      {periods.map((period, index) => {
        const value = period.bucket?.uptime ?? null, band = uptimeBand(period.bucket ? value : null);
        return <button key={period.at} type="button" role="listitem" onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} onBlur={() => setHover(null)} aria-label={`${granularity === "hour" ? formatDateTime(period.at) : formatDate(period.at)}: ${period.bucket ? formatPercent(value) : "sin datos"}${incidentKeys.has(keyOf(period.at)) ? ", con incidente" : ""}`}>
          <span className={`band-${band}`} style={{ height: "100%" }} />{incidentKeys.has(keyOf(period.at)) ? <em aria-hidden /> : null}
        </button>;
      })}
    </div>
    {hovered ? <div className="relTooltip" style={{ left: `${((hover! + 0.5) / periods.length) * 100}%`, top: 0 }}>
      <strong>{hovered.bucket ? formatPercent(hovered.bucket.uptime) : "Sin datos"}</strong>
      <span>{granularity === "hour" ? `${formatDate(hovered.at)} ${formatTime(hovered.at)}` : formatDate(hovered.at)}</span>
      {hovered.bucket ? <span>{hovered.bucket.successes}/{hovered.bucket.checks} checks correctos{hovered.bucket.maintenanceChecks ? ` · ${hovered.bucket.maintenanceChecks} en mantenimiento` : ""}</span> : null}
      {incidentKeys.has(keyOf(hovered.at)) ? <span>● Incidente detectado en el período</span> : null}
    </div> : null}
    <div className="relBarsAxis"><span>{granularity === "hour" ? formatTime(periods[0]!.at) : formatDate(periods[0]!.at)}</span><span>{granularity === "hour" ? "ahora" : "hoy"}</span></div>
  </div>;
}

export function UptimeLegend() {
  return <div className="relChartLegend" aria-label="Bandas de disponibilidad">
    <span><i className="box" style={{ background: "var(--st-online)" }} />≥ 99,9 %</span><span><i className="box" style={{ background: "#e0a429" }} />≥ 99 %</span>
    <span><i className="box" style={{ background: "#e07b45" }} />≥ 95 %</span><span><i className="box" style={{ background: "var(--st-offline)" }} />&lt; 95 %</span>
    <span><i className="box" style={{ background: "#e3e8e5" }} />Sin datos</span><span><i className="box" style={{ background: "var(--sev-critical)", borderRadius: 99 }} />Incidente</span>
  </div>;
}

/** Latencia promedio y p95 por período, un solo eje (ms), crosshair que se ajusta al período más cercano. */
export function LatencyChart({ buckets, granularity, height = 180 }: { buckets: UptimeBucket[]; granularity: "hour" | "day"; height?: number }) {
  const points = buckets.filter((bucket) => bucket.avgLatencyMs !== null).sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const width = 640, pad = { l: 44, r: 54, t: 12, b: 22 };
  if (!points.length) return <Empty title="Sin latencias registradas" text="Aún no hay respuestas exitosas en el período." icon={Activity} />;
  const max = Math.max(...points.map((point) => Math.max(point.avgLatencyMs ?? 0, point.p95LatencyMs ?? 0)));
  const niceMax = max <= 0 ? 100 : 10 ** Math.floor(Math.log10(max)) * Math.ceil(max / 10 ** Math.floor(Math.log10(max)));
  const t0 = new Date(points[0]!.periodStart).getTime(), t1 = new Date(points.at(-1)!.periodStart).getTime() || t0 + 1;
  const x = (iso: string) => pad.l + (points.length === 1 ? (width - pad.l - pad.r) / 2 : ((new Date(iso).getTime() - t0) / Math.max(1, t1 - t0)) * (width - pad.l - pad.r));
  const y = (value: number) => pad.t + (1 - value / niceMax) * (height - pad.t - pad.b);
  const path = (key: "avgLatencyMs" | "p95LatencyMs") => points.filter((point) => point[key] !== null).map((point, index) => `${index ? "L" : "M"}${x(point.periodStart).toFixed(1)},${y(point[key]!).toFixed(1)}`).join(" ");
  const area = `${path("avgLatencyMs")} L${x(points.at(-1)!.periodStart)},${y(0)} L${x(points[0]!.periodStart)},${y(0)} Z`;
  const ticks = [0, niceMax / 2, niceMax];
  const last = points.at(-1)!;
  const hasP95 = points.some((point) => point.p95LatencyMs !== null);
  const onMove = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect(); if (!box) return;
    const px = ((clientX - box.left) / box.width) * width;
    let best = 0; points.forEach((point, index) => { if (Math.abs(x(point.periodStart) - px) < Math.abs(x(points[best]!.periodStart) - px)) best = index; });
    setHover(best);
  };
  const hovered = hover === null ? null : points[hover]!;
  return <div className="relChart">
    <svg ref={ref} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Latencia promedio y p95 en milisegundos" tabIndex={0}
      onPointerMove={(event) => onMove(event.clientX)} onPointerLeave={() => setHover(null)}
      onKeyDown={(event) => { if (event.key === "ArrowRight") setHover((current) => Math.min(points.length - 1, (current ?? -1) + 1)); if (event.key === "ArrowLeft") setHover((current) => Math.max(0, (current ?? points.length) - 1)); }} onBlur={() => setHover(null)}>
      {ticks.map((tick) => <g key={tick}><line className="grid" x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} /><text className="axis" x={pad.l - 6} y={y(tick) + 3} textAnchor="end">{formatMs(tick)}</text></g>)}
      <path d={area} fill={SERIES.avg} opacity={0.1} />
      {hasP95 ? <path d={path("p95LatencyMs")} fill="none" stroke={SERIES.p95} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
      <path d={path("avgLatencyMs")} fill="none" stroke={SERIES.avg} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last.p95LatencyMs !== null ? <circle cx={x(last.periodStart)} cy={y(last.p95LatencyMs)} r={4} fill={SERIES.p95} stroke="#fff" strokeWidth={2} /> : null}
      <circle cx={x(last.periodStart)} cy={y(last.avgLatencyMs!)} r={4} fill={SERIES.avg} stroke="#fff" strokeWidth={2} />
      <text className="axis" x={x(last.periodStart) + 8} y={y(last.avgLatencyMs!) + 3}>{formatMs(last.avgLatencyMs)}</text>
      <text className="axis" x={pad.l} y={height - 4}>{granularity === "hour" ? formatTime(points[0]!.periodStart) : formatDate(points[0]!.periodStart)}</text>
      <text className="axis" x={width - pad.r} y={height - 4} textAnchor="end">{granularity === "hour" ? formatTime(last.periodStart) : formatDate(last.periodStart)}</text>
      {hovered ? <g><line x1={x(hovered.periodStart)} x2={x(hovered.periodStart)} y1={pad.t} y2={height - pad.b} stroke="#1a3d30" strokeWidth={1} opacity={0.5} />
        <circle cx={x(hovered.periodStart)} cy={y(hovered.avgLatencyMs!)} r={4} fill={SERIES.avg} stroke="#fff" strokeWidth={2} />
        {hovered.p95LatencyMs !== null ? <circle cx={x(hovered.periodStart)} cy={y(hovered.p95LatencyMs)} r={4} fill={SERIES.p95} stroke="#fff" strokeWidth={2} /> : null}</g> : null}
    </svg>
    {hovered ? <div className="relTooltip" style={{ left: `${(x(hovered.periodStart) / width) * 100}%`, top: `${(y(hovered.p95LatencyMs ?? hovered.avgLatencyMs!) / height) * 100}%` }}>
      <span>{granularity === "hour" ? `${formatDate(hovered.periodStart)} ${formatTime(hovered.periodStart)}` : formatDate(hovered.periodStart)}</span>
      <span><i style={{ borderColor: SERIES.avg }} /><strong>{formatMs(hovered.avgLatencyMs)}</strong> promedio</span>
      <span><i style={{ borderColor: SERIES.p95 }} /><strong>{formatMs(hovered.p95LatencyMs)}</strong> p95</span>
      <span>{hovered.successes} respuestas exitosas</span>
    </div> : null}
    <div className="relChartLegend"><span><i style={{ borderColor: SERIES.avg }} />Promedio</span>{hasP95 ? <span><i style={{ borderColor: SERIES.p95 }} />p95 del período</span> : <span>p95 sin muestras suficientes</span>}</div>
    <details className="relTableToggle"><summary>Ver tabla de datos</summary><div className="relTableWrap"><table className="relTable"><thead><tr><th>Período</th><th className="num">Promedio</th><th className="num">p95</th><th className="num">Checks</th></tr></thead><tbody>{points.map((point) => <tr key={point.periodStart}><td>{granularity === "hour" ? formatDateTime(point.periodStart) : formatDate(point.periodStart)}</td><td className="num">{formatMs(point.avgLatencyMs)}</td><td className="num">{formatMs(point.p95LatencyMs)}</td><td className="num">{point.checks}</td></tr>)}</tbody></table></div></details>
  </div>;
}

/** Tabla accesible equivalente a las barras de uptime. */
export function UptimeTable({ buckets, granularity }: { buckets: UptimeBucket[]; granularity: "hour" | "day" }) {
  return <details className="relTableToggle"><summary>Ver tabla de disponibilidad</summary><div className="relTableWrap"><table className="relTable"><thead><tr><th>Período</th><th className="num">Uptime</th><th className="num">Checks</th><th className="num">Fallas</th><th className="num">Mantenimiento</th></tr></thead><tbody>
    {buckets.length ? [...buckets].reverse().map((bucket) => <tr key={bucket.periodStart}><td>{granularity === "hour" ? formatDateTime(bucket.periodStart) : formatDate(bucket.periodStart)}</td><td className="num">{formatPercent(bucket.uptime)}</td><td className="num">{bucket.checks}</td><td className="num">{bucket.failures}</td><td className="num">{bucket.maintenanceChecks}</td></tr>) : <tr><td colSpan={5}>Sin períodos con checks.</td></tr>}
  </tbody></table></div></details>;
}

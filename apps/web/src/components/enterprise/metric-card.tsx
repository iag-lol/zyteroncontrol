import type { ReactNode } from "react";

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: ReactNode }) {
  return <article className="reusableMetricCard">{icon ? <span>{icon}</span> : null}<div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}


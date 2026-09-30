export function StatusBadge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={`statusBadge ${tone}`}>{children}</span>;
}


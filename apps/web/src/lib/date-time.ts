const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Sin fecha";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("-");
  return dateFormatter.format(new Date(value)).replaceAll("/", "-");
}
export function todayInChile(value = new Date()) {
  const parts = dateFormatter.formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "Sin hora";
  return timeFormatter.format(new Date(value));
}
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "Sin fecha";
  return `${formatDate(value)} ${formatTime(value)}`;
}
export function toIsoDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const candidate = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (Number.isNaN(candidate.getTime()) || candidate.getUTCDate() !== Number(day) || candidate.getUTCMonth() + 1 !== Number(month)) return null;
  return `${year}-${month}-${day}`;
}

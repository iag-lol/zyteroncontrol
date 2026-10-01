// Formato de presentación del servidor (CSV, títulos de eventos): DD-MM-AAAA y HH:mm 24 h en America/Santiago.
const date = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" });
const time = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false });

export function santiagoDate(value: string | Date | null | undefined) { return value ? date.format(new Date(value)).replaceAll("/", "-") : ""; }
export function santiagoDateTime(value: string | Date | null | undefined) { return value ? `${santiagoDate(value)} ${time.format(new Date(value))}` : ""; }

const BOM = String.fromCharCode(0xfeff);

export function toCsv(header: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const escape = (value: string | number | boolean | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    // Neutraliza fórmulas al abrir el CSV en planillas.
    const safe = typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",;\n\r]/.test(safe) ? `"${safe.replaceAll("\"", "\"\"")}"` : safe;
  };
  return `${BOM}${[header, ...rows].map((row) => row.map(escape).join(";")).join("\r\n")}\r\n`;
}

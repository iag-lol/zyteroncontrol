import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

export interface SafeAutomationResult {
  status: "PASS" | "PASS_WITH_OBSERVATION" | "FAIL" | "BLOCKED";
  notes: string;
  source: string;
  evidence: Record<string, unknown>;
}

export abstract class AuditAutomationProvider {
  abstract execute(key: string, authorizedUrl: string): Promise<SafeAutomationResult>;
}

const reservedHost = (hostname: string) => {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return value === "localhost" || value.endsWith(".local") || value === "0.0.0.0" || value === "::1" ||
    /^127\./.test(value) || /^10\./.test(value) || /^169\.254\./.test(value) || /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value) || /^fc|^fd|^fe80/i.test(value);
};

@Injectable()
export class SafeHttpAuditProvider extends AuditAutomationProvider {
  async execute(key: string, authorizedUrl: string): Promise<SafeAutomationResult> {
    let url: URL;
    try { url = new URL(authorizedUrl); } catch { throw new BadRequestException("El endpoint autorizado no contiene una URL válida."); }
    if (!["http:", "https:"].includes(url.protocol) || reservedHost(url.hostname)) throw new BadRequestException("La automatización bloqueó un destino privado, reservado o no HTTP(S).");
    if (!new Set(["HTTP_AVAILABILITY", "SSL", "RESPONSE_TIME", "SECURITY_HEADERS", "ROBOTS", "SITEMAP", "META", "CANONICAL"]).has(key)) throw new BadRequestException("La automatización solicitada no está autorizada.");
    const started = Date.now();
    try {
      const response = await fetch(url, { method: key === "ROBOTS" || key === "SITEMAP" ? "GET" : "HEAD", redirect: "manual", signal: AbortSignal.timeout(8_000), headers: { "user-agent": "Zyteron-Control-Audit/1.0" } });
      const durationMs = Date.now() - started;
      if (key === "SSL") return { status: url.protocol === "https:" ? "PASS" : "FAIL", notes: url.protocol === "https:" ? "El endpoint autorizado utiliza HTTPS." : "El endpoint no utiliza HTTPS.", source: "SAFE_HTTP", evidence: { protocol: url.protocol, checkedAt: new Date().toISOString() } };
      if (key === "RESPONSE_TIME") return { status: response.ok && durationMs <= 2_000 ? "PASS" : response.ok ? "PASS_WITH_OBSERVATION" : "FAIL", notes: `Respuesta HTTP ${response.status} en ${durationMs} ms.`, source: "SAFE_HTTP", evidence: { status: response.status, durationMs } };
      if (key === "SECURITY_HEADERS") {
        const names = ["content-security-policy", "strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy"];
        const present = names.filter((name) => response.headers.has(name));
        const missing = names.filter((name) => !response.headers.has(name));
        return { status: missing.length === 0 ? "PASS" : present.length ? "PASS_WITH_OBSERVATION" : "FAIL", notes: `${present.length}/${names.length} cabeceras defensivas observadas. La ausencia no demuestra una vulnerabilidad explotable.`, source: "SAFE_HTTP", evidence: { present, missing, status: response.status } };
      }
      return { status: response.ok ? "PASS" : "FAIL", notes: `El endpoint autorizado respondió HTTP ${response.status}.`, source: "SAFE_HTTP", evidence: { status: response.status, durationMs, location: response.headers.get("location") } };
    } catch (error) {
      return { status: "BLOCKED", notes: error instanceof Error && error.name === "TimeoutError" ? "La comprobación segura superó 8 segundos." : "No fue posible completar la comprobación segura.", source: "SAFE_HTTP", evidence: { error: error instanceof Error ? error.name : "UNKNOWN" } };
    }
  }
}

export abstract class PerformanceAuditProvider {
  abstract configured(): boolean;
}

@Injectable()
export class DeferredPerformanceAuditProvider extends PerformanceAuditProvider {
  configured() { return false; }
}

export interface RenderedAuditReport { bytes: Buffer; sha256: string; filename: string; }

@Injectable()
export class AuditReportRenderer {
  render(auditNumber: string, reportType: "INTERNAL" | "CLIENT", lines: string[]): RenderedAuditReport {
    const sanitize = (value: string) => value.replace(/[()\\]/g, " ").replace(/[^\x20-\x7E]/g, "?").slice(0, 120);
    const content = ["BT", "/F1 11 Tf", "52 790 Td", ...lines.slice(0, 34).flatMap((line, index) => index ? ["0 -20 Td", `(${sanitize(line)}) Tj`] : [`(${sanitize(line)}) Tj`]), "ET"].join("\n");
    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
      `4 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    ];
    let pdf = "%PDF-1.4\n"; const offsets = [0];
    for (const object of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += `${object}\n`; }
    const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => String(offset).padStart(10, "0") + " 00000 n ").join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = Buffer.from(pdf);
    return { bytes, sha256: createHash("sha256").update(bytes).digest("hex"), filename: `${auditNumber}-${reportType.toLowerCase()}.pdf` };
  }
}

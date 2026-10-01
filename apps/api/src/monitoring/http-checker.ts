import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import type { TLSSocket } from "node:tls";
import type { CheckErrorType } from "@zyteron/contracts/monitoring";
import {
  configuredAllowedPorts, createSafeLookup, MONITOR_USER_AGENT, parseMonitorUrl, publicAddressPolicy, SsrfError, systemResolver,
  type AddressPolicy, type Resolver,
} from "./ssrf-guard.js";

export interface HttpCheckRequest {
  url: string; method: "GET" | "HEAD"; timeoutMs: number; expectedStatusMin: number; expectedStatusMax: number;
  expectedContent: string | null; followRedirects: boolean; maxRedirects: number; contentInspectBytes: number;
}
export interface HttpCheckResult {
  checkedAt: string; success: boolean; statusCode: number | null; latencyMs: number | null; errorType: CheckErrorType | null; errorCode: string | null;
  errorMessage: string | null; redirectCount: number; contentMatched: boolean | null; sslValid: boolean | null; sslExpiresAt: string | null;
}
export interface HttpCheckerOptions { resolver?: Resolver; addressPolicy?: AddressPolicy; allowedPorts?: number[]; userAgent?: string; }

const MAX_TIMEOUT_MS = 30_000;
const tlsCodes = /^(CERT_|ERR_TLS_|ERR_SSL_|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT|HOSTNAME_MISMATCH)/;

class CheckFailure extends Error {
  constructor(readonly errorType: CheckErrorType, readonly errorCode: string | null, message: string, readonly statusCode: number | null = null) { super(message); }
}

/** Traduce errores de red a categorías seguras; nunca expone IPs, cabeceras ni trazas. */
export function classifyNetworkError(error: unknown): CheckFailure {
  if (error instanceof CheckFailure) return error;
  if (error instanceof SsrfError) return new CheckFailure("SSRF_BLOCKED", error.code, error.message);
  const code = String((error as { code?: string })?.code ?? (error as { name?: string })?.name ?? "UNKNOWN");
  if (code === "SSRF_BLOCKED") return new CheckFailure("SSRF_BLOCKED", "PRIVATE_ADDRESS", "El destino resuelve a una dirección privada o reservada.");
  if (code === "AbortError" || code === "ABORT_ERR" || code === "ETIMEDOUT" || code === "TIMEOUT") return new CheckFailure("TIMEOUT", "TIMEOUT", "Tiempo de espera agotado.");
  if (["ENOTFOUND", "EAI_AGAIN", "ENODATA", "EAI_NONAME", "EAI_FAIL"].includes(code)) return new CheckFailure("DNS", code, "El dominio no pudo resolverse en DNS.");
  if (["ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "EPIPE", "ECONNABORTED", "EADDRNOTAVAIL"].includes(code)) return new CheckFailure("CONNECTION", code, "No fue posible establecer o mantener la conexión.");
  if (tlsCodes.test(code)) return new CheckFailure("TLS", code, "El certificado o la negociación TLS no es válido.");
  if (code.startsWith("HPE_")) return new CheckFailure("CONNECTION", code, "El servidor devolvió una respuesta HTTP inválida.");
  return new CheckFailure("UNKNOWN", code.slice(0, 60), "Error no clasificado durante la comprobación.");
}

export class HttpChecker {
  private readonly lookup: ReturnType<typeof createSafeLookup>;
  private readonly allowedPorts: number[];
  private readonly userAgent: string;
  constructor(options: HttpCheckerOptions = {}) {
    this.lookup = createSafeLookup(options.resolver ?? systemResolver, options.addressPolicy ?? publicAddressPolicy);
    this.allowedPorts = options.allowedPorts ?? configuredAllowedPorts();
    this.userAgent = options.userAgent ?? MONITOR_USER_AGENT;
  }

  async check(request: HttpCheckRequest): Promise<HttpCheckResult> {
    const startedAt = Date.now();
    const checkedAt = new Date(startedAt).toISOString();
    const timeoutMs = Math.min(Math.max(request.timeoutMs, 1000), MAX_TIMEOUT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const tls = { valid: null as boolean | null, expiresAt: null as string | null };
    let redirectCount = 0;
    try {
      const visited = new Set<string>();
      let current = parseMonitorUrl(request.url, this.allowedPorts);
      for (;;) {
        if (visited.has(current.href)) throw new CheckFailure("REDIRECT_LOOP", "REDIRECT_LOOP", "Se detectó un ciclo de redirecciones.");
        visited.add(current.href);
        const response = await this.send(current, request.method, controller.signal, tls);
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location && request.followRedirects) {
          response.destroy();
          if (redirectCount >= request.maxRedirects) throw new CheckFailure("REDIRECT_LIMIT", "REDIRECT_LIMIT", `Se superó el máximo de ${request.maxRedirects} redirecciones.`, status);
          redirectCount += 1;
          // Cada salto vuelve a pasar por la política SSRF y por el lookup validado.
          current = parseMonitorUrl(new URL(location, current).toString(), this.allowedPorts);
          continue;
        }
        const latencyMs = Date.now() - startedAt;
        const inRange = status >= request.expectedStatusMin && status <= request.expectedStatusMax;
        if (!inRange) { response.destroy(); throw new CheckFailure("HTTP_STATUS", String(status), `HTTP ${status} fuera del rango esperado ${request.expectedStatusMin}-${request.expectedStatusMax}.`, status); }
        let contentMatched: boolean | null = null;
        if (request.expectedContent && request.method === "GET") {
          const sample = await readLimited(response, request.contentInspectBytes, controller.signal);
          contentMatched = sample.includes(request.expectedContent);
          if (!contentMatched) throw Object.assign(new CheckFailure("CONTENT_MISMATCH", "CONTENT_MISSING", `El contenido esperado no aparece en los primeros ${Math.round(request.contentInspectBytes / 1024)} KB.`, status), { latencyMs });
        } else response.destroy();
        return { checkedAt, success: true, statusCode: status, latencyMs, errorType: null, errorCode: null, errorMessage: null, redirectCount, contentMatched, sslValid: tls.valid, sslExpiresAt: tls.expiresAt };
      }
    } catch (error) {
      const failure = controller.signal.aborted ? new CheckFailure("TIMEOUT", "TIMEOUT", `Sin respuesta en ${timeoutMs} ms.`) : classifyNetworkError(error);
      if (failure.errorType === "TLS") tls.valid = false;
      const latency = (error as { latencyMs?: number }).latencyMs ?? (failure.statusCode ? Date.now() - startedAt : failure.errorType === "TIMEOUT" ? timeoutMs : null);
      return { checkedAt, success: false, statusCode: failure.statusCode, latencyMs: latency, errorType: failure.errorType, errorCode: failure.errorCode, errorMessage: failure.message.slice(0, 300), redirectCount, contentMatched: failure.errorType === "CONTENT_MISMATCH" ? false : null, sslValid: tls.valid, sslExpiresAt: tls.expiresAt };
    } finally { clearTimeout(timer); }
  }

  private send(url: URL, method: "GET" | "HEAD", signal: AbortSignal, tls: { valid: boolean | null; expiresAt: string | null }) {
    const client = url.protocol === "https:" ? https : http;
    return new Promise<IncomingMessage>((resolve, reject) => {
      const request = client.request(url, {
        method, signal, agent: false, lookup: this.lookup as never, maxHeaderSize: 16_384,
        // No se envían cookies, Authorization ni credenciales; el monitor se identifica explícitamente.
        headers: { "user-agent": this.userAgent, accept: "text/html,application/json;q=0.9,*/*;q=0.5", "accept-encoding": "identity", connection: "close" },
      }, resolve);
      request.on("socket", (socket) => {
        if (!("encrypted" in socket)) return;
        socket.once("secureConnect", () => {
          const certificate = (socket as TLSSocket).getPeerCertificate();
          tls.valid = (socket as TLSSocket).authorized;
          tls.expiresAt = certificate?.valid_to ? new Date(certificate.valid_to).toISOString() : null;
        });
      });
      request.on("error", reject);
      request.end();
    });
  }
}

function readLimited(response: IncomingMessage, limit: number, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const finish = () => { response.destroy(); resolve(Buffer.concat(chunks).toString("utf8")); };
    response.on("data", (chunk: Buffer) => {
      const remaining = limit - size;
      chunks.push(chunk.length > remaining ? chunk.subarray(0, remaining) : chunk);
      size += Math.min(chunk.length, remaining);
      if (size >= limit) finish();
    });
    response.on("end", finish);
    response.on("error", (error) => signal.aborted ? reject(Object.assign(new Error("aborted"), { code: "AbortError" })) : reject(error));
  });
}

/** Limita solicitudes concurrentes por host para no generar comportamiento similar a DoS. */
export class HostConcurrencyLimiter {
  private readonly active = new Map<string, number>();
  private readonly queues = new Map<string, Array<() => void>>();
  constructor(private readonly perHost: number) {}
  async run<T>(host: string, task: () => Promise<T>): Promise<T> {
    const key = host.toLowerCase();
    // El cupo se transfiere directamente al siguiente en cola para que nadie supere el límite entre medio.
    if ((this.active.get(key) ?? 0) >= this.perHost) await new Promise<void>((resolve) => this.queues.set(key, [...(this.queues.get(key) ?? []), resolve]));
    else this.active.set(key, (this.active.get(key) ?? 0) + 1);
    try { return await task(); } finally {
      const queue = this.queues.get(key);
      const next = queue?.shift();
      if (queue && !queue.length) this.queues.delete(key);
      if (next) next();
      else { const remaining = (this.active.get(key) ?? 1) - 1; if (remaining) this.active.set(key, remaining); else this.active.delete(key); }
    }
  }
  inFlight(host: string) { return this.active.get(host.toLowerCase()) ?? 0; }
}

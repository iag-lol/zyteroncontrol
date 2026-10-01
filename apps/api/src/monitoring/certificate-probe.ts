import { isIP } from "node:net";
import tls, { type PeerCertificate } from "node:tls";
import type { SslErrorType, SslStatus } from "@zyteron/contracts/monitoring";
import { configuredAllowedPorts, createSafeLookup, parseMonitorUrl, publicAddressPolicy, SsrfError, systemResolver, type AddressPolicy, type Resolver } from "./ssrf-guard.js";

export interface CertificateObservation {
  hostname: string; observedAt: string; status: SslStatus; valid: boolean | null; issuer: string | null; subject: string | null;
  notBefore: string | null; expiresAt: string | null; daysRemaining: number | null; fingerprint: string | null; errorType: SslErrorType | null; errorCode: string | null;
}
export interface CertificateFacts { authorized: boolean; authorizationError: string | null; identityError: string | null; validFrom: string | null; validTo: string | null; }

const DAY_MS = 86_400_000;

export function daysUntil(expiresAt: string | null, now = new Date()) {
  if (!expiresAt) return null;
  return Math.floor((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS);
}

/** Clasificación pura del certificado observado (sin red), usada por el probe y los tests. */
export function classifyCertificate(facts: CertificateFacts, now: Date, warningDays: number): { status: SslStatus; errorType: SslErrorType | null; errorCode: string | null; daysRemaining: number | null; valid: boolean } {
  const daysRemaining = daysUntil(facts.validTo, now);
  const notYetValid = facts.validFrom ? new Date(facts.validFrom).getTime() > now.getTime() : false;
  const expiredByDate = facts.validTo ? new Date(facts.validTo).getTime() <= now.getTime() : false;
  const code = facts.authorizationError;
  if (expiredByDate || code === "CERT_HAS_EXPIRED") return { status: "EXPIRED", errorType: "EXPIRED", errorCode: code ?? "CERT_HAS_EXPIRED", daysRemaining, valid: false };
  if (notYetValid || code === "CERT_NOT_YET_VALID") return { status: "INVALID", errorType: "NOT_YET_VALID", errorCode: code ?? "CERT_NOT_YET_VALID", daysRemaining, valid: false };
  if (facts.identityError) return { status: "INVALID", errorType: "HOSTNAME_MISMATCH", errorCode: facts.identityError, daysRemaining, valid: false };
  if (code === "DEPTH_ZERO_SELF_SIGNED_CERT" || code === "SELF_SIGNED_CERT_IN_CHAIN") return { status: "INVALID", errorType: "SELF_SIGNED", errorCode: code, daysRemaining, valid: false };
  if (!facts.authorized || code) return { status: "INVALID", errorType: "UNTRUSTED", errorCode: code ?? "UNTRUSTED", daysRemaining, valid: false };
  return { status: daysRemaining !== null && daysRemaining <= warningDays ? "EXPIRING_SOON" : "HEALTHY", errorType: null, errorCode: null, daysRemaining, valid: true };
}

/** Selecciona el umbral de alerta más urgente alcanzado (evita enviar 90/60/30 a la vez). */
export function sslAlertThreshold(daysRemaining: number | null, thresholds: number[]) {
  if (daysRemaining === null || daysRemaining < 0) return null;
  const crossed = thresholds.filter((value) => daysRemaining <= value).sort((a, b) => a - b);
  return crossed[0] ?? null;
}

const name = (value: PeerCertificate["issuer"] | undefined) => {
  if (!value) return null;
  const parts = [value.CN, value.O].filter(Boolean).map(String);
  return parts.length ? [...new Set(parts)].join(" · ").slice(0, 200) : null;
};

export class CertificateProbe {
  private readonly lookup: ReturnType<typeof createSafeLookup>;
  constructor(private readonly options: { resolver?: Resolver; addressPolicy?: AddressPolicy; allowedPorts?: number[] } = {}) {
    this.lookup = createSafeLookup(options.resolver ?? systemResolver, options.addressPolicy ?? publicAddressPolicy);
  }

  async probe(rawUrl: string, warningDays: number, timeoutMs = 10_000): Promise<CertificateObservation> {
    const observedAt = new Date();
    let url: URL;
    try { url = parseMonitorUrl(rawUrl, this.options.allowedPorts ?? configuredAllowedPorts()); }
    catch (error) { return this.failure(rawUrl, observedAt, error instanceof SsrfError ? "SSRF_BLOCKED" : "TLS_FAILURE", error instanceof SsrfError ? error.code : "INVALID_URL"); }
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (url.protocol !== "https:") return { hostname, observedAt: observedAt.toISOString(), status: "NOT_APPLICABLE", valid: null, issuer: null, subject: null, notBefore: null, expiresAt: null, daysRemaining: null, fingerprint: null, errorType: null, errorCode: null };
    return new Promise((resolve) => {
      let settled = false;
      const done = (value: CertificateObservation) => { if (!settled) { settled = true; socket.destroy(); resolve(value); } };
      // rejectUnauthorized=false sólo para leer el certificado y clasificarlo; no se envían datos de aplicación.
      const socket = tls.connect({ host: hostname, port: Number(url.port || 443), servername: isIP(hostname) ? undefined : hostname, rejectUnauthorized: false, lookup: this.lookup as never, timeout: timeoutMs });
      socket.once("secureConnect", () => {
        const certificate = socket.getPeerCertificate();
        if (!certificate || !Object.keys(certificate).length) return done(this.failure(hostname, observedAt, "TLS_FAILURE", "NO_CERTIFICATE"));
        const identity = isIP(hostname) ? undefined : tls.checkServerIdentity(hostname, certificate);
        const facts: CertificateFacts = {
          authorized: socket.authorized, authorizationError: socket.authorizationError ? String((socket.authorizationError as unknown as { code?: string }).code ?? socket.authorizationError) : null,
          identityError: identity ? String((identity as { code?: string }).code ?? "ERR_TLS_CERT_ALTNAME_INVALID") : null,
          validFrom: certificate.valid_from ? new Date(certificate.valid_from).toISOString() : null, validTo: certificate.valid_to ? new Date(certificate.valid_to).toISOString() : null,
        };
        const result = classifyCertificate(facts, observedAt, warningDays);
        done({ hostname, observedAt: observedAt.toISOString(), status: result.status, valid: result.valid, issuer: name(certificate.issuer), subject: name(certificate.subject), notBefore: facts.validFrom, expiresAt: facts.validTo, daysRemaining: result.daysRemaining, fingerprint: certificate.fingerprint256 ?? null, errorType: result.errorType, errorCode: result.errorCode });
      });
      socket.once("timeout", () => done(this.failure(hostname, observedAt, "TIMEOUT", "TIMEOUT")));
      socket.once("error", (error: NodeJS.ErrnoException) => {
        const code = String(error.code ?? "TLS_FAILURE");
        done(this.failure(hostname, observedAt, code === "SSRF_BLOCKED" ? "SSRF_BLOCKED" : ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH"].includes(code) ? "CONNECTION" : "TLS_FAILURE", code.slice(0, 60)));
      });
    });
  }

  /** Fallas de red no permiten afirmar nada sobre el certificado: estado UNKNOWN. Fallas de handshake: INVALID. */
  private failure(hostname: string, observedAt: Date, errorType: SslErrorType, errorCode: string): CertificateObservation {
    const status: SslStatus = errorType === "TLS_FAILURE" ? "INVALID" : "UNKNOWN";
    return { hostname, observedAt: observedAt.toISOString(), status, valid: errorType === "TLS_FAILURE" ? false : null, issuer: null, subject: null, notBefore: null, expiresAt: null, daysRemaining: null, fingerprint: null, errorType, errorCode };
  }
}

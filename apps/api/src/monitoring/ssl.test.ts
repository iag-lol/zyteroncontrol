import tls from "node:tls";
import { describe, expect, it } from "vitest";
import { CertificateProbe, classifyCertificate, sslAlertThreshold } from "./certificate-probe.js";
import { actors, createKit, ids } from "./monitoring.test-kit.js";

const now = new Date("2026-10-01T19:00:00.000Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();
const facts = (patch: Partial<Parameters<typeof classifyCertificate>[0]> = {}) => ({ authorized: true, authorizationError: null, identityError: null, validFrom: days(-60), validTo: days(200), ...patch });

describe("Certificate Control · clasificación", () => {
  it("válido", () => { expect(classifyCertificate(facts(), now, 30)).toMatchObject({ status: "HEALTHY", valid: true, daysRemaining: 200 }); });
  it("próximo a vencer", () => { expect(classifyCertificate(facts({ validTo: days(12) }), now, 30)).toMatchObject({ status: "EXPIRING_SOON", daysRemaining: 12 }); });
  it("vencido por fecha o por error TLS", () => {
    expect(classifyCertificate(facts({ validTo: days(-1) }), now, 30)).toMatchObject({ status: "EXPIRED", errorType: "EXPIRED" });
    expect(classifyCertificate(facts({ authorized: false, authorizationError: "CERT_HAS_EXPIRED" }), now, 30)).toMatchObject({ status: "EXPIRED" });
  });
  it("hostname mismatch", () => { expect(classifyCertificate(facts({ identityError: "ERR_TLS_CERT_ALTNAME_INVALID" }), now, 30)).toMatchObject({ status: "INVALID", errorType: "HOSTNAME_MISMATCH" }); });
  it("autofirmado y no confiable", () => {
    expect(classifyCertificate(facts({ authorized: false, authorizationError: "DEPTH_ZERO_SELF_SIGNED_CERT" }), now, 30)).toMatchObject({ status: "INVALID", errorType: "SELF_SIGNED" });
    expect(classifyCertificate(facts({ authorized: false, authorizationError: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" }), now, 30)).toMatchObject({ status: "INVALID", errorType: "UNTRUSTED" });
  });
  it("todavía no válido", () => { expect(classifyCertificate(facts({ validFrom: days(2) }), now, 30)).toMatchObject({ status: "INVALID", errorType: "NOT_YET_VALID" }); });
  it("hostname mismatch real usando la verificación de identidad de Node", () => {
    const certificate = { subject: { CN: "otro-dominio.cl" }, subjectaltname: "DNS:otro-dominio.cl" } as unknown as tls.PeerCertificate;
    expect(tls.checkServerIdentity("www.zyteron.cl", certificate)).toBeInstanceOf(Error);
    expect(tls.checkServerIdentity("otro-dominio.cl", certificate)).toBeUndefined();
  });
  it("umbrales de alerta: sólo el más urgente alcanzado", () => {
    const thresholds = [90, 60, 30, 15, 7, 3, 1];
    expect(sslAlertThreshold(200, thresholds)).toBeNull();
    expect(sslAlertThreshold(89, thresholds)).toBe(90);
    expect(sslAlertThreshold(29, thresholds)).toBe(30);
    expect(sslAlertThreshold(2, thresholds)).toBe(3);
    expect(sslAlertThreshold(-1, thresholds)).toBeNull();
  });
  it("http no aplica y destinos privados quedan bloqueados", async () => {
    const probe = new CertificateProbe();
    expect((await probe.probe("http://www.zyteron.cl", 30)).status).toBe("NOT_APPLICABLE");
    expect(await probe.probe("https://169.254.169.254", 30)).toMatchObject({ status: "UNKNOWN", errorType: "SSRF_BLOCKED" });
  });
});

describe("Certificate Control · alertas sin duplicados", () => {
  it("emite SSL_EXPIRING una vez por umbral y SSL_EXPIRED al vencer", async () => {
    const kit = await createKit();
    const monitor = await kit.service.createMonitor(actors.jefe, { projectId: kit.projectA.id, name: "Web", url: "https://www.zyteron.cl", responsibleUserId: ids.dev });
    const observe = async (daysRemaining: number, status: "HEALTHY" | "EXPIRING_SOON" | "EXPIRED") => {
      kit.probe.next = { hostname: "www.zyteron.cl", observedAt: new Date().toISOString(), status, valid: status !== "EXPIRED", issuer: "R11 · Let's Encrypt", subject: "www.zyteron.cl", notBefore: null, expiresAt: "2026-10-30T00:00:00.000Z", daysRemaining, fingerprint: "AA", errorType: status === "EXPIRED" ? "EXPIRED" : null, errorCode: null };
      await kit.store.updateMonitor(monitor.id, {});
      (kit.store as unknown as { monitors: Map<string, { sslNextCheckAt: string }> }).monitors.get(monitor.id)!.sslNextCheckAt = new Date(0).toISOString();
      await kit.runner.probeCertificates(5);
    };
    await observe(29, "EXPIRING_SOON");
    await observe(28, "EXPIRING_SOON");
    let alerts = await kit.store.listAlertsFor(ids.dev, "PROGRAMADOR", 20, null);
    expect(alerts.filter((alert) => alert.eventType === "SSL_EXPIRING")).toHaveLength(1);
    await observe(14, "EXPIRING_SOON");
    alerts = await kit.store.listAlertsFor(ids.dev, "PROGRAMADOR", 20, null);
    expect(alerts.filter((alert) => alert.eventType === "SSL_EXPIRING")).toHaveLength(2);
    await observe(-1, "EXPIRED");
    await observe(-2, "EXPIRED");
    alerts = await kit.store.listAlertsFor(ids.dev, "PROGRAMADOR", 20, null);
    expect(alerts.filter((alert) => alert.eventType === "SSL_EXPIRED")).toHaveLength(1);
    const ssl = await kit.service.ssl(actors.jefe);
    expect(ssl.monitors[0]!.ssl.status).toBe("EXPIRED");
    expect((await kit.service.history(actors.jefe, { eventType: "SSL_EXPIRING" })).total).toBe(2);
  });
});

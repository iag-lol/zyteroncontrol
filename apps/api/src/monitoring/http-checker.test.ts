import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HostConcurrencyLimiter, HttpChecker, type HttpCheckRequest } from "./http-checker.js";
import { MONITOR_USER_AGENT, publicAddressPolicy } from "./ssrf-guard.js";

describe("Ejecutor HTTP del monitor", () => {
  let server: http.Server; let port = 0;
  const seen: http.IncomingHttpHeaders[] = [];
  let streamedBytes = 0;
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      seen.push(req.headers);
      switch (req.url) {
        case "/ok": return void res.writeHead(200, { "content-type": "text/html" }).end("<html><title>Zyteron</title></html>");
        case "/error": return void res.writeHead(500).end("boom");
        case "/slow": return void setTimeout(() => res.writeHead(200).end("tarde"), 1500);
        case "/redirect": return void res.writeHead(301, { location: "/ok" }).end();
        case "/loop-a": return void res.writeHead(302, { location: "/loop-b" }).end();
        case "/loop-b": return void res.writeHead(302, { location: "/loop-a" }).end();
        case "/chain-1": return void res.writeHead(302, { location: "/chain-2" }).end();
        case "/chain-2": return void res.writeHead(302, { location: "/chain-3" }).end();
        case "/chain-3": return void res.writeHead(302, { location: "/ok" }).end();
        case "/huge": {
          res.writeHead(200, { "content-type": "text/plain" });
          const chunk = Buffer.alloc(64 * 1024, "a");
          const pump = () => { while (streamedBytes < 50 * 1024 * 1024) { streamedBytes += chunk.length; if (!res.write(chunk)) return void res.once("drain", pump); } res.end(); };
          res.on("close", () => undefined);
          return pump();
        }
        default: return void res.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }));

  const checker = (resolver = async () => [{ address: "127.0.0.1", family: 4 }]) => new HttpChecker({ resolver, addressPolicy: (ip) => ip === "127.0.0.1" || publicAddressPolicy(ip), allowedPorts: [port] });
  const request = (path: string, patch: Partial<HttpCheckRequest> = {}): HttpCheckRequest => ({ url: `http://site.test:${port}${path}`, method: "GET", timeoutMs: 3000, expectedStatusMin: 200, expectedStatusMax: 299, expectedContent: null, followRedirects: true, maxRedirects: 3, contentInspectBytes: 4096, ...patch });

  it("200 → online con latencia medida y User-Agent identificable", async () => {
    const result = await checker().check(request("/ok"));
    expect(result).toMatchObject({ success: true, statusCode: 200, errorType: null, redirectCount: 0 });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    const headers = seen.at(-1)!;
    expect(headers["user-agent"]).toBe(MONITOR_USER_AGENT);
    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
  });
  it("500 → falla HTTP_STATUS", async () => { expect(await checker().check(request("/error"))).toMatchObject({ success: false, statusCode: 500, errorType: "HTTP_STATUS" }); });
  it("timeout real con AbortController", async () => {
    const started = Date.now();
    const result = await checker().check(request("/slow", { timeoutMs: 1000 }));
    expect(result).toMatchObject({ success: false, errorType: "TIMEOUT" });
    expect(Date.now() - started).toBeLessThan(1400);
  });
  it("error DNS", async () => {
    const result = await checker(async () => { throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }); }).check(request("/ok"));
    expect(result).toMatchObject({ success: false, errorType: "DNS", errorCode: "ENOTFOUND" });
    expect(result.errorMessage).not.toMatch(/127\.0\.0\.1/);
  });
  it("conexión rechazada", async () => {
    const closed = http.createServer(); await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve)); const closedPort = (closed.address() as AddressInfo).port; await new Promise<void>((resolve) => closed.close(() => resolve()));
    const result = await new HttpChecker({ resolver: async () => [{ address: "127.0.0.1", family: 4 }], addressPolicy: (ip) => ip === "127.0.0.1", allowedPorts: [closedPort] }).check({ ...request("/ok"), url: `http://site.test:${closedPort}/ok` });
    expect(result.errorType).toBe("CONNECTION");
  });
  it("sigue redirects y los cuenta", async () => { expect(await checker().check(request("/redirect"))).toMatchObject({ success: true, statusCode: 200, redirectCount: 1 }); });
  it("detecta loop de redirects", async () => { expect(await checker().check(request("/loop-a", { maxRedirects: 5 }))).toMatchObject({ success: false, errorType: "REDIRECT_LOOP" }); });
  it("respeta el máximo de redirects", async () => { expect(await checker().check(request("/chain-1", { maxRedirects: 2 }))).toMatchObject({ success: false, errorType: "REDIRECT_LIMIT" }); });
  it("sin follow, un 301 se evalúa contra el rango esperado", async () => { expect(await checker().check(request("/redirect", { followRedirects: false }))).toMatchObject({ success: false, statusCode: 301, errorType: "HTTP_STATUS" }); });
  it("content check: contenido presente", async () => { expect(await checker().check(request("/ok", { expectedContent: "Zyteron" }))).toMatchObject({ success: true, contentMatched: true }); });
  it("content check: contenido ausente", async () => { expect(await checker().check(request("/ok", { expectedContent: "Inexistente" }))).toMatchObject({ success: false, errorType: "CONTENT_MISMATCH", contentMatched: false }); });
  it("no descarga respuestas gigantes: inspecciona sólo el límite configurado", async () => {
    streamedBytes = 0;
    const result = await checker().check(request("/huge", { expectedContent: "no-aparece", contentInspectBytes: 8192 }));
    expect(result.errorType).toBe("CONTENT_MISMATCH");
    expect(streamedBytes).toBeLessThan(10 * 1024 * 1024);
  });
  it("HEAD no lee cuerpo", async () => { expect(await checker().check(request("/ok", { method: "HEAD" }))).toMatchObject({ success: true, statusCode: 200, contentMatched: null }); });
  it("limita concurrencia por host", async () => {
    const limiter = new HostConcurrencyLimiter(2); let peak = 0, current = 0;
    await Promise.all(Array.from({ length: 6 }, () => limiter.run("site.test", async () => { current++; peak = Math.max(peak, current); await new Promise((resolve) => setTimeout(resolve, 20)); current--; })));
    expect(peak).toBe(2);
  });
});

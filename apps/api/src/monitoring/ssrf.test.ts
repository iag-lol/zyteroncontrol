import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HttpChecker } from "./http-checker.js";
import { assertMonitorTarget, createSafeLookup, isBlockedAddress, parseMonitorUrl, publicAddressPolicy, redactUrl, SsrfError, type Resolver } from "./ssrf-guard.js";

const publicResolver: Resolver = async (host) => host === "www.zyteron.cl" ? [{ address: "104.21.10.10", family: 4 }] : [{ address: "93.184.216.34", family: 4 }];
const code = (fn: () => unknown) => { try { fn(); } catch (error) { return error instanceof SsrfError ? error.code : "OTHER"; } return "ALLOWED"; };

describe("SSRF · política de URL", () => {
  it.each([
    ["http://localhost/", "HOST_NOT_ALLOWED"], ["http://app.localhost/", "HOST_NOT_ALLOWED"], ["http://127.0.0.1/", "PRIVATE_ADDRESS"], ["http://[::1]/", "PRIVATE_ADDRESS"],
    ["http://10.1.2.3/", "PRIVATE_ADDRESS"], ["http://172.16.0.5/", "PRIVATE_ADDRESS"], ["http://172.31.255.255/", "PRIVATE_ADDRESS"], ["http://192.168.1.1/", "PRIVATE_ADDRESS"],
    ["http://169.254.169.254/latest/meta-data/", "PRIVATE_ADDRESS"], ["http://metadata.google.internal/", "HOST_NOT_ALLOWED"], ["http://100.64.0.1/", "PRIVATE_ADDRESS"],
    ["http://0.0.0.0/", "PRIVATE_ADDRESS"], ["http://2130706433/", "PRIVATE_ADDRESS"], ["http://0x7f000001/", "PRIVATE_ADDRESS"], ["http://[::ffff:127.0.0.1]/", "PRIVATE_ADDRESS"],
    ["http://[fd00::1]/", "PRIVATE_ADDRESS"], ["http://[fe80::1]/", "PRIVATE_ADDRESS"], ["http://intranet/", "HOST_NOT_ALLOWED"], ["http://db.internal/", "HOST_NOT_ALLOWED"],
    ["file:///etc/passwd", "PROTOCOL_NOT_ALLOWED"], ["ftp://example.com/", "PROTOCOL_NOT_ALLOWED"], ["gopher://example.com/", "PROTOCOL_NOT_ALLOWED"], ["data:text/html,hola", "PROTOCOL_NOT_ALLOWED"],
    ["javascript:alert(1)", "PROTOCOL_NOT_ALLOWED"], ["https://user:secret@www.zyteron.cl/", "CREDENTIALS_NOT_ALLOWED"], ["https://www.zyteron.cl:22/", "PORT_NOT_ALLOWED"], ["no es url", "INVALID_URL"],
  ])("bloquea %s", (url, expected) => { expect(code(() => parseMonitorUrl(url))).toBe(expected); });

  it("permite destinos públicos http/https en puertos estándar", () => {
    expect(code(() => parseMonitorUrl("https://www.zyteron.cl"))).toBe("ALLOWED");
    expect(code(() => parseMonitorUrl("http://example.org:8080/health"))).toBe("ALLOWED");
  });

  it("clasifica rangos privados, reservados y de metadata", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.0.1", "169.254.169.254", "::1", "::ffff:10.0.0.1", "64:ff9b::a00:1", "fc00::1", "224.0.0.1", "198.18.0.1"]) expect(isBlockedAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "104.21.10.10", "2606:4700::1111"]) expect(isBlockedAddress(ip), ip).toBe(false);
  });

  it("valida DNS: rechaza dominios que resuelven a IP privada (DNS rebinding / respuestas mixtas)", async () => {
    await expect(assertMonitorTarget("https://rebind.example", async () => [{ address: "10.0.0.8", family: 4 }])).rejects.toMatchObject({ code: "PRIVATE_ADDRESS" });
    await expect(assertMonitorTarget("https://mixed.example", async () => [{ address: "93.184.216.34", family: 4 }, { address: "127.0.0.1", family: 4 }])).rejects.toMatchObject({ code: "PRIVATE_ADDRESS" });
    await expect(assertMonitorTarget("https://nxdomain.example", async () => { throw Object.assign(new Error("x"), { code: "ENOTFOUND" }); })).rejects.toMatchObject({ code: "DNS_FAILURE" });
    await expect(assertMonitorTarget("https://www.zyteron.cl", publicResolver)).resolves.toBeInstanceOf(URL);
  });

  it("el lookup del socket revalida cada conexión y entrega sólo la IP validada", async () => {
    let calls = 0;
    const rebinding: Resolver = async () => (++calls === 1 ? [{ address: "93.184.216.34", family: 4 }] : [{ address: "169.254.169.254", family: 4 }]);
    const lookup = createSafeLookup(rebinding, publicAddressPolicy);
    const resolveOnce = () => new Promise<{ error: Error | null; address: unknown }>((done) => lookup("victim.example", {}, (error, address) => done({ error, address })));
    expect((await resolveOnce()).address).toBe("93.184.216.34");
    const second = await resolveOnce();
    expect(second.error).toBeInstanceOf(SsrfError);
  });

  it("no guarda query string ni credenciales en evidencia", () => { expect(redactUrl("https://u:p@www.zyteron.cl/a?token=secreto#x")).toBe("https://www.zyteron.cl/a"); });
});

describe("SSRF · redirecciones y ejecución real", () => {
  let server: http.Server; let port = 0;
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/to-private") { res.writeHead(302, { location: "http://10.0.0.5/admin" }); return res.end(); }
      if (req.url === "/to-metadata") { res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" }); return res.end(); }
      if (req.url === "/to-internal-dns") { res.writeHead(302, { location: `http://internal.test:${port}/ok` }); return res.end(); }
      if (req.url === "/to-file") { res.writeHead(302, { location: "file:///etc/passwd" }); return res.end(); }
      if (req.url === "/to-localhost") { res.writeHead(302, { location: `http://localhost:${port}/ok` }); return res.end(); }
      res.writeHead(200).end("ok");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  // Sólo el servidor de prueba se admite; todo otro destino privado sigue bloqueado.
  const checker = () => new HttpChecker({ resolver: async (host) => host === "public.test" ? [{ address: "127.0.0.1", family: 4 }] : host === "internal.test" ? [{ address: "192.168.1.10", family: 4 }] : [], addressPolicy: (ip) => ip === "127.0.0.1" || publicAddressPolicy(ip), allowedPorts: [port] });
  const run = (path: string) => checker().check({ url: `http://public.test:${port}${path}`, method: "GET", timeoutMs: 3000, expectedStatusMin: 200, expectedStatusMax: 299, expectedContent: null, followRedirects: true, maxRedirects: 3, contentInspectBytes: 1024 });

  it.each(["/to-private", "/to-metadata", "/to-internal-dns", "/to-localhost"])("bloquea redirect hacia destino privado (%s)", async (path) => {
    const result = await run(path);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("SSRF_BLOCKED");
  });
  it("bloquea redirect hacia file://", async () => { const result = await run("/to-file"); expect(result.errorType).toBe("SSRF_BLOCKED"); });
  it("con la política de producción ni siquiera el servidor local es alcanzable", async () => {
    const result = await new HttpChecker({ resolver: async () => [{ address: "127.0.0.1", family: 4 }], allowedPorts: [port] }).check({ url: `http://public.test:${port}/`, method: "GET", timeoutMs: 2000, expectedStatusMin: 200, expectedStatusMax: 299, expectedContent: null, followRedirects: false, maxRedirects: 0, contentInspectBytes: 1024 });
    expect(result.errorType).toBe("SSRF_BLOCKED");
  });
});

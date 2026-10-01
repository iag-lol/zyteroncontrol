import { lookup as dnsLookup } from "node:dns";
import { BlockList, isIP } from "node:net";

// Defensa SSRF del monitor: sólo http/https, puertos acotados, sin credenciales embebidas y ningún destino
// privado, reservado o de metadata. La resolución DNS se valida en el mismo lookup que usa el socket, por lo
// que un DNS rebinding no puede cambiar la IP entre la validación y la conexión.

export type SsrfCode = "INVALID_URL" | "PROTOCOL_NOT_ALLOWED" | "CREDENTIALS_NOT_ALLOWED" | "PORT_NOT_ALLOWED" | "HOST_NOT_ALLOWED" | "PRIVATE_ADDRESS" | "DNS_FAILURE";

export class SsrfError extends Error {
  constructor(readonly code: SsrfCode, message: string) { super(message); this.name = "SsrfError"; }
}

export const DEFAULT_ALLOWED_PORTS = [80, 443, 8080, 8443];
export const MONITOR_USER_AGENT = "ZyteronMonitor/1.0 (+https://www.zyteron.cl)";

const blockedV4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4], ["255.255.255.255", 32],
] as const) blockedV4.addSubnet(network, prefix, "ipv4");

const blockedV6 = new BlockList();
for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["100::", 64], ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
] as const) blockedV6.addSubnet(network, prefix, "ipv6");

const blockedHostnames = new Set(["localhost", "metadata", "metadata.google.internal", "instance-data", "instance-data.ec2.internal", "kubernetes", "kubernetes.default", "host.docker.internal"]);
const blockedSuffixes = [".localhost", ".local", ".localdomain", ".internal", ".intranet", ".lan", ".home.arpa", ".svc", ".cluster.local", ".corp"];

function embeddedIpv4(address: string): string | null {
  const lower = address.toLowerCase();
  const dotted = /^(?:::ffff:|::ffff:0:|64:ff9b::|::)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower);
  if (dotted) return dotted[1]!;
  const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (hex) { const high = parseInt(hex[1]!, 16), low = parseInt(hex[2]!, 16); return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`; }
  return null;
}

/** true cuando la IP es privada, reservada, loopback, link-local (metadata) o multicast. */
export function isBlockedAddress(address: string): boolean {
  const clean = address.replace(/^\[|\]$/g, "").split("%")[0]!;
  const family = isIP(clean);
  if (family === 4) return blockedV4.check(clean, "ipv4");
  if (family === 6) {
    const mapped = embeddedIpv4(clean);
    // IPv4 embebida (mapeada, NAT64 o compatible): se evalúa con las reglas IPv4.
    if (mapped) return isIP(mapped) !== 4 || blockedV4.check(mapped, "ipv4");
    return blockedV6.check(clean, "ipv6");
  }
  return true;
}

function hostnameBlocked(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (blockedHostnames.has(host) || blockedSuffixes.some((suffix) => host.endsWith(suffix))) return true;
  // Nombres de una sola etiqueta se resuelven contra dominios de búsqueda internos.
  return !host.includes(".") && isIP(host) === 0;
}

/** Valida estructura y política de la URL. No resuelve DNS. */
export function parseMonitorUrl(raw: string, allowedPorts = DEFAULT_ALLOWED_PORTS): URL {
  let url: URL;
  try { url = new URL(String(raw).trim()); } catch { throw new SsrfError("INVALID_URL", "La URL no es válida."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SsrfError("PROTOCOL_NOT_ALLOWED", "Sólo se permiten URLs http:// o https://.");
  if (url.username || url.password) throw new SsrfError("CREDENTIALS_NOT_ALLOWED", "La URL no puede incluir credenciales.");
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  if (!allowedPorts.includes(port)) throw new SsrfError("PORT_NOT_ALLOWED", `Puerto ${port} no permitido para monitoreo.`);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!hostname || hostnameBlocked(hostname)) throw new SsrfError("HOST_NOT_ALLOWED", "El host apunta a un destino interno no permitido.");
  if (isIP(hostname) && isBlockedAddress(hostname)) throw new SsrfError("PRIVATE_ADDRESS", "La dirección IP es privada o reservada.");
  if (url.toString().length > 2048) throw new SsrfError("INVALID_URL", "La URL excede el largo permitido.");
  return url;
}

export interface ResolvedAddress { address: string; family: number }
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;
export type AddressPolicy = (address: string) => boolean;

export const systemResolver: Resolver = (hostname) => new Promise((resolve, reject) => {
  dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => error ? reject(error) : resolve(addresses));
});
export const publicAddressPolicy: AddressPolicy = (address) => !isBlockedAddress(address);

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | ResolvedAddress[], family?: number) => void;

/**
 * lookup compatible con net/http/tls. Resuelve, rechaza si CUALQUIER respuesta es privada (evita respuestas
 * mixtas) y entrega al socket exactamente la IP validada.
 */
export function createSafeLookup(resolver: Resolver = systemResolver, policy: AddressPolicy = publicAddressPolicy) {
  return (hostname: string, options: { all?: boolean; family?: number } | number | LookupCallback, maybeCallback?: LookupCallback) => {
    const callback = (typeof options === "function" ? options : maybeCallback) as LookupCallback;
    const opts = typeof options === "object" && options ? options : {};
    const literal = isIP(hostname.replace(/^\[|\]$/g, ""));
    const resolution: Promise<ResolvedAddress[]> = literal ? Promise.resolve([{ address: hostname.replace(/^\[|\]$/g, ""), family: literal }]) : resolver(hostname);
    resolution.then((addresses) => {
      if (!addresses.length) { const error = Object.assign(new Error("Sin respuestas DNS"), { code: "ENOTFOUND" }); return callback(error, ""); }
      const blocked = addresses.find((entry) => !policy(entry.address));
      if (blocked) return callback(Object.assign(new SsrfError("PRIVATE_ADDRESS", "El destino resuelve a una dirección privada o reservada."), { code: "SSRF_BLOCKED" }) as NodeJS.ErrnoException, "");
      const usable = opts.family ? addresses.filter((entry) => entry.family === opts.family) : addresses;
      const chosen = usable.length ? usable : addresses;
      if (opts.all) return callback(null, chosen);
      return callback(null, chosen[0]!.address, chosen[0]!.family);
    }, (error: NodeJS.ErrnoException) => callback(error, ""));
  };
}

/** Validación completa previa al registro: estructura + DNS público. */
export async function assertMonitorTarget(raw: string, resolver: Resolver = systemResolver, policy: AddressPolicy = publicAddressPolicy, allowedPorts = DEFAULT_ALLOWED_PORTS) {
  const url = parseMonitorUrl(raw, allowedPorts);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) { if (!policy(hostname)) throw new SsrfError("PRIVATE_ADDRESS", "La dirección IP es privada o reservada."); return url; }
  let addresses: ResolvedAddress[];
  try { addresses = await resolver(hostname); } catch { throw new SsrfError("DNS_FAILURE", "El dominio no resuelve en DNS público."); }
  if (!addresses.length) throw new SsrfError("DNS_FAILURE", "El dominio no resuelve en DNS público.");
  if (addresses.some((entry) => !policy(entry.address))) throw new SsrfError("PRIVATE_ADDRESS", "El dominio resuelve a una dirección privada o reservada.");
  return url;
}

export function configuredAllowedPorts() {
  const raw = process.env.MONITORING_ALLOWED_PORTS?.split(",").map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0 && value < 65536);
  return raw?.length ? raw : DEFAULT_ALLOWED_PORTS;
}

/** Elimina query, fragmento y credenciales antes de registrar una URL en evidencia o logs. */
export function redactUrl(raw: string) {
  try { const url = new URL(raw); return `${url.protocol}//${url.host}${url.pathname}`; } catch { return "URL inválida"; }
}

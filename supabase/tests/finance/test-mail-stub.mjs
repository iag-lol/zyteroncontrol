// SÓLO PRUEBAS E2E: intercepta llamadas a api.resend.com para poder llevar una cotización a «aceptada» en modo memoria.
// Nunca se carga en la aplicación; se usa con `node --import ./test-mail-stub.mjs dist/main.js`.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith("https://api.resend.com/")) return new Response(JSON.stringify({ id: `stub-${Date.now()}` }), { status: 200, headers: { "content-type": "application/json" } });
  return realFetch(input, init);
};

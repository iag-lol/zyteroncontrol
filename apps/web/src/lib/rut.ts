export function normalizeRut(value: string) {
  const compact = value.replace(/[^0-9kK]/g, "").toUpperCase();
  return compact.length > 1 ? `${compact.slice(0, -1)}-${compact.slice(-1)}` : compact;
}
export function isValidRut(value: string) {
  const [body = "", verifier = ""] = normalizeRut(value).split("-");
  if (!/^\d{7,8}$/.test(body) || !/^[0-9K]$/.test(verifier)) return false;
  let sum = 0; let factor = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) { sum += Number(body[index]) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const result = 11 - (sum % 11);
  return verifier === (result === 11 ? "0" : result === 10 ? "K" : String(result));
}


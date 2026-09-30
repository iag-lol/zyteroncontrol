export function normalizeRut(value: string) {
  const compact = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (compact.length < 2) return compact;
  return `${compact.slice(0, -1)}-${compact.slice(-1)}`;
}

export function isValidChileanRut(value: string) {
  const normalized = normalizeRut(value);
  const [body = "", verifier = ""] = normalized.split("-");
  if (!/^\d{7,8}$/.test(body) || !/^[0-9K]$/.test(verifier)) return false;
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? "0" : result === 10 ? "K" : String(result);
  return verifier === expected;
}


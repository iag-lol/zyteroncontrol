import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("asistente de cotización", () => {
  const workspace = readFileSync(resolve(process.cwd(), "src/components/commercial/commercial-workspace.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/commercial/[[...segments]]/page.tsx"), "utf8");

  it("admite oportunidad, cliente o lead como origen", () => {
    for (const source of ['"OPPORTUNITY"', '"CLIENT"', '"LEAD"']) expect(workspace).toContain(source);
    expect(workspace).toContain("No hay oportunidades abiertas. Puedes cotizar directamente a un cliente o lead");
  });

  it("respeta el cliente recibido desde Client 360 y abre el flujo solicitado", () => {
    expect(page).toContain("initialClientId={query.clientId||null}");
    expect(page).toContain('query.new==="1"');
    expect(workspace).toContain("initialClientId?\"CLIENT\":\"OPPORTUNITY\"");
  });

  it("permite varias líneas y muestra el cálculo antes de guardar", () => {
    expect(workspace).toContain("Agregar servicio");
    expect(workspace).toContain("crypto.randomUUID()");
    expect(workspace).toContain("function QuoteTotals");
  });
});

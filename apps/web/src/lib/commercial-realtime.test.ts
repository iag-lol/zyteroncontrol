import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Realtime privado Comercial", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/commercial-realtime.ts"), "utf8");
  it("usa canal privado y todos los agregados publicados", () => {
    expect(source).toContain('private:commercial:operations');
    expect(source).toContain("private: true");
    for (const table of ["leads", "opportunities", "follow_ups", "quotes", "sales", "sales_handoffs"]) expect(source).toContain(`"${table}"`);
  });
});

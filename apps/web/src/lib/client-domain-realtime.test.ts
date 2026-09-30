import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Realtime privado de Client 360", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/clients-realtime.ts"), "utf8");

  it("utiliza un canal privado y filtra cada tabla por client_id", () => {
    expect(source).toContain("private:client:${clientId}");
    expect(source).toContain("private: true");
    for (const table of ["client_contacts", "client_contracts", "client_services", "client_renewals"]) {
      expect(source).toContain(`table: "${table}"`);
    }
    expect(source.match(/filter: `client_id=eq\.\$\{clientId\}`/g)).toHaveLength(5);
  });
});

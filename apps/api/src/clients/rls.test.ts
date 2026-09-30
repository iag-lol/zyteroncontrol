import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migración Client 360", () => {
  const sql = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20260930070000_client_360.sql"), "utf8");
  it("habilita RLS y deny-by-default en las tablas centrales", () => {
    expect(sql).toContain("alter table public.clients enable row level security");
    expect(sql).toContain("alter table public.client_contacts enable row level security");
    expect(sql).toContain("clients_assigned_read");
    expect(sql).toContain("client_portal_own_client");
  });
  it("incluye restricciones, índices y outbox", () => {
    expect(sql).toContain("clients_rut_unique");
    expect(sql).toContain("clients_search_idx");
    expect(sql).toContain("business_event_outbox");
  });
});

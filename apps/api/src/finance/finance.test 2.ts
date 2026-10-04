import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migración Financial & Accounting", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "../../supabase/migrations/20261001150000_financial_accounting_center.sql"),
    "utf8",
  );

  it("reconcilia tax_documents antes de crear sus índices", () => {
    for (const column of [
      "invoice_id uuid",
      "document_type_code integer",
      "provider text",
      "environment text",
      "status text",
      "last_checked_at timestamptz",
      "xml_signed_sha256 text",
      "updated_at timestamptz",
    ]) {
      expect(sql).toContain(`add column if not exists ${column}`);
    }
    expect(sql).toContain("status=coalesce(status,'DRAFT')");
    expect(sql).toContain("tax_documents_status_check");
    expect(sql.indexOf("add column if not exists status text")).toBeLessThan(
      sql.indexOf("create unique index if not exists tax_documents_invoice_active"),
    );
    expect(sql.indexOf("add column if not exists last_checked_at")).toBeLessThan(
      sql.indexOf("create index if not exists tax_documents_status_idx"),
    );
  });
});

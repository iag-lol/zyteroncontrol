---
type: "query"
date: "2026-10-04T06:13:24.064794+00:00"
question: "Financial SQL falla con ERROR 42703 column status does not exist al crear tax_documents_invoice_active"
contributor: "graphify"
outcome: "useful"
source_nodes: ["20261001150000_financial_accounting_center.sql", "public.tax_documents", "tax_documents_invoice_active", "tax_documents_status_idx"]
---

# Q: Financial SQL falla con ERROR 42703 column status does not exist al crear tax_documents_invoice_active

## Answer

Expanded from original query via vocab: [financial, finance, tax, document, documents, invoice, status, migration, schema, index]. La tabla public.tax_documents ya existia con un esquema legacy y CREATE TABLE IF NOT EXISTS no agrego las columnas financieras. Se corrigio 20261001150000_financial_accounting_center.sql para reconciliar id, invoice_id, document_type_code, status, last_checked_at y todas las columnas DTE antes de indices, triggers, vistas y RLS. Se preservan filas legacy, se completan defaults nulos y se agregan FKs/checks NOT VALID para proteger escrituras nuevas sin rechazar datos antiguos. Validacion: 180 pruebas, lint y typecheck aprobados.

## Outcome

- Signal: useful

## Source Nodes

- 20261001150000_financial_accounting_center.sql
- public.tax_documents
- tax_documents_invoice_active
- tax_documents_status_idx
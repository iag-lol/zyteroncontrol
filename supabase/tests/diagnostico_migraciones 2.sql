-- Diagnóstico (SOLO LECTURA): qué migraciones de supabase/migrations están aplicadas en esta base.
-- Ejecutar en el SQL Editor de Supabase. Aplica luego, EN ORDEN, sólo las filas con aplicada = false.
-- Cada migración se detecta por una tabla que crea; no modifica nada.
select m.orden, m.archivo, to_regclass('public.' || m.tabla) is not null as aplicada, m.tabla as tabla_testigo
from (values
  (1,  '20260930070000_client_360.sql',                     'clients'),
  (2,  '20260930120000_complete_client_domain.sql',         'contract_type_catalog'),
  (3,  '20260930160000_commercial_sales_operations.sql',    'lead_sources'),
  (4,  '20261001010000_delivery_operations_center.sql',     'project_endpoints'),
  (5,  '20261001020000_development_operations_center.sql',  'developer_skills'),
  (6,  '20261001040000_quality_compliance_center.sql',      'audit_templates'),
  (7,  '20261001050000_site_reliability_monitoring.sql',    'monitors'),
  (8,  '20261001060000_service_desk_support_center.sql',    'support_ticket_types'),
  (9,  '20261001080000_document_control_center.sql',        'document_retention_policies'),
  (10, '20261001100000_people_operations_center.sql',       'employees'),
  (11, '20261001150000_financial_accounting_center.sql',    'finance_settings'),
  (12, '20261004010000_security_control_plane.sql',         'security_settings')
) as m(orden, archivo, tabla)
order by m.orden;

-- Si usaste la CLI de Supabase, también puedes ver el historial registrado:
-- select version, name from supabase_migrations.schema_migrations order by version;

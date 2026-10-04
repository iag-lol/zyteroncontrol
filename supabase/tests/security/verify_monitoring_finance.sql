-- Verificación de seguridad de los módulos 05 (Monitoreo) y 07 (Finanzas y Contabilidad).
-- SOLO LECTURA: no modifica datos. La prueba funcional final corre dentro de una transacción que se revierte.
-- Ejecutar en el SQL Editor de Supabase (rol postgres) DESPUÉS de aplicar 01 y 02.
-- Resultado esperado: cada consulta de "hallazgos" devuelve 0 filas.

-- 1. Tablas de los módulos SIN Row Level Security (esperado: 0 filas)
with modulos(tabla) as (values
  ('monitoring_settings'),('monitor_severity_rules'),('monitor_alert_rules'),('monitors'),('monitor_checks'),('monitor_hourly_rollups'),('monitor_daily_rollups'),('ssl_observations'),('incidents'),('incident_events'),('incident_links'),('maintenance_windows'),('monitoring_events'),('alert_delivery_events'),('monitoring_worker_heartbeats'),('monitoring_status_pages'),
  ('finance_settings'),('chart_of_accounts'),('cost_centers'),('accounting_periods'),('journal_entries'),('journal_entry_lines'),('accounting_rules'),('accounting_rule_versions'),('accounting_events'),('tax_rules'),('tax_rule_versions'),('tax_document_types'),('billing_schedules'),('invoices'),('invoice_lines'),('billing_schedule_runs'),('dte_certificates'),('tax_folio_authorizations'),('tax_folios'),('tax_documents'),('tax_document_events'),('received_tax_documents'),('rcv_imports'),('rcv_entries'),('vendors'),('expense_categories'),('approval_policies'),('approval_requests'),('expenses'),('payables'),('bank_accounts'),('vendor_payments'),('vendor_payment_allocations'),('cash_accounts'),('cash_movements'),('payments'),('payment_allocations'),('payment_refunds'),('payment_provider_events'),('payment_links'),('collection_activities'),('payment_promises'),('collection_reminder_rules'),('collection_reminders'),('bank_statement_imports'),('bank_transactions'),('reconciliation_matches'),('budgets'),('budget_lines'),('commission_finance_policies'),('commission_payments'),('cost_rates'),('scheduled_costs'),('forecast_scenarios'),('close_checklist_items'),('period_close_runs'),('period_close_tasks'),('period_snapshots'),('tax_obligations'),('f29_preparations'),('finance_events'),('finance_notifications'),('finance_audit_events'),('finance_idempotency_keys'),('finance_analysis_runs'))
select m.tabla as hallazgo_tabla_sin_rls
from modulos m left join pg_class c on c.relname=m.tabla and c.relnamespace='public'::regnamespace
where c.oid is null or not c.relrowsecurity;

-- 2. Políticas que permiten ESCRIBIR desde el cliente (anon/authenticated) en tablas de los módulos (esperado: 0 filas).
--    Todas las escrituras pasan por la API con service_role; las políticas de los módulos son sólo SELECT.
select schemaname, tablename, policyname, cmd, roles as hallazgo_politica_de_escritura
from pg_policies
where schemaname='public' and cmd<>'SELECT'
  and (tablename like 'monitor%' or tablename like 'incident%' or tablename in('ssl_observations','maintenance_windows','alert_delivery_events')
       or tablename like 'finance_%' or tablename in('chart_of_accounts','cost_centers','accounting_periods','journal_entries','journal_entry_lines','accounting_rules','accounting_rule_versions','accounting_events','tax_rules','tax_rule_versions','invoices','invoice_lines','tax_documents','tax_folios','payments','payment_allocations','payment_links','bank_transactions','reconciliation_matches','vendors','expenses','payables','vendor_payments','period_snapshots'));

-- 3. Funciones de los módulos ejecutables por anon o authenticated (esperado: 0 filas). Sólo service_role debe ejecutarlas.
select p.oid::regprocedure as hallazgo_funcion_expuesta,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated
from pg_proc p
where p.pronamespace='public'::regnamespace
  and (p.proname like 'finance\_%' or p.proname like 'monitoring\_%' or p.proname in('next_invoice_number','next_payment_reference','next_expense_number','next_vendor_payment_number','next_incident_number'))
  and p.prokind='f'
  and pg_get_function_result(p.oid)<>'trigger'
  and p.proname not in('finance_no_delete','finance_append_only','finance_snapshot_guard')
  and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));

-- 4. Buckets de Finanzas públicos (esperado: 0 filas)
select id as hallazgo_bucket_publico from storage.buckets where id in('finance-documents','finance-secrets') and public;

-- 5. Triggers de integridad que deben existir (esperado: 0 filas faltantes)
with esperados(tabla, trigger_name) as (values
  ('journal_entries','journal_entries_guard'),('journal_entry_lines','journal_entry_lines_guard'),('invoices','invoices_guard'),('invoice_lines','invoice_lines_guard'),
  ('payments','payments_guard'),('payment_allocations','payment_allocations_guard'),('tax_folios','tax_folios_guard'),('tax_documents','tax_documents_guard'),
  ('tax_rule_versions','tax_rule_versions_guard'),('accounting_rule_versions','accounting_rule_versions_guard'),('finance_audit_events','finance_audit_events_append_only'),
  ('period_snapshots','period_snapshots_immutable'),('period_snapshots','period_snapshots_no_delete'),('reconciliation_matches','reconciliation_matches_no_delete'),
  ('bank_transactions','bank_transactions_no_delete'),('finance_events','finance_events_outbox'),('finance_events','finance_events_activity'))
select e.tabla, e.trigger_name as hallazgo_trigger_faltante
from esperados e left join pg_trigger t on t.tgname=e.trigger_name and t.tgrelid=('public.'||e.tabla)::regclass and not t.tgisinternal
where t.oid is null;

-- 6. Vistas de portal: no deben ser legibles por anon (esperado: 0 filas)
select c.relname as hallazgo_vista_portal_anon
from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='v'
  and c.relname in('finance_portal_invoices','finance_portal_payments','monitoring_portal_status','monitoring_portal_incidents','monitoring_portal_maintenance')
  and has_table_privilege('anon', c.oid, 'SELECT');

-- 7. Resumen informativo: permisos sembrados por rol para ambos módulos
select role, count(*) as permisos
from public.role_permissions
where permission_code like any(array['finance.%','invoice.%','dte.%','receivable.%','collection.%','payment.%','payable.%','expense.%','bank.%','accounting.%','journal.%','period.%','tax.%','report.finance.%','commission.finance.%','monitoring.%','monitor.%','endpoint.%','incident.%','ssl.%','maintenance.%','alert_rule.%'])
group by role order by role;

-- 8. Resumen informativo: tablas publicadas en Realtime (RLS se aplica también a Realtime)
select tablename from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public'
  and (tablename like 'monitor%' or tablename like 'incident%' or tablename in('maintenance_windows','alert_delivery_events','invoices','payments','payment_allocations','tax_documents','bank_transactions','journal_entries','finance_notifications','period_close_runs','received_tax_documents','expenses','payables','finance_events'))
order by 1;

-- 9. Prueba funcional de partida doble (se REVIERTE al final; no deja datos).
--    Debe imprimir: "OK: asiento descuadrado rechazado" y "OK: asiento contabilizado inmutable".
begin;
do $$
declare v_bank uuid; v_rev uuid; v_bad uuid; v_good uuid;
begin
  select id into v_bank from public.chart_of_accounts where code='1.1.02.01';
  select id into v_rev from public.chart_of_accounts where code='4.1.01';
  v_bad := public.finance_create_journal_entry(jsonb_build_object('entryDate',current_date,'description','Verificación descuadrada'),
           jsonb_build_array(jsonb_build_object('accountId',v_bank,'debit',100),jsonb_build_object('accountId',v_rev,'credit',90)));
  begin
    perform public.finance_post_journal_entry(v_bad,null);
    raise exception 'FALLA: se contabilizó un asiento descuadrado';
  exception when others then
    if sqlerrm like 'FINANCE_UNBALANCED%' then raise notice 'OK: asiento descuadrado rechazado (%)', sqlerrm; else raise; end if;
  end;
  v_good := public.finance_create_journal_entry(jsonb_build_object('entryDate',current_date,'description','Verificación cuadrada'),
            jsonb_build_array(jsonb_build_object('accountId',v_bank,'debit',100),jsonb_build_object('accountId',v_rev,'credit',100)));
  perform public.finance_post_journal_entry(v_good,null);
  begin
    update public.journal_entries set description='alterado' where id=v_good;
    raise exception 'FALLA: se editó un asiento contabilizado';
  exception when others then
    if sqlerrm like 'FINANCE_IMMUTABLE%' then raise notice 'OK: asiento contabilizado inmutable'; else raise; end if;
  end;
end $$;
rollback;

-- Verificación de seguridad del calendario de pagos de cotizaciones (migración 20261004120000_quote_payment_calendar.sql).
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de aplicar la migración. Las consultas 1–7 son de solo lectura;
-- la prueba 8 crea datos dentro de una transacción y la REVIERTE (no deja nada).

-- 1. RLS activa en ambas tablas (esperado: true, true).
select relname as tabla, relrowsecurity as rls_activa
from pg_class where oid in ('public.quote_payment_plans'::regclass,'public.quote_payment_installments'::regclass);

-- 2. Políticas: sólo lectura (SELECT) para authenticated; ninguna de escritura (las escrituras van por la API con service_role).
select tablename, policyname, cmd, roles
from pg_policies where schemaname='public' and tablename in('quote_payment_plans','quote_payment_installments')
order by tablename, policyname;

-- 3. Bucket privado de facturas (esperado: public=false, 10485760 bytes, PDF/XML).
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='quote-invoices';

-- 4. Política de Storage: sólo SELECT para el portal (su cliente, cuota pagada y visible).
select policyname, cmd, roles from pg_policies where schemaname='storage' and tablename='objects' and policyname='quote_invoices_portal_read';

-- 5. Procedimientos de generación/reprogramación: sin EXECUTE para anon/authenticated (esperado: false, false, true).
select p.proname as funcion,
  has_function_privilege('anon', p.oid, 'execute') as anon,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
  has_function_privilege('service_role', p.oid, 'execute') as service_role
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('quote_payment_materialize','quote_payment_reschedule');

-- 6. Funciones SECURITY DEFINER con search_path fijo (esperado: proconfig con search_path=public en todas).
select n.nspname||'.'||p.proname as funcion, p.prosecdef as security_definer, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proname in('quote_payment_materialize','quote_payment_reschedule','can_view_quote_payments','portal_quote_client','portal_invoice_visible')
order by 1;

-- 7. Vistas: la de estado efectivo respeta la RLS del que consulta; la del portal es security_barrier. Permisos RBAC sembrados.
select c.relname as vista, c.reloptions from pg_class c where c.relname in('quote_payment_installments_effective','portal_quote_payments');
select role, permission_code from public.role_permissions where permission_code like 'quote_payment.%' order by 1,2;

-- 8. Prueba funcional (se REVIERTE). Debe imprimir 4 avisos "OK: ...".
begin;
do $$
declare v_client uuid; v_quote uuid; v_plan uuid; v_item uuid; v_future uuid;
begin
  insert into public.clients(legal_name,rut) values('Verificación Pagos SpA','76.111.111-1') returning id into v_client;
  insert into public.quotes(company_name,client_id,status,total_amount) values('Verificación Pagos SpA',v_client,'ACCEPTED',119000) returning id into v_quote;
  insert into public.quote_payment_plans(quote_id,client_id,frequency,amount,start_date,payment_day,total_installments)
    values(v_quote,v_client,'MONTHLY',119000,date_trunc('month',public.quote_payment_today())::date,extract(day from public.quote_payment_today())::integer,3) returning id into v_plan;
  perform public.quote_payment_materialize(v_plan,public.quote_payment_today());
  select id into v_item from public.quote_payment_installments where plan_id=v_plan and sequence=1;
  select id into v_future from public.quote_payment_installments where plan_id=v_plan and sequence=3;
  begin
    update public.quote_payment_installments set status='PAID',paid_at=public.quote_payment_today(),paid_amount=amount,marked_paid_by=gen_random_uuid() where id=v_item;
    raise exception 'FALLA: se marcó pagada sin factura SII';
  exception when check_violation then raise notice 'OK: no se marca pagada sin factura SII adjunta'; end;
  begin
    update public.quote_payment_installments set status='PAID',paid_at=public.quote_payment_today(),paid_amount=amount,sii_document_type=33,sii_folio=999999001,
      invoice_storage_path='clients/x/quotes/x/v.pdf',invoice_sha256=repeat('a',64),marked_paid_by=gen_random_uuid() where id=v_future;
    raise exception 'FALLA: se pagó una cuota no habilitada';
  exception when others then if sqlerrm like 'QUOTE_PAYMENT_NOT_OPEN%' then raise notice 'OK: cuota futura sin opción de pago (%)', sqlerrm; else raise; end if; end;
  update public.quote_payment_installments set status='PAID',paid_at=public.quote_payment_today(),paid_amount=amount,sii_document_type=33,sii_folio=999999002,
    invoice_storage_path='clients/x/quotes/x/v2.pdf',invoice_sha256=repeat('b',64),marked_paid_by=gen_random_uuid() where id=v_item;
  begin
    update public.quote_payment_installments set paid_amount=1 where id=v_item;
    raise exception 'FALLA: se editó una cuota pagada';
  exception when others then if sqlerrm like 'QUOTE_PAYMENT_IMMUTABLE%' then raise notice 'OK: cuota pagada inmutable'; else raise; end if; end;
  begin
    delete from public.quote_payment_installments where id=v_item;
    raise exception 'FALLA: se eliminó una cuota';
  exception when others then if sqlerrm like 'QUOTE_PAYMENT_IMMUTABLE%' then raise notice 'OK: las cuotas no se eliminan'; else raise; end if; end;
end $$;
rollback;

-- Calendario de pagos de cotizaciones (pago único o mensual).
-- Cada cotización aceptada puede tener un plan; el plan genera una cuota por mes (o una sola).
-- La opción de pago se habilita N días antes del vencimiento y queda activa hasta marcarse como pagada.
-- Marcar como pagada exige la factura del SII (PDF/XML) en el bucket privado `quote-invoices`;
-- el cliente podrá verla en el futuro portal sólo si es suya y está pagada.
-- Escrituras sólo vía API (service_role). Re-ejecutable.
begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- ------------------------------------------------------------------------------------------- planes
create table if not exists public.quote_payment_plans(
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.quotes(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  frequency text not null default 'ONE_TIME' check(frequency in('ONE_TIME','MONTHLY')),
  amount numeric(16,2) not null check(amount>0),
  currency char(3) not null default 'CLP' check(currency in('CLP','UF','USD')),
  start_date date not null,
  payment_day integer not null check(payment_day between 1 and 31),
  activation_days_before integer not null default 5 check(activation_days_before between 0 and 27),
  total_installments integer check(total_installments is null or total_installments between 1 and 120),
  status text not null default 'ACTIVE' check(status in('ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  notes text,
  cancel_reason text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(frequency<>'ONE_TIME' or total_installments=1),
  check(status<>'CANCELLED' or nullif(trim(cancel_reason),'') is not null)
);

-- ------------------------------------------------------------------------------------------- cuotas
create table if not exists public.quote_payment_installments(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.quote_payment_plans(id) on delete restrict,
  quote_id uuid not null references public.quotes(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  sequence integer not null check(sequence>0),
  period_key text not null check(period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  due_date date not null,
  amount numeric(16,2) not null check(amount>0),
  currency char(3) not null check(currency in('CLP','UF','USD')),
  status text not null default 'SCHEDULED' check(status in('SCHEDULED','PAID','CANCELLED')),
  paid_at date,
  paid_amount numeric(16,2) check(paid_amount is null or paid_amount>0),
  payment_method text check(payment_method is null or payment_method in('TRANSFER','CARD','CASH','CHECK','OTHER')),
  payment_reference text,
  sii_document_type integer check(sii_document_type is null or sii_document_type in(33,34,39,41,56)),
  sii_folio bigint check(sii_folio is null or sii_folio>0),
  sii_issue_date date,
  invoice_storage_path text,
  invoice_sha256 text check(invoice_sha256 is null or invoice_sha256 ~ '^[0-9a-f]{64}$'),
  invoice_file_name text,
  invoice_mime text check(invoice_mime is null or invoice_mime in('application/pdf','application/xml','text/xml')),
  client_visible boolean not null default false,
  marked_paid_by uuid,
  marked_paid_at timestamptz,
  notes text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id,sequence),
  -- Pagada = con factura SII adjunta, folio, monto, fecha y responsable.
  check(status<>'PAID' or (paid_at is not null and paid_amount is not null and sii_document_type is not null and sii_folio is not null
        and invoice_storage_path is not null and invoice_sha256 is not null and marked_paid_by is not null)),
  check(status<>'CANCELLED' or nullif(trim(cancel_reason),'') is not null)
);
-- Una factura SII (tipo + folio) respalda una sola cuota.
create unique index if not exists quote_installments_sii_folio_unique on public.quote_payment_installments(sii_document_type,sii_folio) where status='PAID';
create index if not exists quote_installments_due_idx on public.quote_payment_installments(due_date) where status='SCHEDULED';
create index if not exists quote_installments_quote_idx on public.quote_payment_installments(quote_id,sequence);
create index if not exists quote_installments_client_idx on public.quote_payment_installments(client_id,due_date);
create index if not exists quote_payment_plans_status_idx on public.quote_payment_plans(status);

-- Fecha de vencimiento de la cuota N: día de pago del mes correspondiente (ajustado al último día del mes).
create or replace function public.quote_payment_due_date(p_start date,p_payment_day integer,p_sequence integer) returns date language sql immutable set search_path=public as $$
  select (date_trunc('month',p_start)+make_interval(months=>p_sequence-1))::date
       + (least(p_payment_day,extract(day from (date_trunc('month',p_start)+make_interval(months=>p_sequence)-interval '1 day'))::integer)-1)
$$;
create or replace function public.quote_payment_today() returns date language sql stable set search_path=public as $$
  select (now() at time zone 'America/Santiago')::date
$$;

-- Genera (idempotente) las cuotas hasta p_until; las de plazo fijo se generan completas.
create or replace function public.quote_payment_materialize(p_plan uuid,p_until date) returns integer language plpgsql security definer set search_path=public as $$
declare v public.quote_payment_plans%rowtype; n integer:=0; seq integer:=1; due date; last_seq integer;
begin
  select * into v from public.quote_payment_plans where id=p_plan for update;
  if not found then raise exception 'QUOTE_PAYMENT_NOT_FOUND'; end if;
  if v.status<>'ACTIVE' then return 0; end if;
  select coalesce(max(sequence),0) into last_seq from public.quote_payment_installments where plan_id=p_plan;
  loop
    exit when v.total_installments is not null and seq>v.total_installments;
    due:=case when v.frequency='ONE_TIME' then v.start_date else public.quote_payment_due_date(v.start_date,v.payment_day,seq) end;
    -- Plazo indefinido: hasta el horizonte, y siempre al menos la próxima cuota.
    exit when v.total_installments is null and seq>last_seq and due>p_until and seq>1;
    insert into public.quote_payment_installments(plan_id,quote_id,client_id,sequence,period_key,due_date,amount,currency)
    values(v.id,v.quote_id,v.client_id,seq,to_char(due,'YYYY-MM'),due,v.amount,v.currency)
    on conflict(plan_id,sequence) do nothing;
    if found then n:=n+1; end if;
    exit when v.frequency='ONE_TIME';
    seq:=seq+1;
    exit when seq>240;
  end loop;
  return n;
end $$;

-- Reprograma (atómico) las cuotas pendientes tras editar el plan: recalcula vencimiento, monto y moneda;
-- las que quedan fuera del nuevo plazo (o de un plan anulado) se anulan con motivo. Nunca toca cuotas pagadas.
create or replace function public.quote_payment_reschedule(p_plan uuid) returns integer language plpgsql security definer set search_path=public as $$
declare v public.quote_payment_plans%rowtype; r record; due date; n integer:=0;
begin
  select * into v from public.quote_payment_plans where id=p_plan for update;
  if not found then raise exception 'QUOTE_PAYMENT_NOT_FOUND'; end if;
  for r in select id,sequence,due_date,amount,currency from public.quote_payment_installments where plan_id=p_plan and status='SCHEDULED' order by sequence loop
    if v.status='CANCELLED' or (v.total_installments is not null and r.sequence>v.total_installments) then
      update public.quote_payment_installments set status='CANCELLED',
        cancel_reason=case when v.status='CANCELLED' then 'Plan anulado: '||v.cancel_reason else 'Plan modificado: cuota fuera del nuevo plazo' end
      where id=r.id;
      n:=n+1;
    else
      due:=case when v.frequency='ONE_TIME' then v.start_date else public.quote_payment_due_date(v.start_date,v.payment_day,r.sequence) end;
      if (due,v.amount,v.currency) is distinct from (r.due_date,r.amount,r.currency::text) then
        update public.quote_payment_installments set due_date=due,period_key=to_char(due,'YYYY-MM'),amount=v.amount,currency=v.currency where id=r.id;
        n:=n+1;
      end if;
    end if;
  end loop;
  return n;
end $$;

-- Invariantes: cuotas pagadas inmutables, sin borrado, y pago sólo con la opción habilitada.
create or replace function public.quote_payment_installment_guard() returns trigger language plpgsql set search_path=public as $$
declare v_days integer;
begin
  if tg_op='DELETE' then raise exception 'QUOTE_PAYMENT_IMMUTABLE: las cuotas no se eliminan; se anulan con motivo'; end if;
  if old.status='PAID' then
    if (new.status,new.paid_at,new.paid_amount,new.sii_document_type,new.sii_folio,new.invoice_storage_path,new.invoice_sha256,new.amount,new.due_date)
       is distinct from (old.status,old.paid_at,old.paid_amount,old.sii_document_type,old.sii_folio,old.invoice_storage_path,old.invoice_sha256,old.amount,old.due_date) then
      raise exception 'QUOTE_PAYMENT_IMMUTABLE: una cuota pagada no se modifica';
    end if;
    return new;
  end if;
  if old.status='CANCELLED' and new.status<>'CANCELLED' then raise exception 'QUOTE_PAYMENT_IMMUTABLE: una cuota anulada no se reactiva'; end if;
  if new.status='PAID' then
    select activation_days_before into v_days from public.quote_payment_plans where id=new.plan_id;
    if public.quote_payment_today()<new.due_date-v_days then
      raise exception 'QUOTE_PAYMENT_NOT_OPEN: la opción de pago se habilita el %',to_char(new.due_date-v_days,'DD-MM-YYYY');
    end if;
    if new.paid_at>public.quote_payment_today() then raise exception 'QUOTE_PAYMENT_DATE: la fecha de pago no puede ser futura'; end if;
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists quote_payment_installments_guard on public.quote_payment_installments;
create trigger quote_payment_installments_guard before update or delete on public.quote_payment_installments for each row execute function public.quote_payment_installment_guard();

create or replace function public.quote_payment_plan_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'QUOTE_PAYMENT_IMMUTABLE: los planes no se eliminan; se anulan con motivo'; end if;
  if old.status='CANCELLED' and new.status<>'CANCELLED' then raise exception 'QUOTE_PAYMENT_IMMUTABLE: un plan anulado no se reactiva'; end if;
  if exists(select 1 from public.quote_payment_installments where plan_id=old.id and status='PAID')
     and (new.frequency,new.start_date,new.payment_day,new.currency,new.quote_id) is distinct from (old.frequency,old.start_date,old.payment_day,old.currency,old.quote_id) then
    raise exception 'QUOTE_PAYMENT_IMMUTABLE: con cuotas pagadas no cambia la frecuencia, el inicio, el día de pago ni la moneda';
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists quote_payment_plans_guard on public.quote_payment_plans;
create trigger quote_payment_plans_guard before update or delete on public.quote_payment_plans for each row execute function public.quote_payment_plan_guard();

-- ------------------------------------------------------------------------------------------- estado efectivo
-- PAID / CANCELLED, OVERDUE (venció sin pago), PAYMENT_OPEN (opción de pago habilitada), UPCOMING.
create or replace view public.quote_payment_installments_effective with(security_invoker=true) as
  select i.*,p.frequency,p.activation_days_before,p.status plan_status,q.quote_number,q.company_name,q.owner_id,
    (i.due_date-p.activation_days_before) payment_opens_on,
    case when i.status in('PAID','CANCELLED') then i.status
         when public.quote_payment_today()>i.due_date then 'OVERDUE'
         when public.quote_payment_today()>=i.due_date-p.activation_days_before then 'PAYMENT_OPEN'
         else 'UPCOMING' end effective_status
  from public.quote_payment_installments i
  join public.quote_payment_plans p on p.id=i.plan_id
  join public.quotes q on q.id=i.quote_id;

-- ------------------------------------------------------------------------------------------- RLS
alter table public.quote_payment_plans enable row level security;
alter table public.quote_payment_installments enable row level security;

-- security definer: la visibilidad del calendario no depende de la RLS de quotes (Finanzas/Contador no leen cotizaciones).
create or replace function private.can_view_quote_payments(target_quote uuid) returns boolean language sql stable security definer set search_path=public as $$
  select private.zyteron_role() in('GERENTE_GENERAL','FINANZAS','CONTADOR','JEFE_VENTAS','COMERCIAL')
      or (private.zyteron_role()='EJECUTIVA_VENTAS' and exists(select 1 from public.quotes q where q.id=target_quote and q.owner_id=auth.uid()))
$$;
-- Cliente del usuario del portal (activo y con documentos visibles).
create or replace function private.portal_quote_client() returns uuid language sql stable security definer set search_path=public as $$
  select p.client_id from public.client_portal_users p join public.client_portal_settings s on s.client_id=p.client_id
  where p.auth_user_id=auth.uid() and p.status='ACTIVE' and s.enabled and s.invoices_visible and private.zyteron_role()='PORTAL_CLIENT' limit 1
$$;

drop policy if exists quote_payment_plans_read on public.quote_payment_plans;
create policy quote_payment_plans_read on public.quote_payment_plans for select to authenticated
  using(private.can_view_quote_payments(quote_id));
drop policy if exists quote_payment_installments_read on public.quote_payment_installments;
create policy quote_payment_installments_read on public.quote_payment_installments for select to authenticated
  using(private.can_view_quote_payments(quote_id));

-- Portal Cliente futuro: calendario propio; la factura sólo cuando la cuota está pagada y marcada visible.
create or replace view public.portal_quote_payments with(security_barrier=true) as
  select i.id,i.quote_id,q.quote_number,i.sequence,i.period_key,i.due_date,i.amount,i.currency,
    case when i.status in('PAID','CANCELLED') then i.status when public.quote_payment_today()>i.due_date then 'OVERDUE'
         when public.quote_payment_today()>=i.due_date-p.activation_days_before then 'PAYMENT_OPEN' else 'UPCOMING' end status,
    i.paid_at,
    case when i.status='PAID' and i.client_visible then i.sii_document_type end sii_document_type,
    case when i.status='PAID' and i.client_visible then i.sii_folio end sii_folio,
    case when i.status='PAID' and i.client_visible then i.invoice_storage_path end invoice_storage_path
  from public.quote_payment_installments i
  join public.quote_payment_plans p on p.id=i.plan_id
  join public.quotes q on q.id=i.quote_id
  where i.client_id=private.portal_quote_client() and p.status<>'CANCELLED' and i.status<>'CANCELLED';
revoke all on public.portal_quote_payments from anon,public;
grant select on public.portal_quote_payments to authenticated;
revoke all on public.quote_payment_installments_effective from anon,public;
grant select on public.quote_payment_installments_effective to authenticated;

-- ------------------------------------------------------------------------------------------- Storage privado
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('quote-invoices','quote-invoices',false,10485760,array['application/pdf','application/xml','text/xml'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Ruta: clients/{client_id}/quotes/{quote_id}/{periodo}-{hash}.{pdf|xml}. El portal sólo lee facturas propias, pagadas y visibles.
-- security definer: el portal no tiene RLS de lectura sobre las cuotas; sólo se expone si el archivo respalda una cuota pagada y visible de su cliente.
create or replace function private.portal_invoice_visible(object_name text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.quote_payment_installments i where i.invoice_storage_path=object_name and i.status='PAID' and i.client_visible
    and i.client_id=private.portal_quote_client())
$$;
drop policy if exists quote_invoices_portal_read on storage.objects;
create policy quote_invoices_portal_read on storage.objects for select to authenticated using(
  bucket_id='quote-invoices'
  and (storage.foldername(name))[1]='clients'
  and (storage.foldername(name))[2]=private.portal_quote_client()::text
  and private.portal_invoice_visible(name)
);

-- ------------------------------------------------------------------------------------------- RBAC, auditoría, realtime
insert into public.app_permissions(code,description) values
('quote_payment.view','Ver calendario de pagos de cotizaciones'),
('quote_payment.manage','Configurar planes de pago de cotizaciones'),
('quote_payment.mark_paid','Marcar cuotas como pagadas con factura SII')
on conflict(code) do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('FINANZAS'),('JEFE_VENTAS'),('COMERCIAL'))r(role)
  cross join public.app_permissions p where p.code in('quote_payment.view','quote_payment.manage','quote_payment.mark_paid') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'EJECUTIVA_VENTAS',code from public.app_permissions where code in('quote_payment.view','quote_payment.manage') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'CONTADOR',code from public.app_permissions where code in('quote_payment.view') on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['quote_payment_plans','quote_payment_installments'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
end $$;

do $$ declare fn text; begin
  foreach fn in array array['public.quote_payment_materialize(uuid,date)','public.quote_payment_reschedule(uuid)'] loop
    execute format('revoke all on function %s from public,anon,authenticated',fn);
    execute format('grant execute on function %s to service_role',fn);
  end loop;
end $$;

commit;

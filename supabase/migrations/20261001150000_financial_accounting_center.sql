-- Módulo 07 · Financial & Accounting Control Center.
-- Motor contable de partida doble: la base de datos rechaza contabilizar asientos descuadrados, en períodos
-- cerrados o con cuentas no imputables, y vuelve inmutables los asientos contabilizados. Montos en moneda base
-- (CLP) con 2 decimales; persistencia UTC; períodos y fechas contables como `date`.
begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------------------------------------------------------------------------------------------- numeración
create sequence if not exists public.finance_journal_number_seq;
create sequence if not exists public.finance_invoice_number_seq;
create sequence if not exists public.finance_payment_number_seq;
create sequence if not exists public.finance_expense_number_seq;
create sequence if not exists public.finance_vendor_payment_number_seq;
create or replace function public.finance_number(p_prefix text,p_seq regclass) returns text language sql volatile set search_path=public as $$
  select p_prefix||'-'||extract(year from (now() at time zone 'America/Santiago'))::integer||'-'||lpad(nextval(p_seq)::text,6,'0')
$$;
create or replace function public.next_invoice_number() returns text language sql volatile set search_path=public as $$ select public.finance_number('INV','public.finance_invoice_number_seq') $$;
create or replace function public.next_payment_reference() returns text language sql volatile set search_path=public as $$ select public.finance_number('PAG','public.finance_payment_number_seq') $$;
create or replace function public.next_expense_number() returns text language sql volatile set search_path=public as $$ select public.finance_number('GTO','public.finance_expense_number_seq') $$;
create or replace function public.next_vendor_payment_number() returns text language sql volatile set search_path=public as $$ select public.finance_number('PPV','public.finance_vendor_payment_number_seq') $$;

-- ---------------------------------------------------------------------------------------------- configuración
create table if not exists public.finance_settings(
  id boolean primary key default true check(id),
  base_currency char(3) not null default 'CLP',
  company_legal_name text not null default 'Zyteron SpA',
  company_rut text,
  company_business_activity text,
  company_activity_code integer,
  company_address text,
  company_commune text,
  company_city text,
  company_email text,
  invoice_requires_approval boolean not null default true,
  invoice_approval_threshold numeric(18,2),
  default_payment_terms_days integer not null default 30 check(default_payment_terms_days between 0 and 365),
  auto_create_billing_drafts boolean not null default true,
  reconciliation_date_tolerance_days integer not null default 3 check(reconciliation_date_tolerance_days between 0 and 30),
  reconciliation_amount_tolerance numeric(18,2) not null default 0 check(reconciliation_amount_tolerance>=0),
  auto_match_enabled boolean not null default false,
  collection_reminders_enabled boolean not null default false,
  client_concentration_threshold numeric(5,2) not null default 30 check(client_concentration_threshold between 1 and 100),
  dte_provider text not null default 'NONE' check(dte_provider in('NONE','SII_DIRECT','EXTERNAL')),
  dte_environment text not null default 'CERTIFICATION' check(dte_environment in('CERTIFICATION','PRODUCTION')),
  dte_production_authorized boolean not null default false,
  dte_resolution_number integer,
  dte_resolution_date date,
  online_payments_enabled boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.finance_settings(id) values(true) on conflict(id) do nothing;

-- ---------------------------------------------------------------------------------------------- plan de cuentas
create table if not exists public.chart_of_accounts(
  id uuid primary key default gen_random_uuid(),
  code text not null unique check(code ~ '^[0-9]+(\.[0-9]+)*$'),
  name text not null,
  parent_id uuid references public.chart_of_accounts(id) on delete restrict,
  account_type text not null check(account_type in('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  normal_balance text not null check(normal_balance in('DEBIT','CREDIT')),
  statement_section text check(statement_section is null or statement_section in('CURRENT_ASSET','NON_CURRENT_ASSET','CURRENT_LIABILITY','NON_CURRENT_LIABILITY','EQUITY','OPERATING_REVENUE','OTHER_REVENUE','COST_OF_SALES','OPERATING_EXPENSE','FINANCIAL_EXPENSE','OTHER_EXPENSE')),
  allows_posting boolean not null default true,
  is_cash boolean not null default false,
  currency char(3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(parent_id is null or parent_id<>id)
);
create or replace function public.finance_account_guard() returns trigger language plpgsql set search_path=public as $$
declare parent public.chart_of_accounts%rowtype;
begin
  if new.parent_id is not null then
    select * into parent from public.chart_of_accounts where id=new.parent_id;
    if parent.account_type<>new.account_type then raise exception 'La cuenta hija debe tener el mismo tipo que su cuenta padre'; end if;
    if parent.allows_posting then update public.chart_of_accounts set allows_posting=false where id=parent.id and not exists(select 1 from public.journal_entry_lines where account_id=parent.id); end if;
  end if;
  if tg_op='UPDATE' and old.account_type<>new.account_type and exists(select 1 from public.journal_entry_lines where account_id=new.id) then raise exception 'No se puede cambiar el tipo de una cuenta con movimientos'; end if;
  return new;
end $$;

-- Plan base sugerido (editable). No implica asientos: las reglas que lo referencian nacen en borrador.
insert into public.chart_of_accounts(code,name,account_type,normal_balance,statement_section,allows_posting,is_cash) values
('1','ACTIVO','ASSET','DEBIT',null,false,false),('1.1','Activo corriente','ASSET','DEBIT','CURRENT_ASSET',false,false),
('1.1.01','Caja','ASSET','DEBIT','CURRENT_ASSET',true,true),('1.1.02','Bancos','ASSET','DEBIT','CURRENT_ASSET',false,true),
('1.1.02.01','Banco cuenta corriente principal','ASSET','DEBIT','CURRENT_ASSET',true,true),
('1.1.03','Clientes (deudores por venta)','ASSET','DEBIT','CURRENT_ASSET',true,false),('1.1.04','IVA crédito fiscal','ASSET','DEBIT','CURRENT_ASSET',true,false),
('1.1.05','Fondos en tránsito pasarela de pago','ASSET','DEBIT','CURRENT_ASSET',true,false),('1.1.06','Anticipos a proveedores','ASSET','DEBIT','CURRENT_ASSET',true,false),
('1.2','Activo no corriente','ASSET','DEBIT','NON_CURRENT_ASSET',false,false),('1.2.01','Equipos computacionales','ASSET','DEBIT','NON_CURRENT_ASSET',true,false),
('1.2.02','Depreciación acumulada','ASSET','CREDIT','NON_CURRENT_ASSET',true,false),
('2','PASIVO','LIABILITY','CREDIT',null,false,false),('2.1','Pasivo corriente','LIABILITY','CREDIT','CURRENT_LIABILITY',false,false),
('2.1.01','Proveedores por pagar','LIABILITY','CREDIT','CURRENT_LIABILITY',true,false),('2.1.02','IVA débito fiscal','LIABILITY','CREDIT','CURRENT_LIABILITY',true,false),
('2.1.03','Comisiones por pagar','LIABILITY','CREDIT','CURRENT_LIABILITY',true,false),('2.1.04','Anticipos y saldos a favor de clientes','LIABILITY','CREDIT','CURRENT_LIABILITY',true,false),
('2.1.05','Impuestos por pagar','LIABILITY','CREDIT','CURRENT_LIABILITY',true,false),('2.1.06','Remuneraciones por pagar','LIABILITY','CREDIT','CURRENT_LIABILITY',true,false),
('3','PATRIMONIO','EQUITY','CREDIT',null,false,false),('3.1','Capital','EQUITY','CREDIT','EQUITY',true,false),
('3.2','Resultados acumulados','EQUITY','CREDIT','EQUITY',true,false),('3.3','Resultado del ejercicio','EQUITY','CREDIT','EQUITY',true,false),
('4','INGRESOS','REVENUE','CREDIT',null,false,false),('4.1','Ingresos de explotación','REVENUE','CREDIT','OPERATING_REVENUE',false,false),
('4.1.01','Ingresos por desarrollo','REVENUE','CREDIT','OPERATING_REVENUE',true,false),('4.1.02','Ingresos por servicios recurrentes','REVENUE','CREDIT','OPERATING_REVENUE',true,false),
('4.1.03','Ingresos por auditorías y consultoría','REVENUE','CREDIT','OPERATING_REVENUE',true,false),('4.2','Otros ingresos','REVENUE','CREDIT','OTHER_REVENUE',false,false),
('4.2.01','Otros ingresos no operacionales','REVENUE','CREDIT','OTHER_REVENUE',true,false),
('5','COSTOS Y GASTOS','EXPENSE','DEBIT',null,false,false),('5.1','Costo de ventas','EXPENSE','DEBIT','COST_OF_SALES',false,false),
('5.1.01','Costos directos de proyectos','EXPENSE','DEBIT','COST_OF_SALES',true,false),('5.1.02','Infraestructura y servicios de terceros','EXPENSE','DEBIT','COST_OF_SALES',true,false),
('5.2','Gastos de administración','EXPENSE','DEBIT','OPERATING_EXPENSE',false,false),('5.2.01','Remuneraciones','EXPENSE','DEBIT','OPERATING_EXPENSE',true,false),
('5.2.02','Arriendos','EXPENSE','DEBIT','OPERATING_EXPENSE',true,false),('5.2.03','Software y suscripciones','EXPENSE','DEBIT','OPERATING_EXPENSE',true,false),
('5.2.04','Gastos generales','EXPENSE','DEBIT','OPERATING_EXPENSE',true,false),('5.3','Gastos de venta','EXPENSE','DEBIT','OPERATING_EXPENSE',false,false),
('5.3.01','Comisiones de venta','EXPENSE','DEBIT','OPERATING_EXPENSE',true,false),('5.3.02','Marketing','EXPENSE','DEBIT','OPERATING_EXPENSE',true,false),
('5.4','Gastos financieros','EXPENSE','DEBIT','FINANCIAL_EXPENSE',false,false),('5.4.01','Comisiones de pasarela de pago','EXPENSE','DEBIT','FINANCIAL_EXPENSE',true,false),
('5.4.02','Comisiones bancarias','EXPENSE','DEBIT','FINANCIAL_EXPENSE',true,false),('5.5','IVA no recuperable','EXPENSE','DEBIT','OTHER_EXPENSE',false,false),
('5.5.01','IVA no recuperable','EXPENSE','DEBIT','OTHER_EXPENSE',true,false)
on conflict(code) do nothing;
update public.chart_of_accounts c set parent_id=p.id from public.chart_of_accounts p
where c.parent_id is null and p.code=regexp_replace(c.code,'\.[0-9]+$','') and c.code like '%.%';
drop trigger if exists chart_of_accounts_guard on public.chart_of_accounts;
create trigger chart_of_accounts_guard before insert or update on public.chart_of_accounts for each row execute function public.finance_account_guard();

create table if not exists public.cost_centers(
  id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,description text,active boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
insert into public.cost_centers(code,name) values('ADM','Administración'),('VEN','Ventas'),('DES','Desarrollo'),('SOP','Soporte'),('MKT','Marketing') on conflict(code) do nothing;

-- ---------------------------------------------------------------------------------------------- períodos
create table if not exists public.accounting_periods(
  id uuid primary key default gen_random_uuid(),
  period_key text not null unique check(period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  year integer not null,month integer not null check(month between 1 and 12),
  starts_on date not null,ends_on date not null,
  status text not null default 'OPEN' check(status in('OPEN','CLOSING','CLOSED','LOCKED')),
  closed_at timestamptz,closed_by uuid,locked_at timestamptz,locked_by uuid,
  reopened_at timestamptz,reopened_by uuid,reopen_reason text,reopen_count integer not null default 0,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(ends_on>=starts_on)
);
create or replace function public.finance_ensure_period(p_date date) returns uuid language plpgsql security definer set search_path=public as $$
declare v_key text:=to_char(p_date,'YYYY-MM'); v_id uuid;
begin
  select id into v_id from public.accounting_periods where period_key=v_key;
  if v_id is not null then return v_id; end if;
  insert into public.accounting_periods(period_key,year,month,starts_on,ends_on)
  values(v_key,extract(year from p_date)::integer,extract(month from p_date)::integer,date_trunc('month',p_date)::date,(date_trunc('month',p_date)+interval '1 month -1 day')::date)
  on conflict(period_key) do nothing;
  select id into v_id from public.accounting_periods where period_key=v_key;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------------------------- libro diario
create table if not exists public.journal_entries(
  id uuid primary key default gen_random_uuid(),
  entry_number text unique,
  entry_date date not null,
  description text not null check(char_length(trim(description))>0),
  source_type text not null default 'MANUAL' check(source_type in('MANUAL','RULE','REVERSAL','OPENING','CLOSING','ADJUSTMENT','RECONCILIATION','COPILOT_PROPOSAL')),
  source_id uuid,
  source_event_id uuid,
  rule_version_id uuid,
  status text not null default 'DRAFT' check(status in('DRAFT','PENDING_REVIEW','POSTED','REVERSED')),
  period_id uuid not null references public.accounting_periods(id) on delete restrict,
  currency char(3) not null default 'CLP',
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  created_by uuid,submitted_by uuid,submitted_at timestamptz,reviewed_by uuid,reviewed_at timestamptz,posted_by uuid,posted_at timestamptz,
  reversal_of_id uuid references public.journal_entries(id) on delete restrict,
  reversed_by_id uuid references public.journal_entries(id) on delete restrict,
  reversal_reason text,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(status not in('POSTED','REVERSED') or (entry_number is not null and total_debit=total_credit and total_debit>0))
);
create unique index if not exists journal_entries_source_event_unique on public.journal_entries(source_event_id) where source_event_id is not null;
create unique index if not exists journal_entries_single_reversal on public.journal_entries(reversal_of_id) where reversal_of_id is not null;

create table if not exists public.journal_entry_lines(
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  line_number integer not null check(line_number>0),
  account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  debit numeric(18,2) not null default 0 check(debit>=0),
  credit numeric(18,2) not null default 0 check(credit>=0),
  currency char(3) not null default 'CLP',
  original_amount numeric(18,4),
  exchange_rate numeric(18,6) not null default 1 check(exchange_rate>0),
  cost_center_id uuid references public.cost_centers(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  service_id uuid references public.client_services(id) on delete restrict,
  department_code text,
  description text,
  created_at timestamptz not null default now(),
  check((debit>0 and credit=0) or (credit>0 and debit=0)),
  unique(journal_entry_id,line_number)
);

-- Inmutabilidad: las líneas sólo cambian mientras el asiento es borrador o está en revisión.
create or replace function public.finance_journal_lines_guard() returns trigger language plpgsql set search_path=public as $$
declare v_status text;
begin
  select status into v_status from public.journal_entries where id=coalesce(new.journal_entry_id,old.journal_entry_id);
  if v_status not in('DRAFT','PENDING_REVIEW') then raise exception 'FINANCE_IMMUTABLE: el asiento está contabilizado; corrige con una reversa'; end if;
  if tg_op='UPDATE' and new.journal_entry_id<>old.journal_entry_id then raise exception 'No se puede mover una línea a otro asiento'; end if;
  return coalesce(new,old);
end $$;
drop trigger if exists journal_entry_lines_guard on public.journal_entry_lines;
create trigger journal_entry_lines_guard before insert or update or delete on public.journal_entry_lines for each row execute function public.finance_journal_lines_guard();

-- Invariante de partida doble y cierre de períodos, aplicada por la base al contabilizar.
create or replace function public.finance_journal_entries_guard() returns trigger language plpgsql set search_path=public as $$
declare v_debit numeric(18,2); v_credit numeric(18,2); v_lines integer; v_period public.accounting_periods%rowtype; v_bad integer;
begin
  if tg_op='DELETE' then
    if old.status<>'DRAFT' then raise exception 'FINANCE_IMMUTABLE: sólo se pueden descartar borradores'; end if;
    return old;
  end if;
  if tg_op='UPDATE' and old.status in('POSTED','REVERSED') then
    if old.status='POSTED' and new.status='REVERSED' and new.reversed_by_id is not null
       and (new.entry_number,new.entry_date,new.description,new.period_id,new.total_debit,new.total_credit,new.posted_at,new.posted_by)
         is not distinct from (old.entry_number,old.entry_date,old.description,old.period_id,old.total_debit,old.total_credit,old.posted_at,old.posted_by) then
      return new;
    end if;
    raise exception 'FINANCE_IMMUTABLE: un asiento contabilizado no se edita; registra una reversa y un nuevo asiento';
  end if;
  if new.status in('POSTED') and (tg_op='INSERT' or old.status<>'POSTED') then
    select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0) into v_lines,v_debit,v_credit from public.journal_entry_lines where journal_entry_id=new.id;
    if v_lines<2 then raise exception 'FINANCE_UNBALANCED: el asiento necesita al menos dos líneas'; end if;
    if v_debit<>v_credit or v_debit=0 then raise exception 'FINANCE_UNBALANCED: Debe % ≠ Haber %',v_debit,v_credit; end if;
    select count(*) into v_bad from public.journal_entry_lines l join public.chart_of_accounts a on a.id=l.account_id where l.journal_entry_id=new.id and (not a.allows_posting or not a.active);
    if v_bad>0 then raise exception 'FINANCE_ACCOUNT: hay líneas en cuentas no imputables o inactivas'; end if;
    select * into v_period from public.accounting_periods where id=new.period_id;
    if v_period.status in('CLOSED','LOCKED') then raise exception 'FINANCE_PERIOD_CLOSED: el período % está %',v_period.period_key,v_period.status; end if;
    if new.entry_date not between v_period.starts_on and v_period.ends_on then raise exception 'La fecha del asiento no pertenece al período'; end if;
    new.total_debit:=v_debit; new.total_credit:=v_credit;
    new.entry_number:=coalesce(new.entry_number,'AST-'||extract(year from new.entry_date)::integer||'-'||lpad(nextval('public.finance_journal_number_seq')::text,6,'0'));
    new.posted_at:=coalesce(new.posted_at,now());
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists journal_entries_guard on public.journal_entries;
create trigger journal_entries_guard before insert or update or delete on public.journal_entries for each row execute function public.finance_journal_entries_guard();

create or replace function public.finance_create_journal_entry(p_header jsonb,p_lines jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_existing uuid; v_line jsonb; v_n integer:=0; v_date date:=(p_header->>'entryDate')::date;
begin
  if nullif(p_header->>'sourceEventId','') is not null then
    select id into v_existing from public.journal_entries where source_event_id=(p_header->>'sourceEventId')::uuid;
    if v_existing is not null then return v_existing; end if;
  end if;
  insert into public.journal_entries(entry_date,description,source_type,source_id,source_event_id,rule_version_id,status,period_id,created_by)
  values(v_date,p_header->>'description',coalesce(p_header->>'sourceType','MANUAL'),nullif(p_header->>'sourceId','')::uuid,nullif(p_header->>'sourceEventId','')::uuid,nullif(p_header->>'ruleVersionId','')::uuid,
    'DRAFT',public.finance_ensure_period(v_date),nullif(p_header->>'createdBy','')::uuid) returning id into v_id;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_n:=v_n+1;
    insert into public.journal_entry_lines(journal_entry_id,line_number,account_id,debit,credit,currency,original_amount,exchange_rate,cost_center_id,client_id,project_id,service_id,department_code,description)
    values(v_id,v_n,(v_line->>'accountId')::uuid,coalesce((v_line->>'debit')::numeric,0),coalesce((v_line->>'credit')::numeric,0),coalesce(v_line->>'currency','CLP'),nullif(v_line->>'originalAmount','')::numeric,coalesce((v_line->>'exchangeRate')::numeric,1),
      nullif(v_line->>'costCenterId','')::uuid,nullif(v_line->>'clientId','')::uuid,nullif(v_line->>'projectId','')::uuid,nullif(v_line->>'serviceId','')::uuid,nullif(v_line->>'departmentCode',''),v_line->>'description');
  end loop;
  if coalesce(p_header->>'status','DRAFT')='PENDING_REVIEW' then update public.journal_entries set status='PENDING_REVIEW',submitted_at=now(),submitted_by=nullif(p_header->>'createdBy','')::uuid where id=v_id; end if;
  return v_id;
end $$;

create or replace function public.finance_post_journal_entry(p_entry uuid,p_actor uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v public.journal_entries%rowtype;
begin
  select * into v from public.journal_entries where id=p_entry for update;
  if not found then raise exception 'FINANCE_NOT_FOUND'; end if;
  if v.status not in('DRAFT','PENDING_REVIEW') then raise exception 'FINANCE_STATE: el asiento ya está %',v.status; end if;
  update public.journal_entries set status='POSTED',posted_by=p_actor,posted_at=now(),reviewed_by=coalesce(reviewed_by,p_actor),reviewed_at=coalesce(reviewed_at,now()) where id=p_entry returning * into v;
  return to_jsonb(v);
end $$;

create or replace function public.finance_reverse_journal_entry(p_entry uuid,p_actor uuid,p_reason text,p_date date) returns uuid language plpgsql security definer set search_path=public as $$
declare v public.journal_entries%rowtype; v_new uuid;
begin
  if nullif(trim(p_reason),'') is null then raise exception 'FINANCE_REASON: la reversa requiere motivo'; end if;
  select * into v from public.journal_entries where id=p_entry for update;
  if not found then raise exception 'FINANCE_NOT_FOUND'; end if;
  if v.status<>'POSTED' then raise exception 'FINANCE_STATE: sólo se revierten asientos contabilizados'; end if;
  insert into public.journal_entries(entry_date,description,source_type,source_id,status,period_id,created_by,reversal_of_id,reversal_reason)
  values(p_date,'Reversa de '||v.entry_number||': '||p_reason,'REVERSAL',v.id,'DRAFT',public.finance_ensure_period(p_date),p_actor,v.id,p_reason) returning id into v_new;
  insert into public.journal_entry_lines(journal_entry_id,line_number,account_id,debit,credit,currency,original_amount,exchange_rate,cost_center_id,client_id,project_id,service_id,department_code,description)
  select v_new,line_number,account_id,credit,debit,currency,original_amount,exchange_rate,cost_center_id,client_id,project_id,service_id,department_code,coalesce(description,'')||' (reversa)' from public.journal_entry_lines where journal_entry_id=v.id;
  update public.journal_entries set status='POSTED',posted_by=p_actor,reviewed_by=p_actor,reviewed_at=now() where id=v_new;
  update public.journal_entries set status='REVERSED',reversed_by_id=v_new,reversal_reason=p_reason where id=v.id;
  return v_new;
end $$;

-- ---------------------------------------------------------------------------------------------- reglas contables
create table if not exists public.accounting_rules(
  id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,event_type text not null,
  description text,filters jsonb not null default '{}'::jsonb,auto_post boolean not null default false,active boolean not null default false,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.accounting_rule_versions(
  id uuid primary key default gen_random_uuid(),rule_id uuid not null references public.accounting_rules(id) on delete restrict,
  version integer not null check(version>0),status text not null default 'DRAFT' check(status in('DRAFT','ACTIVE','RETIRED')),
  lines jsonb not null check(jsonb_typeof(lines)='array' and jsonb_array_length(lines)>=2),
  effective_from date,notes text,created_by uuid,activated_by uuid,activated_at timestamptz,created_at timestamptz not null default now(),
  unique(rule_id,version)
);
create unique index if not exists accounting_rule_versions_one_active on public.accounting_rule_versions(rule_id) where status='ACTIVE';
create or replace function public.finance_rule_version_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if old.status<>'DRAFT' and (new.lines is distinct from old.lines or new.version<>old.version) then raise exception 'FINANCE_IMMUTABLE: una versión activa o retirada de regla es inmutable; crea una nueva versión'; end if;
  return new;
end $$;
drop trigger if exists accounting_rule_versions_guard on public.accounting_rule_versions;
create trigger accounting_rule_versions_guard before update on public.accounting_rule_versions for each row execute function public.finance_rule_version_guard();

create table if not exists public.accounting_events(
  id uuid primary key default gen_random_uuid(),
  event_type text not null,source_type text not null,source_id uuid not null,idempotency_key text not null unique,
  amounts jsonb not null default '{}'::jsonb,context jsonb not null default '{}'::jsonb,occurred_on date not null,
  status text not null default 'PENDING' check(status in('PENDING','ENTRY_CREATED','UNMAPPED','ERROR','SKIPPED')),
  journal_entry_id uuid references public.journal_entries(id) on delete restrict,rule_version_id uuid references public.accounting_rule_versions(id) on delete restrict,
  message text,created_at timestamptz not null default now(),processed_at timestamptz
);

-- Reglas propuestas (versión DRAFT): no generan asientos hasta que contabilidad las revisa y activa.
do $$
declare r record; v_rule uuid;
begin
  for r in select * from (values
    ('INVOICE_ISSUED','Venta documentada (factura/ND aceptada)','INVOICE_ISSUED','{}'::jsonb,'[{"side":"DEBIT","account":{"code":"1.1.03"},"amount":["TOTAL"],"dimensions":["client","project","service"],"description":"{documentLabel}"},{"side":"CREDIT","account":{"context":"revenueAccountId","fallbackCode":"4.1.01"},"amount":["NET","EXEMPT"],"dimensions":["client","project","service","costCenter"],"description":"{documentLabel}"},{"side":"CREDIT","account":{"code":"2.1.02"},"amount":["TAX"],"dimensions":["client"],"description":"IVA débito {documentLabel}"}]'::jsonb),
    ('CREDIT_NOTE_ISSUED','Nota de crédito aceptada','CREDIT_NOTE_ISSUED','{}'::jsonb,'[{"side":"DEBIT","account":{"context":"revenueAccountId","fallbackCode":"4.1.01"},"amount":["NET","EXEMPT"],"dimensions":["client","project","service","costCenter"],"description":"{documentLabel}"},{"side":"DEBIT","account":{"code":"2.1.02"},"amount":["TAX"],"dimensions":["client"],"description":"IVA {documentLabel}"},{"side":"CREDIT","account":{"code":"1.1.03"},"amount":["TOTAL"],"dimensions":["client","project"],"description":"{documentLabel}"}]'::jsonb),
    ('PAYMENT_RECEIVED_BANK','Cobro por transferencia o depósito','PAYMENT_RECEIVED','{"channel":"BANK"}'::jsonb,'[{"side":"DEBIT","account":{"context":"cashLedgerAccountId","fallbackCode":"1.1.02.01"},"amount":["GROSS"],"dimensions":[],"description":"Cobro {paymentReference}"},{"side":"CREDIT","account":{"code":"2.1.04"},"amount":["GROSS"],"dimensions":["client"],"description":"Cobro {paymentReference}"}]'::jsonb),
    ('PAYMENT_RECEIVED_PROVIDER','Cobro por pasarela de pago','PAYMENT_RECEIVED','{"channel":"PROVIDER"}'::jsonb,'[{"side":"DEBIT","account":{"code":"1.1.05"},"amount":["NET_SETTLEMENT"],"dimensions":[],"description":"Cobro {paymentReference}"},{"side":"DEBIT","account":{"code":"5.4.01"},"amount":["FEE"],"dimensions":["costCenter"],"description":"Comisión pasarela {paymentReference}"},{"side":"CREDIT","account":{"code":"2.1.04"},"amount":["GROSS"],"dimensions":["client"],"description":"Cobro {paymentReference}"}]'::jsonb),
    ('PAYMENT_RECEIVED_CASH','Cobro en caja','PAYMENT_RECEIVED','{"channel":"CASH"}'::jsonb,'[{"side":"DEBIT","account":{"context":"cashLedgerAccountId","fallbackCode":"1.1.01"},"amount":["GROSS"],"dimensions":[],"description":"Cobro {paymentReference}"},{"side":"CREDIT","account":{"code":"2.1.04"},"amount":["GROSS"],"dimensions":["client"],"description":"Cobro {paymentReference}"}]'::jsonb),
    ('PAYMENT_ALLOCATED','Aplicación de cobro a factura','PAYMENT_ALLOCATED','{}'::jsonb,'[{"side":"DEBIT","account":{"code":"2.1.04"},"amount":["AMOUNT"],"dimensions":["client"],"description":"Aplicación {paymentReference} a {documentLabel}"},{"side":"CREDIT","account":{"code":"1.1.03"},"amount":["AMOUNT"],"dimensions":["client"],"description":"Aplicación {paymentReference} a {documentLabel}"}]'::jsonb),
    ('PAYMENT_ALLOCATION_REVERSED','Reversa de aplicación de cobro','PAYMENT_ALLOCATION_REVERSED','{}'::jsonb,'[{"side":"DEBIT","account":{"code":"1.1.03"},"amount":["AMOUNT"],"dimensions":["client"],"description":"Reversa aplicación {paymentReference}"},{"side":"CREDIT","account":{"code":"2.1.04"},"amount":["AMOUNT"],"dimensions":["client"],"description":"Reversa aplicación {paymentReference}"}]'::jsonb),
    ('PAYMENT_REFUNDED','Devolución de cobro','PAYMENT_REFUNDED','{}'::jsonb,'[{"side":"DEBIT","account":{"code":"2.1.04"},"amount":["AMOUNT"],"dimensions":["client"],"description":"Devolución {paymentReference}"},{"side":"CREDIT","account":{"context":"cashLedgerAccountId","fallbackCode":"1.1.02.01"},"amount":["AMOUNT"],"dimensions":[],"description":"Devolución {paymentReference}"}]'::jsonb),
    ('PROVIDER_PAYOUT','Liquidación de pasarela a banco','PROVIDER_PAYOUT','{}'::jsonb,'[{"side":"DEBIT","account":{"context":"cashLedgerAccountId","fallbackCode":"1.1.02.01"},"amount":["AMOUNT"],"dimensions":[],"description":"Liquidación pasarela"},{"side":"CREDIT","account":{"code":"1.1.05"},"amount":["AMOUNT"],"dimensions":[],"description":"Liquidación pasarela"}]'::jsonb),
    ('EXPENSE_APPROVED','Gasto o compra aprobada','EXPENSE_APPROVED','{}'::jsonb,'[{"side":"DEBIT","account":{"context":"expenseAccountId","fallbackCode":"5.2.04"},"amount":["NET","EXEMPT"],"dimensions":["costCenter","project","client"],"description":"{documentLabel}"},{"side":"DEBIT","account":{"code":"1.1.04"},"amount":["TAX_ELIGIBLE"],"dimensions":[],"description":"IVA crédito {documentLabel}"},{"side":"DEBIT","account":{"code":"5.5.01"},"amount":["TAX_NON_ELIGIBLE"],"dimensions":["costCenter"],"description":"IVA no recuperable {documentLabel}"},{"side":"CREDIT","account":{"code":"2.1.01"},"amount":["TOTAL"],"dimensions":[],"description":"{documentLabel}"}]'::jsonb),
    ('VENDOR_PAYMENT_EXECUTED','Pago a proveedor','VENDOR_PAYMENT_EXECUTED','{}'::jsonb,'[{"side":"DEBIT","account":{"code":"2.1.01"},"amount":["AMOUNT"],"dimensions":[],"description":"Pago {paymentReference}"},{"side":"CREDIT","account":{"context":"cashLedgerAccountId","fallbackCode":"1.1.02.01"},"amount":["AMOUNT"],"dimensions":[],"description":"Pago {paymentReference}"}]'::jsonb),
    ('COMMISSION_APPROVED','Comisión de venta devengada','COMMISSION_APPROVED','{}'::jsonb,'[{"side":"DEBIT","account":{"code":"5.3.01"},"amount":["AMOUNT"],"dimensions":["client","costCenter"],"description":"Comisión {documentLabel}"},{"side":"CREDIT","account":{"code":"2.1.03"},"amount":["AMOUNT"],"dimensions":[],"description":"Comisión {documentLabel}"}]'::jsonb),
    ('COMMISSION_PAID','Pago de comisión','COMMISSION_PAID','{}'::jsonb,'[{"side":"DEBIT","account":{"code":"2.1.03"},"amount":["AMOUNT"],"dimensions":[],"description":"Pago comisión {documentLabel}"},{"side":"CREDIT","account":{"context":"cashLedgerAccountId","fallbackCode":"1.1.02.01"},"amount":["AMOUNT"],"dimensions":[],"description":"Pago comisión {documentLabel}"}]'::jsonb)
  ) as t(code,name,event_type,filters,lines) loop
    if not exists(select 1 from public.accounting_rules where code=r.code) then
      insert into public.accounting_rules(code,name,event_type,filters,description) values(r.code,r.name,r.event_type,r.filters,'Propuesta base: revisar cuentas y activar antes de generar asientos.') returning id into v_rule;
      insert into public.accounting_rule_versions(rule_id,version,status,lines,notes) values(v_rule,1,'DRAFT',r.lines,'Versión propuesta; requiere revisión de contabilidad.');
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------- impuestos
create table if not exists public.tax_rules(
  id uuid primary key default gen_random_uuid(),code text not null unique,tax_type text not null,name text not null,description text,active boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.tax_rule_versions(
  id uuid primary key default gen_random_uuid(),tax_rule_id uuid not null references public.tax_rules(id) on delete restrict,
  rate numeric(9,6) not null check(rate>=0 and rate<1),effective_from date not null,effective_to date,source_reference text not null,
  active boolean not null default true,created_by uuid,created_at timestamptz not null default now(),
  check(effective_to is null or effective_to>=effective_from)
);
create or replace function public.finance_tax_version_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if new.active and exists(select 1 from public.tax_rule_versions v where v.tax_rule_id=new.tax_rule_id and v.id<>new.id and v.active
     and daterange(v.effective_from,v.effective_to,'[]') && daterange(new.effective_from,new.effective_to,'[]')) then
    raise exception 'FINANCE_TAX_OVERLAP: la vigencia se superpone con otra versión activa';
  end if;
  return new;
end $$;
drop trigger if exists tax_rule_versions_guard on public.tax_rule_versions;
create trigger tax_rule_versions_guard before insert or update on public.tax_rule_versions for each row execute function public.finance_tax_version_guard();
insert into public.tax_rules(code,tax_type,name,description) values
('IVA','VAT','Impuesto al Valor Agregado','Tasa general del IVA. Revisar ante cambios legales.'),
('PPM','PPM','Pagos provisionales mensuales','La tasa depende del contribuyente; debe configurarla contabilidad con el dato informado por el SII.')
on conflict(code) do nothing;
insert into public.tax_rule_versions(tax_rule_id,rate,effective_from,source_reference)
select id,0.19,'2003-10-01','DL 825 art. 14 (tasa 19% vigente desde 01-10-2003 según Ley 19.888)' from public.tax_rules where code='IVA'
and not exists(select 1 from public.tax_rule_versions v join public.tax_rules r on r.id=v.tax_rule_id where r.code='IVA');

create table if not exists public.tax_document_types(
  code integer primary key,name text not null,category text not null check(category in('INVOICE','EXEMPT_INVOICE','CREDIT_NOTE','DEBIT_NOTE','RECEIPT','PURCHASE_INVOICE','DISPATCH_GUIDE','OTHER')),
  sign integer not null default 1 check(sign in(-1,1)),enabled_for_issue boolean not null default false,certified boolean not null default false,notes text
);
insert into public.tax_document_types(code,name,category,sign) values
(33,'Factura electrónica','INVOICE',1),(34,'Factura no afecta o exenta electrónica','EXEMPT_INVOICE',1),
(61,'Nota de crédito electrónica','CREDIT_NOTE',-1),(56,'Nota de débito electrónica','DEBIT_NOTE',1),
(46,'Factura de compra electrónica','PURCHASE_INVOICE',1),(52,'Guía de despacho electrónica','DISPATCH_GUIDE',1),
(39,'Boleta electrónica','RECEIPT',1),(41,'Boleta exenta electrónica','RECEIPT',1)
on conflict(code) do nothing;

-- ---------------------------------------------------------------------------------------------- facturación
create table if not exists public.billing_schedules(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  client_service_id uuid references public.client_services(id) on delete restrict,
  contract_id uuid references public.client_contracts(id) on delete restrict,
  description text not null,
  frequency text not null check(frequency in('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','CUSTOM_DAYS')),
  interval_days integer check(interval_days is null or interval_days between 1 and 730),
  amount numeric(18,2) not null check(amount>0),currency char(3) not null default 'CLP',is_exempt boolean not null default false,
  next_billing_date date not null,end_date date,active boolean not null default true,payment_terms_days integer,
  revenue_account_id uuid references public.chart_of_accounts(id) on delete restrict,cost_center_id uuid references public.cost_centers(id) on delete restrict,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(frequency<>'CUSTOM_DAYS' or interval_days is not null)
);
create unique index if not exists billing_schedules_service_active on public.billing_schedules(client_service_id) where active and client_service_id is not null;

create table if not exists public.invoices(
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default public.next_invoice_number(),
  document_type_code integer not null default 33 references public.tax_document_types(code) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  contract_id uuid references public.client_contracts(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  client_service_id uuid references public.client_services(id) on delete restrict,
  billing_schedule_id uuid references public.billing_schedules(id) on delete restrict,
  reference_invoice_id uuid references public.invoices(id) on delete restrict,
  reference_code integer check(reference_code is null or reference_code in(1,2,3)),
  reference_reason text,
  currency char(3) not null default 'CLP',exchange_rate numeric(18,6) not null default 1 check(exchange_rate>0),
  net_amount numeric(18,2) not null default 0 check(net_amount>=0),
  exempt_amount numeric(18,2) not null default 0 check(exempt_amount>=0),
  tax_amount numeric(18,2) not null default 0 check(tax_amount>=0),
  total_amount numeric(18,2) not null default 0 check(total_amount>=0),
  tax_rate numeric(9,6),tax_rule_version_id uuid references public.tax_rule_versions(id) on delete restrict,
  amount_paid numeric(18,2) not null default 0 check(amount_paid>=0),
  amount_credited numeric(18,2) not null default 0 check(amount_credited>=0),
  balance_due numeric(18,2) generated always as (total_amount-amount_paid-amount_credited) stored,
  status text not null default 'DRAFT' check(status in('DRAFT','PENDING_APPROVAL','READY_TO_ISSUE','ISSUING','ISSUED','PARTIALLY_PAID','PAID','CANCELLED','CREDITED','VOID')),
  issue_date date,due_date date,payment_terms_days integer check(payment_terms_days is null or payment_terms_days between 0 and 365),payment_terms text,
  description text,notes text,client_snapshot jsonb not null default '{}'::jsonb,
  tax_document_id uuid,
  approval_required boolean not null default false,approved_by uuid,approved_at timestamptz,
  issued_at timestamptz,cancelled_at timestamptz,cancel_reason text,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(total_amount=net_amount+exempt_amount+tax_amount),
  check(due_date is null or issue_date is null or due_date>=issue_date),
  check(balance_due>=0),
  check(document_type_code not in(56,61) or reference_invoice_id is not null)
);
create table if not exists public.invoice_lines(
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  line_number integer not null check(line_number>0),
  description text not null,
  quantity numeric(14,4) not null default 1 check(quantity>0),
  unit_price numeric(18,4) not null check(unit_price>=0),
  discount_amount numeric(18,2) not null default 0 check(discount_amount>=0),
  net_amount numeric(18,2) not null check(net_amount>=0),
  is_exempt boolean not null default false,
  client_service_id uuid references public.client_services(id) on delete restrict,
  catalog_service_id uuid references public.service_catalog(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  cost_center_id uuid references public.cost_centers(id) on delete restrict,
  revenue_account_id uuid references public.chart_of_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(invoice_id,line_number)
);
create table if not exists public.billing_schedule_runs(
  id uuid primary key default gen_random_uuid(),schedule_id uuid not null references public.billing_schedules(id) on delete restrict,
  period_key date not null,invoice_id uuid references public.invoices(id) on delete restrict,created_at timestamptz not null default now(),
  unique(schedule_id,period_key)
);

-- Documentos emitidos: sin borrado ni edición de montos/receptor; sólo avanzan estado y saldos.
create or replace function public.finance_invoice_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: las facturas no se eliminan; cancela el borrador o emite nota de crédito'; end if;
  if old.status in('ISSUING','ISSUED','PARTIALLY_PAID','PAID','CREDITED','VOID') and
     (new.client_id,new.document_type_code,new.net_amount,new.exempt_amount,new.tax_amount,new.total_amount,new.issue_date,new.client_snapshot,new.reference_invoice_id,new.currency)
     is distinct from (old.client_id,old.document_type_code,old.net_amount,old.exempt_amount,old.tax_amount,old.total_amount,old.issue_date,old.client_snapshot,old.reference_invoice_id,old.currency) then
    raise exception 'FINANCE_IMMUTABLE: un documento en emisión o emitido no se edita; usa nota de crédito o débito';
  end if;
  if old.status in('CANCELLED','VOID') and new.status<>old.status then raise exception 'FINANCE_STATE: documento anulado'; end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists invoices_guard on public.invoices;
create trigger invoices_guard before update or delete on public.invoices for each row execute function public.finance_invoice_guard();
create or replace function public.finance_invoice_lines_guard() returns trigger language plpgsql set search_path=public as $$
declare v_status text;
begin
  select status into v_status from public.invoices where id=coalesce(new.invoice_id,old.invoice_id);
  if v_status not in('DRAFT','PENDING_APPROVAL') then raise exception 'FINANCE_IMMUTABLE: las líneas sólo cambian en borrador'; end if;
  return coalesce(new,old);
end $$;
drop trigger if exists invoice_lines_guard on public.invoice_lines;
create trigger invoice_lines_guard before insert or update or delete on public.invoice_lines for each row execute function public.finance_invoice_lines_guard();

-- ---------------------------------------------------------------------------------------------- DTE / SII
create table if not exists public.dte_certificates(
  id uuid primary key default gen_random_uuid(),label text not null,subject text not null,issuer text not null,serial_number text not null,
  holder_rut text,valid_from timestamptz not null,expires_at timestamptz not null,fingerprint_sha256 text not null unique,
  secret_ref text not null check(secret_ref ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  status text not null default 'ACTIVE' check(status in('ACTIVE','RETIRED','EXPIRED','REVOKED')),
  uploaded_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(expires_at>valid_from)
);
create table if not exists public.tax_folio_authorizations(
  id uuid primary key default gen_random_uuid(),
  document_type_code integer not null references public.tax_document_types(code) on delete restrict,
  environment text not null check(environment in('CERTIFICATION','PRODUCTION')),
  range_from bigint not null check(range_from>0),range_to bigint not null,authorized_at date not null,
  caf_sha256 text not null unique,caf_storage_path text not null,
  status text not null default 'ACTIVE' check(status in('ACTIVE','EXHAUSTED','REVOKED')),
  created_by uuid,created_at timestamptz not null default now(),
  check(range_to>=range_from and range_to-range_from<100000),
  unique(environment,document_type_code,range_from)
);
create table if not exists public.tax_folios(
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.tax_folio_authorizations(id) on delete restrict,
  document_type_code integer not null,environment text not null,folio bigint not null,
  status text not null default 'AVAILABLE' check(status in('AVAILABLE','RESERVED','USED','VOIDED')),
  tax_document_id uuid,reserved_at timestamptz,used_at timestamptz,voided_at timestamptz,void_reason text,
  unique(environment,document_type_code,folio)
);
create or replace function public.finance_folio_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: los folios no se eliminan'; end if;
  if old.status in('USED','VOIDED') and new.status<>old.status then raise exception 'FINANCE_FOLIO: un folio usado o anulado nunca se reutiliza'; end if;
  if old.folio<>new.folio or old.document_type_code<>new.document_type_code or old.environment<>new.environment then raise exception 'FINANCE_IMMUTABLE: identidad de folio inmutable'; end if;
  return new;
end $$;
drop trigger if exists tax_folios_guard on public.tax_folios;
create trigger tax_folios_guard before update or delete on public.tax_folios for each row execute function public.finance_folio_guard();
create index if not exists tax_folios_available_idx on public.tax_folios(environment,document_type_code,folio) where status='AVAILABLE';

create table if not exists public.tax_documents(
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  document_type_code integer not null references public.tax_document_types(code) on delete restrict,
  folio bigint,provider text not null check(provider in('SII_DIRECT','EXTERNAL')),environment text not null check(environment in('CERTIFICATION','PRODUCTION')),
  status text not null default 'DRAFT' check(status in('DRAFT','VALIDATED','SIGNED','SUBMITTED','RECEIVED_BY_SII','ACCEPTED','ACCEPTED_WITH_REPAIRS','REJECTED','CANCELLED')),
  track_id text,submission_id text,submitted_at timestamptz,status_code text,status_message text,last_checked_at timestamptz,accepted_at timestamptz,rejected_at timestamptz,
  xml_unsigned_path text,xml_unsigned_sha256 text,xml_signed_path text,xml_signed_sha256 text,response_path text,pdf_path text,
  emitter_rut text,receiver_rut text,issue_date date,net_amount numeric(18,2),exempt_amount numeric(18,2),tax_amount numeric(18,2),total_amount numeric(18,2),
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(environment,document_type_code,folio)
);
-- Un DTE vigente por factura; uno rechazado/anulado queda como historia y permite un nuevo intento con otro folio.
create unique index if not exists tax_documents_invoice_active on public.tax_documents(invoice_id) where status not in('REJECTED','CANCELLED');
alter table public.invoices drop constraint if exists invoices_tax_document_fk;
alter table public.invoices add constraint invoices_tax_document_fk foreign key(tax_document_id) references public.tax_documents(id) on delete restrict;
create table if not exists public.tax_document_events(
  id uuid primary key default gen_random_uuid(),tax_document_id uuid not null references public.tax_documents(id) on delete restrict,
  status text not null,code text,message text,detail jsonb not null default '{}'::jsonb,actor_id uuid,occurred_at timestamptz not null default now()
);
create or replace function public.finance_tax_document_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: los documentos tributarios no se eliminan'; end if;
  if old.status in('ACCEPTED','ACCEPTED_WITH_REPAIRS','REJECTED') and (new.folio,new.total_amount,new.xml_signed_sha256) is distinct from (old.folio,old.total_amount,old.xml_signed_sha256) then
    raise exception 'FINANCE_IMMUTABLE: un DTE resuelto por el SII es inmutable';
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists tax_documents_guard on public.tax_documents;
create trigger tax_documents_guard before update or delete on public.tax_documents for each row execute function public.finance_tax_document_guard();

-- Asignación concurrente de folios: nunca entrega dos veces el mismo folio.
create or replace function public.finance_reserve_folio(p_type integer,p_environment text,p_tax_document uuid) returns bigint language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_folio bigint;
begin
  select folio into v_folio from public.tax_folios where tax_document_id=p_tax_document and status in('RESERVED','USED') limit 1;
  if v_folio is not null then return v_folio; end if;
  select id,folio into v_id,v_folio from public.tax_folios f
  where f.environment=p_environment and f.document_type_code=p_type and f.status='AVAILABLE'
    and exists(select 1 from public.tax_folio_authorizations a where a.id=f.authorization_id and a.status='ACTIVE')
  order by f.folio limit 1 for update skip locked;
  if v_id is null then raise exception 'FINANCE_NO_FOLIOS: no hay folios autorizados disponibles para el tipo % en %',p_type,p_environment; end if;
  update public.tax_folios set status='RESERVED',tax_document_id=p_tax_document,reserved_at=now() where id=v_id;
  update public.tax_documents set folio=v_folio where id=p_tax_document;
  return v_folio;
end $$;

create table if not exists public.received_tax_documents(
  id uuid primary key default gen_random_uuid(),
  issuer_rut text not null,issuer_name text not null,issuer_business_activity text,
  document_type_code integer not null references public.tax_document_types(code) on delete restrict,
  folio bigint not null,issue_date date not null,received_at timestamptz not null default now(),
  net_amount numeric(18,2) not null default 0,exempt_amount numeric(18,2) not null default 0,tax_amount numeric(18,2) not null default 0,
  other_taxes jsonb not null default '[]'::jsonb,total_amount numeric(18,2) not null,doc_references jsonb not null default '[]'::jsonb,
  xml_path text,xml_sha256 text,source text not null check(source in('XML_UPLOAD','PROVIDER','EMAIL','RCV_IMPORT','MANUAL')),
  signature_status text not null default 'NOT_VERIFIED' check(signature_status in('NOT_VERIFIED','VALID','INVALID')),
  validation_errors jsonb not null default '[]'::jsonb,
  vendor_id uuid,
  status text not null default 'RECEIVED' check(status in('RECEIVED','UNDER_REVIEW','ACCEPTED','REJECTED','CLAIMED')),
  tax_credit_classification text not null default 'PENDING_REVIEW' check(tax_credit_classification in('PENDING_REVIEW','DEL_GIRO','SUPERMERCADO','BIENES_RAICES','ACTIVO_FIJO','USO_COMUN','NO_RECUPERABLE','NO_CORRESPONDE')),
  tax_credit_eligible boolean,tax_credit_eligible_amount numeric(18,2),classification_reason text,reviewed_by uuid,reviewed_at timestamptz,
  expense_id uuid,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(issuer_rut,document_type_code,folio),
  check(tax_credit_classification='PENDING_REVIEW' or (tax_credit_eligible is not null and nullif(trim(classification_reason),'') is not null))
);

create table if not exists public.rcv_imports(
  id uuid primary key default gen_random_uuid(),register_type text not null check(register_type in('COMPRAS','VENTAS')),
  period_key text not null check(period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),file_name text not null,file_sha256 text not null,
  rows_total integer not null default 0,rows_valid integer not null default 0,rows_invalid integer not null default 0,
  column_mapping jsonb not null default '{}'::jsonb,errors jsonb not null default '[]'::jsonb,
  status text not null default 'IMPORTED' check(status in('IMPORTED','SUPERSEDED')),imported_by uuid,imported_at timestamptz not null default now(),
  unique(register_type,period_key,file_sha256)
);
create table if not exists public.rcv_entries(
  id uuid primary key default gen_random_uuid(),import_id uuid not null references public.rcv_imports(id) on delete restrict,
  register_type text not null,period_key text not null,counterpart_rut text not null,counterpart_name text,
  document_type_code integer not null,folio bigint not null,issue_date date,
  net_amount numeric(18,2) not null default 0,exempt_amount numeric(18,2) not null default 0,tax_amount numeric(18,2) not null default 0,
  tax_non_recoverable numeric(18,2) not null default 0,total_amount numeric(18,2) not null default 0,rcv_state text,purchase_type text,raw jsonb not null default '{}'::jsonb,
  match_status text not null default 'REVIEW_REQUIRED' check(match_status in('MATCHED','MISSING_LOCAL','AMOUNT_MISMATCH','STATUS_MISMATCH','REVIEW_REQUIRED')),
  matched_entity_id uuid,match_detail text,
  unique(import_id,counterpart_rut,document_type_code,folio)
);

-- ---------------------------------------------------------------------------------------------- proveedores, gastos y CxP
create table if not exists public.vendors(
  id uuid primary key default gen_random_uuid(),rut text not null unique,legal_name text not null,trade_name text,business_activity text,
  contact_name text,email text,phone text,address text,payment_terms_days integer not null default 30 check(payment_terms_days between 0 and 365),
  bank_name text,bank_account_type text,bank_account_last4 text check(bank_account_last4 is null or bank_account_last4 ~ '^[0-9]{1,4}$'),
  bank_account_encrypted text,bank_holder_rut text,
  status text not null default 'ACTIVE' check(status in('ACTIVE','INACTIVE','BLOCKED')),default_expense_category_id uuid,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.received_tax_documents drop constraint if exists received_tax_documents_vendor_fk;
alter table public.received_tax_documents add constraint received_tax_documents_vendor_fk foreign key(vendor_id) references public.vendors(id) on delete restrict;

create table if not exists public.expense_categories(
  id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,
  expense_account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  default_cost_center_id uuid references public.cost_centers(id) on delete restrict,active boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
insert into public.expense_categories(code,name,expense_account_id)
select v.code,v.name,a.id from(values('SOFTWARE','Software y suscripciones','5.2.03'),('ARRIENDO','Arriendos','5.2.02'),('TERCEROS','Servicios de terceros e infraestructura','5.1.02'),
  ('PROYECTOS','Costos directos de proyectos','5.1.01'),('MARKETING','Marketing','5.3.02'),('BANCARIOS','Comisiones bancarias','5.4.02'),('GENERALES','Gastos generales','5.2.04')) v(code,name,account)
join public.chart_of_accounts a on a.code=v.account on conflict(code) do nothing;
alter table public.vendors drop constraint if exists vendors_default_category_fk;
alter table public.vendors add constraint vendors_default_category_fk foreign key(default_expense_category_id) references public.expense_categories(id) on delete restrict;

create table if not exists public.approval_policies(
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check(entity_type in('EXPENSE','PAYABLE','VENDOR_PAYMENT','INVOICE','JOURNAL_ENTRY','COMMISSION')),
  name text not null,min_amount numeric(18,2) not null default 0,max_amount numeric(18,2),
  category_id uuid references public.expense_categories(id) on delete restrict,cost_center_id uuid references public.cost_centers(id) on delete restrict,department_code text,
  approver_role text not null,approver_user_id uuid,level integer not null default 1 check(level between 1 and 5),active boolean not null default true,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(max_amount is null or max_amount>=min_amount)
);
create table if not exists public.approval_requests(
  id uuid primary key default gen_random_uuid(),entity_type text not null,entity_id uuid not null,policy_id uuid references public.approval_policies(id) on delete restrict,
  level integer not null default 1,required_role text not null,required_user_id uuid,
  status text not null default 'PENDING' check(status in('PENDING','APPROVED','REJECTED','CANCELLED')),
  requested_by uuid,decided_by uuid,decided_at timestamptz,comment text,created_at timestamptz not null default now(),
  unique(entity_type,entity_id,level)
);

create table if not exists public.expenses(
  id uuid primary key default gen_random_uuid(),expense_number text not null unique default public.next_expense_number(),
  vendor_id uuid references public.vendors(id) on delete restrict,received_tax_document_id uuid unique references public.received_tax_documents(id) on delete restrict,
  expense_date date not null,document_type_code integer references public.tax_document_types(code) on delete restrict,document_number text,
  category_id uuid not null references public.expense_categories(id) on delete restrict,description text not null,
  net_amount numeric(18,2) not null default 0 check(net_amount>=0),exempt_amount numeric(18,2) not null default 0 check(exempt_amount>=0),
  tax_amount numeric(18,2) not null default 0 check(tax_amount>=0),total_amount numeric(18,2) not null check(total_amount>0),currency char(3) not null default 'CLP',
  tax_credit_classification text not null default 'PENDING_REVIEW' check(tax_credit_classification in('PENDING_REVIEW','DEL_GIRO','SUPERMERCADO','BIENES_RAICES','ACTIVO_FIJO','USO_COMUN','NO_RECUPERABLE','NO_CORRESPONDE')),
  tax_credit_eligible boolean,eligible_tax_amount numeric(18,2) not null default 0 check(eligible_tax_amount>=0),classification_reason text,reviewed_by uuid,reviewed_at timestamptz,
  cost_center_id uuid references public.cost_centers(id) on delete restrict,project_id uuid references public.projects(id) on delete restrict,client_id uuid references public.clients(id) on delete restrict,
  department_code text,responsible_user_id uuid,payment_method text check(payment_method is null or payment_method in('TRANSFER','CARD','CASH','CHECK','OTHER')),
  evidence_path text,evidence_sha256 text,
  status text not null default 'DRAFT' check(status in('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED')),
  approved_by uuid,approved_at timestamptz,payable_id uuid,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(total_amount=net_amount+exempt_amount+tax_amount),check(eligible_tax_amount<=tax_amount)
);
alter table public.received_tax_documents drop constraint if exists received_tax_documents_expense_fk;
alter table public.received_tax_documents add constraint received_tax_documents_expense_fk foreign key(expense_id) references public.expenses(id) on delete restrict;

create table if not exists public.payables(
  id uuid primary key default gen_random_uuid(),vendor_id uuid not null references public.vendors(id) on delete restrict,
  source_type text not null check(source_type in('EXPENSE','RECEIVED_DTE','MANUAL')),source_id uuid,document_number text,description text not null,
  amount numeric(18,2) not null check(amount>0),amount_paid numeric(18,2) not null default 0 check(amount_paid>=0),
  balance numeric(18,2) generated always as (amount-amount_paid) stored,currency char(3) not null default 'CLP',
  issue_date date,due_date date not null,
  status text not null default 'PENDING_REVIEW' check(status in('PENDING_REVIEW','APPROVED','SCHEDULED','PARTIALLY_PAID','PAID','DISPUTED','CANCELLED')),
  scheduled_for date,dispute_reason text,approved_by uuid,approved_at timestamptz,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(balance>=0)
);
create unique index if not exists payables_source_unique on public.payables(source_type,source_id) where source_id is not null;
alter table public.expenses drop constraint if exists expenses_payable_fk;
alter table public.expenses add constraint expenses_payable_fk foreign key(payable_id) references public.payables(id) on delete restrict;

create table if not exists public.bank_accounts(
  id uuid primary key default gen_random_uuid(),bank_name text not null,account_type text not null check(account_type in('CHECKING','SAVINGS','VISTA','OTHER')),
  account_number_last4 text not null check(account_number_last4 ~ '^[0-9]{1,4}$'),holder_name text,currency char(3) not null default 'CLP',
  ledger_account_id uuid not null references public.chart_of_accounts(id) on delete restrict,opening_balance numeric(18,2) not null default 0,opening_balance_date date,
  active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.vendor_payments(
  id uuid primary key default gen_random_uuid(),payment_number text not null unique default public.next_vendor_payment_number(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,amount numeric(18,2) not null check(amount>0),currency char(3) not null default 'CLP',
  payment_date date,method text not null default 'TRANSFER' check(method in('TRANSFER','CHECK','CASH','CARD','OTHER')),reference text,evidence_path text,
  bank_account_id uuid references public.bank_accounts(id) on delete restrict,bank_transaction_id uuid,
  status text not null default 'REQUESTED' check(status in('REQUESTED','APPROVED','EXECUTED','RECONCILED','CANCELLED')),
  requested_by uuid,approved_by uuid,approved_at timestamptz,executed_by uuid,executed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.vendor_payment_allocations(
  id uuid primary key default gen_random_uuid(),vendor_payment_id uuid not null references public.vendor_payments(id) on delete restrict,
  payable_id uuid not null references public.payables(id) on delete restrict,amount numeric(18,2) not null check(amount>0),created_at timestamptz not null default now(),
  reversed_at timestamptz,unique(vendor_payment_id,payable_id)
);

-- ---------------------------------------------------------------------------------------------- cobros
create table if not exists public.cash_accounts(
  id uuid primary key default gen_random_uuid(),name text not null,custodian_user_id uuid,currency char(3) not null default 'CLP',
  ledger_account_id uuid not null references public.chart_of_accounts(id) on delete restrict,active boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.cash_movements(
  id uuid primary key default gen_random_uuid(),cash_account_id uuid not null references public.cash_accounts(id) on delete restrict,movement_date date not null,
  direction text not null check(direction in('IN','OUT')),amount numeric(18,2) not null check(amount>0),description text not null,responsible_user_id uuid not null,
  evidence_path text,status text not null default 'RECORDED' check(status in('RECORDED','RECONCILED','VOIDED')),void_reason text,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.payments(
  id uuid primary key default gen_random_uuid(),payment_reference text not null unique default public.next_payment_reference(),
  client_id uuid not null references public.clients(id) on delete restrict,
  provider text not null check(provider in('BANK_TRANSFER','MERCADOPAGO','CASH','OTHER')),
  method text not null check(method in('TRANSFER','CARD','CASH','CHECK','WALLET','OTHER')),
  currency char(3) not null default 'CLP',gross_amount numeric(18,2) not null check(gross_amount>0),fee_amount numeric(18,2) not null default 0 check(fee_amount>=0),
  net_amount numeric(18,2) generated always as (gross_amount-fee_amount) stored,
  received_at timestamptz not null,
  status text not null default 'PENDING_VERIFICATION' check(status in('PENDING','PENDING_VERIFICATION','CONFIRMED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED','DISPUTED','CHARGEBACK')),
  external_id text,external_status text,allocated_amount numeric(18,2) not null default 0 check(allocated_amount>=0),refunded_amount numeric(18,2) not null default 0 check(refunded_amount>=0),
  unapplied_amount numeric(18,2) generated always as (gross_amount-allocated_amount-refunded_amount) stored,
  bank_account_id uuid references public.bank_accounts(id) on delete restrict,bank_transaction_id uuid,cash_movement_id uuid references public.cash_movements(id) on delete restrict,
  evidence_path text,notes text,recorded_by uuid,confirmed_by uuid,confirmed_at timestamptz,money_release_date date,
  settlement_status text not null default 'NOT_APPLICABLE' check(settlement_status in('NOT_APPLICABLE','PENDING','SETTLED')),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(fee_amount<=gross_amount),check(unapplied_amount>=0)
);
create unique index if not exists payments_external_unique on public.payments(provider,external_id) where external_id is not null;
create table if not exists public.payment_allocations(
  id uuid primary key default gen_random_uuid(),payment_id uuid not null references public.payments(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,amount numeric(18,2) not null check(amount>0),
  allocated_by uuid,allocated_at timestamptz not null default now(),reversed_at timestamptz,reversed_by uuid,reversal_reason text
);
create or replace function public.finance_payment_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: los pagos no se eliminan; usa devolución o anulación con evidencia'; end if;
  if old.status not in('PENDING','PENDING_VERIFICATION') and (new.gross_amount,new.client_id,new.received_at,new.currency) is distinct from (old.gross_amount,old.client_id,old.received_at,old.currency) then
    raise exception 'FINANCE_IMMUTABLE: un pago confirmado no cambia su monto ni cliente';
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists payments_guard on public.payments;
create trigger payments_guard before update or delete on public.payments for each row execute function public.finance_payment_guard();
create or replace function public.finance_no_delete() returns trigger language plpgsql as $$ begin raise exception 'FINANCE_IMMUTABLE: registro financiero no eliminable (%)',tg_table_name; end $$;

-- Saldos derivados de aplicaciones activas: factura y pago se recalculan en la misma transacción.
create or replace function public.finance_refresh_invoice_balance(p_invoice uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_paid numeric(18,2); v public.invoices%rowtype;
begin
  select coalesce(sum(amount),0) into v_paid from public.payment_allocations where invoice_id=p_invoice and reversed_at is null;
  select * into v from public.invoices where id=p_invoice for update;
  update public.invoices set amount_paid=v_paid,
    status=case when v.status in('ISSUED','PARTIALLY_PAID','PAID','CREDITED') then case
      when v.total_amount-v_paid-v.amount_credited<=0 and v_paid=0 and v.amount_credited>0 then 'CREDITED'
      when v.total_amount-v_paid-v.amount_credited<=0 and v.total_amount>0 then 'PAID'
      when v_paid>0 then 'PARTIALLY_PAID' else 'ISSUED' end else v.status end
  where id=p_invoice;
end $$;
create or replace function public.finance_allocate_payment(p_payment uuid,p_invoice uuid,p_amount numeric,p_actor uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare p public.payments%rowtype; i public.invoices%rowtype; v_id uuid;
begin
  if p_amount is null or p_amount<=0 then raise exception 'FINANCE_AMOUNT: el monto a aplicar debe ser positivo'; end if;
  select * into p from public.payments where id=p_payment for update;
  select * into i from public.invoices where id=p_invoice for update;
  if p.id is null or i.id is null then raise exception 'FINANCE_NOT_FOUND'; end if;
  if p.status not in('CONFIRMED','PARTIALLY_REFUNDED') then raise exception 'FINANCE_STATE: sólo se aplican pagos confirmados (estado %)',p.status; end if;
  if i.status not in('ISSUED','PARTIALLY_PAID') then raise exception 'FINANCE_STATE: la factura no está emitida o ya está pagada (estado %)',i.status; end if;
  if i.document_type_code in(61) then raise exception 'FINANCE_STATE: una nota de crédito no recibe pagos'; end if;
  if p.client_id<>i.client_id then raise exception 'FINANCE_CLIENT: el pago y la factura pertenecen a clientes distintos'; end if;
  if p.currency<>i.currency then raise exception 'FINANCE_CURRENCY: monedas distintas'; end if;
  if p_amount>p.unapplied_amount then raise exception 'FINANCE_AMOUNT: excede el saldo sin aplicar del pago (%)',p.unapplied_amount; end if;
  if p_amount>i.balance_due then raise exception 'FINANCE_AMOUNT: excede el saldo de la factura (%)',i.balance_due; end if;
  insert into public.payment_allocations(payment_id,invoice_id,amount,allocated_by) values(p_payment,p_invoice,p_amount,p_actor) returning id into v_id;
  update public.payments set allocated_amount=allocated_amount+p_amount where id=p_payment;
  perform public.finance_refresh_invoice_balance(p_invoice);
  return v_id;
end $$;
create or replace function public.finance_reverse_allocation(p_allocation uuid,p_actor uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare a public.payment_allocations%rowtype;
begin
  if nullif(trim(p_reason),'') is null then raise exception 'FINANCE_REASON: motivo obligatorio'; end if;
  select * into a from public.payment_allocations where id=p_allocation for update;
  if a.id is null then raise exception 'FINANCE_NOT_FOUND'; end if;
  if a.reversed_at is not null then raise exception 'FINANCE_STATE: la aplicación ya fue revertida'; end if;
  update public.payment_allocations set reversed_at=now(),reversed_by=p_actor,reversal_reason=p_reason where id=p_allocation;
  update public.payments set allocated_amount=allocated_amount-a.amount where id=a.payment_id;
  perform public.finance_refresh_invoice_balance(a.invoice_id);
end $$;
create or replace function public.finance_allocation_guard() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: las aplicaciones se revierten, no se eliminan'; end if;
  if (new.payment_id,new.invoice_id,new.amount) is distinct from (old.payment_id,old.invoice_id,old.amount) or (old.reversed_at is not null and new.reversed_at is distinct from old.reversed_at) then raise exception 'FINANCE_IMMUTABLE: aplicación inmutable'; end if;
  return new;
end $$;
drop trigger if exists payment_allocations_guard on public.payment_allocations;
create trigger payment_allocations_guard before update or delete on public.payment_allocations for each row execute function public.finance_allocation_guard();

create table if not exists public.payment_refunds(
  id uuid primary key default gen_random_uuid(),payment_id uuid not null references public.payments(id) on delete restrict,amount numeric(18,2) not null check(amount>0),
  reason text not null,status text not null default 'REQUESTED' check(status in('REQUESTED','PROCESSING','REFUNDED','FAILED')),provider_refund_id text,
  evidence_path text,failure_reason text,requested_by uuid,processed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.payment_provider_events(
  id uuid primary key default gen_random_uuid(),provider text not null,event_key text not null,event_type text,external_id text,
  signature_valid boolean not null,payload_sha256 text not null,status text not null default 'RECEIVED' check(status in('RECEIVED','PROCESSED','IGNORED','FAILED')),
  error text,received_at timestamptz not null default now(),processed_at timestamptz,unique(provider,event_key)
);
create table if not exists public.payment_links(
  id uuid primary key default gen_random_uuid(),invoice_id uuid not null references public.invoices(id) on delete restrict,client_id uuid not null references public.clients(id) on delete restrict,
  token_hash text not null unique check(char_length(token_hash)=64),scope text not null default 'PAY_INVOICE' check(scope in('PAY_INVOICE','VIEW_INVOICE')),
  expires_at timestamptz not null,created_by uuid,created_at timestamptz not null default now(),revoked_at timestamptz,last_used_at timestamptz
);

-- ---------------------------------------------------------------------------------------------- cobranza
create table if not exists public.collection_activities(
  id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id) on delete restrict,invoice_id uuid references public.invoices(id) on delete restrict,
  activity_type text not null check(activity_type in('EMAIL','CALL','WHATSAPP','MEETING','NOTE','REMINDER','PROMISE')),outcome text,notes text,
  performed_by uuid,occurred_at timestamptz not null default now(),created_at timestamptz not null default now()
);
create table if not exists public.payment_promises(
  id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id) on delete restrict,invoice_id uuid references public.invoices(id) on delete restrict,
  amount numeric(18,2) not null check(amount>0),promised_date date not null,responsible_user_id uuid,
  status text not null default 'OPEN' check(status in('OPEN','KEPT','BROKEN','RESCHEDULED')),rescheduled_to_id uuid references public.payment_promises(id) on delete restrict,
  notes text,created_by uuid,created_at timestamptz not null default now(),resolved_at timestamptz
);
create table if not exists public.collection_reminder_rules(
  id uuid primary key default gen_random_uuid(),offset_days integer not null unique check(offset_days between -30 and 120),channel text not null default 'EMAIL' check(channel in('EMAIL')),
  subject_template text not null,body_template text not null,active boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
insert into public.collection_reminder_rules(offset_days,subject_template,body_template) values
(-3,'Recordatorio: {invoiceLabel} vence el {dueDate}','Estimado cliente, le recordamos que {invoiceLabel} por {balance} vence el {dueDate}.'),
(0,'{invoiceLabel} vence hoy','Estimado cliente, {invoiceLabel} por {balance} vence hoy {dueDate}.'),
(3,'{invoiceLabel} se encuentra vencida','Estimado cliente, {invoiceLabel} por {balance} venció el {dueDate}. Si ya pagó, ignore este mensaje.'),
(7,'Seguimiento de {invoiceLabel}','Estimado cliente, {invoiceLabel} mantiene un saldo de {balance} vencido desde el {dueDate}.'),
(15,'Saldo vencido de {invoiceLabel}','Estimado cliente, {invoiceLabel} mantiene un saldo de {balance} vencido desde el {dueDate}. Contáctenos para regularizar.')
on conflict(offset_days) do nothing;
create table if not exists public.collection_reminders(
  id uuid primary key default gen_random_uuid(),invoice_id uuid not null references public.invoices(id) on delete restrict,rule_id uuid references public.collection_reminder_rules(id) on delete restrict,
  offset_days integer not null,channel text not null,status text not null check(status in('SENT','PROVIDER_NOT_CONFIGURED','NO_ADDRESS','FAILED','SKIPPED')),
  recipient text,provider_reference text,error text,sent_at timestamptz,created_at timestamptz not null default now(),unique(invoice_id,offset_days,channel)
);

-- ---------------------------------------------------------------------------------------------- bancos y conciliación
create table if not exists public.bank_statement_imports(
  id uuid primary key default gen_random_uuid(),bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,file_name text not null,file_sha256 text not null,
  file_format text not null check(file_format in('CSV','XLSX')),column_mapping jsonb not null default '{}'::jsonb,
  rows_total integer not null default 0,rows_valid integer not null default 0,rows_invalid integer not null default 0,rows_duplicate integer not null default 0,
  errors jsonb not null default '[]'::jsonb,status text not null default 'IMPORTED' check(status in('IMPORTED','REJECTED')),imported_by uuid,imported_at timestamptz not null default now(),
  unique(bank_account_id,file_sha256)
);
create table if not exists public.bank_transactions(
  id uuid primary key default gen_random_uuid(),bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,import_id uuid references public.bank_statement_imports(id) on delete restrict,
  transaction_date date not null,description text not null,amount numeric(18,2) not null check(amount>0),direction text not null check(direction in('CREDIT','DEBIT')),
  reference text,balance numeric(18,2),external_hash text not null,
  reconciliation_status text not null default 'UNRECONCILED' check(reconciliation_status in('UNRECONCILED','PARTIALLY_RECONCILED','RECONCILED','IGNORED')),
  reconciled_amount numeric(18,2) not null default 0 check(reconciled_amount>=0),ignored_reason text,ignored_by uuid,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(bank_account_id,external_hash),check(reconciled_amount<=amount)
);
alter table public.payments drop constraint if exists payments_bank_transaction_fk;
alter table public.payments add constraint payments_bank_transaction_fk foreign key(bank_transaction_id) references public.bank_transactions(id) on delete restrict;
alter table public.vendor_payments drop constraint if exists vendor_payments_bank_transaction_fk;
alter table public.vendor_payments add constraint vendor_payments_bank_transaction_fk foreign key(bank_transaction_id) references public.bank_transactions(id) on delete restrict;
create table if not exists public.reconciliation_matches(
  id uuid primary key default gen_random_uuid(),bank_transaction_id uuid not null references public.bank_transactions(id) on delete restrict,
  target_type text not null check(target_type in('PAYMENT','VENDOR_PAYMENT','JOURNAL_ENTRY','PROVIDER_PAYOUT','CASH_MOVEMENT','COMMISSION_PAYMENT','REFUND')),
  target_id uuid not null,amount numeric(18,2) not null check(amount>0),match_group uuid not null default gen_random_uuid(),
  match_kind text not null check(match_kind in('MATCH','SPLIT','MERGE','CREATED')),confidence numeric(5,4),
  status text not null default 'ACTIVE' check(status in('ACTIVE','UNDONE')),created_by uuid,created_at timestamptz not null default now(),
  undone_by uuid,undone_at timestamptz,undo_reason text
);
create or replace function public.finance_refresh_bank_transaction(p_tx uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_sum numeric(18,2); t public.bank_transactions%rowtype;
begin
  select * into t from public.bank_transactions where id=p_tx for update;
  select coalesce(sum(amount),0) into v_sum from public.reconciliation_matches where bank_transaction_id=p_tx and status='ACTIVE';
  if v_sum>t.amount then raise exception 'FINANCE_AMOUNT: la conciliación excede el monto del movimiento'; end if;
  update public.bank_transactions set reconciled_amount=v_sum,updated_at=now(),
    reconciliation_status=case when t.reconciliation_status='IGNORED' and v_sum=0 then 'IGNORED' when v_sum=0 then 'UNRECONCILED' when v_sum<t.amount then 'PARTIALLY_RECONCILED' else 'RECONCILED' end
  where id=p_tx;
end $$;
create or replace function public.finance_match_trigger() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: las conciliaciones se deshacen con motivo, no se eliminan'; end if;
  perform public.finance_refresh_bank_transaction(new.bank_transaction_id);
  return new;
end $$;
drop trigger if exists reconciliation_matches_refresh on public.reconciliation_matches;
create trigger reconciliation_matches_refresh after insert or update on public.reconciliation_matches for each row execute function public.finance_match_trigger();
drop trigger if exists reconciliation_matches_no_delete on public.reconciliation_matches;
create trigger reconciliation_matches_no_delete before delete on public.reconciliation_matches for each row execute function public.finance_no_delete();
drop trigger if exists bank_transactions_no_delete on public.bank_transactions;
create trigger bank_transactions_no_delete before delete on public.bank_transactions for each row execute function public.finance_no_delete();

-- ---------------------------------------------------------------------------------------------- presupuestos, comisiones, costos
create table if not exists public.budgets(
  id uuid primary key default gen_random_uuid(),name text not null,fiscal_year integer not null check(fiscal_year between 2000 and 2100),
  scope_type text not null default 'COMPANY' check(scope_type in('COMPANY','DEPARTMENT','COST_CENTER','PROJECT')),
  cost_center_id uuid references public.cost_centers(id) on delete restrict,project_id uuid references public.projects(id) on delete restrict,department_code text,
  status text not null default 'DRAFT' check(status in('DRAFT','APPROVED','ARCHIVED')),approved_by uuid,approved_at timestamptz,created_by uuid,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.budget_lines(
  id uuid primary key default gen_random_uuid(),budget_id uuid not null references public.budgets(id) on delete restrict,account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  period_key text not null check(period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),amount numeric(18,2) not null check(amount>=0),
  cost_center_id uuid references public.cost_centers(id) on delete restrict,project_id uuid references public.projects(id) on delete restrict,notes text,created_at timestamptz not null default now()
);
create unique index if not exists budget_lines_unique on public.budget_lines(budget_id,account_id,period_key,coalesce(cost_center_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table if not exists public.commission_finance_policies(
  id uuid primary key default gen_random_uuid(),name text not null,trigger_type text not null check(trigger_type in('INVOICE_PAID','COLLECTED_PERCENT','PERIOD_END')),
  collected_percent numeric(5,2) check(collected_percent is null or collected_percent between 1 and 100),user_id uuid,commission_rule_id uuid references public.commission_rules(id) on delete restrict,
  active boolean not null default true,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(trigger_type<>'COLLECTED_PERCENT' or collected_percent is not null)
);
create table if not exists public.commission_payments(
  id uuid primary key default gen_random_uuid(),commission_id uuid not null unique references public.commissions(id) on delete restrict,amount numeric(18,2) not null check(amount>0),
  payable_date date,status text not null default 'APPROVED' check(status in('APPROVED','PAID','CANCELLED')),approved_by uuid,approved_at timestamptz,
  paid_at timestamptz,payment_reference text,bank_account_id uuid references public.bank_accounts(id) on delete restrict,evidence_path text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.cost_rates(
  id uuid primary key default gen_random_uuid(),user_id uuid not null,hourly_cost numeric(18,2) not null check(hourly_cost>0),currency char(3) not null default 'CLP',
  effective_from date not null,effective_to date,created_by uuid,created_at timestamptz not null default now(),check(effective_to is null or effective_to>=effective_from)
);
create table if not exists public.scheduled_costs(
  id uuid primary key default gen_random_uuid(),name text not null,category_id uuid references public.expense_categories(id) on delete restrict,vendor_id uuid references public.vendors(id) on delete restrict,
  amount numeric(18,2) not null check(amount>0),currency char(3) not null default 'CLP',frequency text not null check(frequency in('MONTHLY','QUARTERLY','ANNUAL','ONE_TIME')),
  next_date date not null,end_date date,cost_center_id uuid references public.cost_centers(id) on delete restrict,active boolean not null default true,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.forecast_scenarios(
  id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,description text,
  collection_factors jsonb not null,recurring_factor numeric(5,4) not null default 1,expense_factor numeric(5,4) not null default 1,active boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
insert into public.forecast_scenarios(code,name,description,collection_factors,recurring_factor,expense_factor) values
('BASE','Base','Supuestos contractuales: todo saldo se cobra en su fecha de vencimiento.','{"CURRENT":1,"D1_30":1,"D31_60":1,"D61_90":1,"D90_PLUS":1}'::jsonb,1,1),
('CONSERVATIVE','Conservador','Supuesto configurable: castiga saldos vencidos según antigüedad.','{"CURRENT":0.95,"D1_30":0.8,"D31_60":0.6,"D61_90":0.4,"D90_PLUS":0.1}'::jsonb,0.95,1.05),
('OPTIMISTIC','Optimista','Supuesto configurable: cobra la totalidad y mantiene recurrencia completa.','{"CURRENT":1,"D1_30":1,"D31_60":0.9,"D61_90":0.75,"D90_PLUS":0.4}'::jsonb,1,0.95)
on conflict(code) do nothing;

-- ---------------------------------------------------------------------------------------------- cierre
create table if not exists public.close_checklist_items(
  id uuid primary key default gen_random_uuid(),code text not null unique,label text not null,description text,
  check_type text not null check(check_type in('AUTO','MANUAL')),auto_check_key text,blocking boolean not null default true,sort_order integer not null default 0,active boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(check_type<>'AUTO' or auto_check_key is not null)
);
insert into public.close_checklist_items(code,label,check_type,auto_check_key,blocking,sort_order) values
('DTE_ISSUED','DTE emitidos conciliados (sin pendientes ni rechazos)','AUTO','DTE_PENDING',true,10),
('DTE_RECEIVED','DTE recibidos revisados y clasificados','AUTO','RECEIVED_DOCS_REVIEW',true,20),
('BANKS','Bancos conciliados','AUTO','BANK_UNRECONCILED',true,30),
('CASH','Caja conciliada','MANUAL',null,false,40),
('AR','Cuentas por cobrar revisadas','MANUAL',null,true,50),
('AP','Cuentas por pagar revisadas','MANUAL',null,true,60),
('VAT','IVA revisado (preparación F29 revisada)','AUTO','VAT_REVIEWED',true,70),
('COMMISSIONS','Comisiones del período procesadas','AUTO','COMMISSIONS_PENDING',false,80),
('EXPENSES','Gastos del período aprobados o rechazados','AUTO','EXPENSES_PENDING',true,90),
('DEPRECIATION','Depreciaciones cuando corresponda','MANUAL',null,false,100),
('ENTRIES','Asientos pendientes contabilizados o descartados','AUTO','DRAFT_ENTRIES',true,110),
('DOCUMENTS','Documentos pendientes de contabilizar','AUTO','UNPOSTED_EVENTS',true,120)
on conflict(code) do nothing;
create table if not exists public.period_close_runs(
  id uuid primary key default gen_random_uuid(),period_id uuid not null unique references public.accounting_periods(id) on delete restrict,
  status text not null default 'IN_PROGRESS' check(status in('IN_PROGRESS','BLOCKED','READY','CLOSED')),started_by uuid,started_at timestamptz not null default now(),
  closed_by uuid,closed_at timestamptz,updated_at timestamptz not null default now()
);
create table if not exists public.period_close_tasks(
  id uuid primary key default gen_random_uuid(),close_run_id uuid not null references public.period_close_runs(id) on delete restrict,
  checklist_item_id uuid not null references public.close_checklist_items(id) on delete restrict,
  status text not null default 'PENDING' check(status in('PENDING','OK','BLOCKED','WAIVED','NOT_APPLICABLE')),result jsonb not null default '{}'::jsonb,
  responsible_user_id uuid,evidence_path text,notes text,checked_at timestamptz,checked_by uuid,unique(close_run_id,checklist_item_id),
  check(status<>'WAIVED' or nullif(trim(notes),'') is not null)
);
create table if not exists public.period_snapshots(
  id uuid primary key default gen_random_uuid(),period_id uuid not null references public.accounting_periods(id) on delete restrict,version integer not null,
  trial_balance jsonb not null,income_statement jsonb not null,balance_sheet jsonb not null,sha256 text not null,created_by uuid,created_at timestamptz not null default now(),
  unique(period_id,version)
);
drop trigger if exists period_snapshots_no_delete on public.period_snapshots;
create trigger period_snapshots_no_delete before delete on public.period_snapshots for each row execute function public.finance_no_delete();
create or replace function public.finance_snapshot_guard() returns trigger language plpgsql as $$ begin raise exception 'FINANCE_IMMUTABLE: los snapshots de cierre son inmutables'; end $$;
drop trigger if exists period_snapshots_immutable on public.period_snapshots;
create trigger period_snapshots_immutable before update on public.period_snapshots for each row execute function public.finance_snapshot_guard();

-- Cierre atómico: sin borradores en el período, con snapshot inmutable y estado CLOSED.
create or replace function public.finance_close_period(p_period uuid,p_actor uuid,p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v public.accounting_periods%rowtype; v_drafts integer; v_version integer; v_snapshot uuid;
begin
  select * into v from public.accounting_periods where id=p_period for update;
  if v.id is null then raise exception 'FINANCE_NOT_FOUND'; end if;
  if v.status not in('OPEN','CLOSING') then raise exception 'FINANCE_STATE: el período ya está %',v.status; end if;
  select count(*) into v_drafts from public.journal_entries where period_id=p_period and status in('DRAFT','PENDING_REVIEW');
  if v_drafts>0 then raise exception 'FINANCE_CLOSE_BLOCKED: existen % asientos sin contabilizar en el período',v_drafts; end if;
  select coalesce(max(version),0)+1 into v_version from public.period_snapshots where period_id=p_period;
  insert into public.period_snapshots(period_id,version,trial_balance,income_statement,balance_sheet,sha256,created_by)
  values(p_period,v_version,p_snapshot->'trialBalance',p_snapshot->'incomeStatement',p_snapshot->'balanceSheet',p_snapshot->>'sha256',p_actor) returning id into v_snapshot;
  update public.accounting_periods set status='CLOSED',closed_at=now(),closed_by=p_actor,updated_at=now() where id=p_period;
  update public.period_close_runs set status='CLOSED',closed_by=p_actor,closed_at=now(),updated_at=now() where period_id=p_period;
  return jsonb_build_object('snapshotId',v_snapshot,'version',v_version);
end $$;

-- ---------------------------------------------------------------------------------------------- tributario
create table if not exists public.tax_obligations(
  id uuid primary key default gen_random_uuid(),code text not null,name text not null,tax_type text not null,period_key text not null,due_date date not null,
  status text not null default 'PENDING' check(status in('PENDING','IN_PREPARATION','READY','FILED_EXTERNALLY','PAID','NOT_APPLICABLE')),
  responsible_user_id uuid,source_reference text not null,filed_reference text,filed_evidence_path text,filed_at timestamptz,notes text,
  created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(code,period_key),
  check(status not in('FILED_EXTERNALLY','PAID') or (filed_reference is not null and filed_evidence_path is not null))
);
create table if not exists public.f29_preparations(
  id uuid primary key default gen_random_uuid(),period_key text not null unique check(period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status text not null default 'PREPARATION' check(status in('PREPARATION','REVIEW_REQUIRED','REVIEWED','READY','FILED_EXTERNALLY','SUBMITTED','ACCEPTED')),
  lines jsonb not null default '[]'::jsonb,totals jsonb not null default '{}'::jsonb,ppm_rate numeric(9,6),notes text,
  prepared_by uuid,prepared_at timestamptz,reviewed_by uuid,reviewed_at timestamptz,filed_reference text,filed_evidence_path text,filed_at timestamptz,accepted_evidence_path text,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(status not in('FILED_EXTERNALLY','SUBMITTED','ACCEPTED') or (filed_reference is not null and filed_evidence_path is not null)),
  check(status<>'ACCEPTED' or accepted_evidence_path is not null)
);

-- ---------------------------------------------------------------------------------------------- eventos, notificaciones, auditoría
create table if not exists public.finance_events(
  id uuid primary key default gen_random_uuid(),aggregate_type text not null,aggregate_id uuid not null,event_type text not null,actor_id uuid,
  client_id uuid references public.clients(id) on delete restrict,project_id uuid references public.projects(id) on delete restrict,
  title text not null,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now()
);
create table if not exists public.finance_notifications(
  id uuid primary key default gen_random_uuid(),event_key text not null unique,user_id uuid,audience_role text,type text not null,title text not null,body text,
  entity_type text not null,entity_id uuid not null,href text,severity text not null default 'INFO' check(severity in('INFO','WARNING','CRITICAL')),
  read_at timestamptz,created_at timestamptz not null default now(),check(user_id is not null or audience_role is not null)
);
create table if not exists public.finance_audit_events(
  id uuid primary key default gen_random_uuid(),actor_id uuid,actor_role text,action text not null,entity_type text not null,entity_id uuid,
  summary text not null,metadata jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now()
);
create or replace function public.finance_append_only() returns trigger language plpgsql as $$ begin raise exception 'FINANCE_IMMUTABLE: la auditoría financiera es sólo de inserción'; end $$;
drop trigger if exists finance_audit_events_append_only on public.finance_audit_events;
create trigger finance_audit_events_append_only before update or delete on public.finance_audit_events for each row execute function public.finance_append_only();
create table if not exists public.finance_idempotency_keys(idempotency_key text not null,operation text not null,resource_id uuid not null,created_at timestamptz not null default now(),primary key(idempotency_key,operation));
create table if not exists public.finance_analysis_runs(
  id uuid primary key default gen_random_uuid(),question text not null,intent text not null,period_from date,period_to date,
  result jsonb not null,sources jsonb not null default '[]'::jsonb,created_by uuid,created_at timestamptz not null default now()
);

-- Client 360 y Project Activity consumen los hitos financieros relevantes.
create or replace function public.finance_activity_projection() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.client_id is not null and new.event_type in('INVOICE_ISSUED','DTE_REJECTED','PAYMENT_RECEIVED','PAYMENT_ALLOCATED','PAYMENT_REFUNDED','CREDIT_NOTE_ISSUED','PAYMENT_PROMISE_CREATED','COLLECTION_ACTIVITY') then
    insert into public.client_events(client_id,event_type,title,actor_id,visibility,metadata,occurred_at)
    values(new.client_id,'FINANCE_'||new.event_type,new.title,new.actor_id,'INTERNAL_ONLY',jsonb_build_object('financeEventId',new.id,'aggregateType',new.aggregate_type,'aggregateId',new.aggregate_id),new.occurred_at);
  end if;
  return new;
end $$;
drop trigger if exists finance_events_activity on public.finance_events;
create trigger finance_events_activity after insert on public.finance_events for each row execute function public.finance_activity_projection();
-- Outbox transaccional: cada hito financiero queda disponible para integraciones en la misma transacción.
create or replace function public.finance_outbox_projection() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload)
  values('FINANCE_'||new.aggregate_type,new.aggregate_id,new.event_type,jsonb_build_object('financeEventId',new.id,'clientId',new.client_id,'projectId',new.project_id,'title',new.title,'occurredAt',new.occurred_at)||new.payload);
  return new;
end $$;
drop trigger if exists finance_events_outbox on public.finance_events;
create trigger finance_events_outbox after insert on public.finance_events for each row execute function public.finance_outbox_projection();

-- ---------------------------------------------------------------------------------------------- reportes base (saldos por cuenta)
create or replace function public.finance_account_balances(p_from date,p_to date) returns table(account_id uuid,opening numeric,debit numeric,credit numeric) language sql stable security definer set search_path=public as $$
  select l.account_id,
    coalesce(sum(l.debit-l.credit) filter(where e.entry_date<p_from),0)::numeric,
    coalesce(sum(l.debit) filter(where e.entry_date between p_from and p_to),0)::numeric,
    coalesce(sum(l.credit) filter(where e.entry_date between p_from and p_to),0)::numeric
  from public.journal_entry_lines l join public.journal_entries e on e.id=l.journal_entry_id
  where e.status in('POSTED','REVERSED') and e.entry_date<=p_to
  group by l.account_id
$$;

-- ---------------------------------------------------------------------------------------------- índices
create index if not exists journal_entries_date_idx on public.journal_entries(entry_date,status);
create index if not exists journal_entries_period_idx on public.journal_entries(period_id,status);
create index if not exists journal_entries_source_idx on public.journal_entries(source_type,source_id);
create index if not exists journal_lines_account_idx on public.journal_entry_lines(account_id);
create index if not exists journal_lines_client_idx on public.journal_entry_lines(client_id) where client_id is not null;
create index if not exists journal_lines_project_idx on public.journal_entry_lines(project_id) where project_id is not null;
create index if not exists invoices_client_status_idx on public.invoices(client_id,status,due_date);
create index if not exists invoices_due_idx on public.invoices(due_date) where status in('ISSUED','PARTIALLY_PAID');
create index if not exists invoices_sale_idx on public.invoices(sale_id) where sale_id is not null;
create index if not exists invoices_issue_idx on public.invoices(issue_date,status);
create index if not exists payments_client_idx on public.payments(client_id,status,received_at desc);
create index if not exists payment_allocations_invoice_idx on public.payment_allocations(invoice_id) where reversed_at is null;
create index if not exists payment_allocations_payment_idx on public.payment_allocations(payment_id) where reversed_at is null;
create index if not exists bank_transactions_status_idx on public.bank_transactions(bank_account_id,reconciliation_status,transaction_date);
create index if not exists reconciliation_matches_target_idx on public.reconciliation_matches(target_type,target_id) where status='ACTIVE';
create index if not exists payables_due_idx on public.payables(due_date,status);
create index if not exists expenses_status_idx on public.expenses(status,expense_date);
create index if not exists received_docs_status_idx on public.received_tax_documents(tax_credit_classification,issue_date);
create index if not exists tax_documents_status_idx on public.tax_documents(status,last_checked_at);
create index if not exists accounting_events_status_idx on public.accounting_events(status,occurred_on);
create index if not exists finance_events_client_idx on public.finance_events(client_id,occurred_at desc);
create index if not exists finance_audit_entity_idx on public.finance_audit_events(entity_type,entity_id,occurred_at desc);
create index if not exists payment_promises_status_idx on public.payment_promises(status,promised_date);

do $$ declare t text; begin
  foreach t in array array['chart_of_accounts','cost_centers','accounting_rules','tax_rules','billing_schedules','vendors','expense_categories','approval_policies','expenses','payables','bank_accounts','vendor_payments','cash_accounts','cash_movements','payment_refunds','collection_reminder_rules','budgets','commission_finance_policies','commission_payments','scheduled_costs','forecast_scenarios','close_checklist_items','tax_obligations','f29_preparations','received_tax_documents','dte_certificates'] loop
    execute format('drop trigger if exists %I on public.%I',t||'_touch_updated_at',t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',t||'_touch_updated_at',t);
  end loop;
  foreach t in array array['payments','tax_documents','vendor_payment_allocations','payment_refunds','cash_movements','expenses','payables','vendor_payments','received_tax_documents','commission_payments','finance_events','tax_document_events','accounting_events','rcv_entries','rcv_imports','bank_statement_imports'] loop
    execute format('drop trigger if exists %I on public.%I',t||'_no_delete',t);
    execute format('create trigger %I before delete on public.%I for each row execute function public.finance_no_delete()',t||'_no_delete',t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------- RLS / RBAC
do $$ declare t text; begin
  foreach t in array array['finance_settings','chart_of_accounts','cost_centers','accounting_periods','journal_entries','journal_entry_lines','accounting_rules','accounting_rule_versions','accounting_events','tax_rules','tax_rule_versions','tax_document_types','billing_schedules','invoices','invoice_lines','billing_schedule_runs','dte_certificates','tax_folio_authorizations','tax_folios','tax_documents','tax_document_events','received_tax_documents','rcv_imports','rcv_entries','vendors','expense_categories','approval_policies','approval_requests','expenses','payables','bank_accounts','vendor_payments','vendor_payment_allocations','cash_accounts','cash_movements','payments','payment_allocations','payment_refunds','payment_provider_events','payment_links','collection_activities','payment_promises','collection_reminder_rules','collection_reminders','bank_statement_imports','bank_transactions','reconciliation_matches','budgets','budget_lines','commission_finance_policies','commission_payments','cost_rates','scheduled_costs','forecast_scenarios','close_checklist_items','period_close_runs','period_close_tasks','period_snapshots','tax_obligations','f29_preparations','finance_events','finance_notifications','finance_audit_events','finance_idempotency_keys','finance_analysis_runs'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create or replace function private.can_manage_finance() returns boolean language sql stable security definer set search_path=public as $$ select private.zyteron_role() in('GERENTE_GENERAL','FINANZAS') $$;
create or replace function private.can_view_accounting() returns boolean language sql stable security definer set search_path=public as $$ select private.zyteron_role() in('GERENTE_GENERAL','FINANZAS','CONTADOR') $$;
-- Ventas ve facturación y cobranza comercial; la ejecutiva sólo de sus clientes. Nunca el libro contable.
create or replace function private.can_view_billing(target_client uuid) returns boolean language sql stable security definer set search_path=public as $$
  select private.can_view_accounting() or private.zyteron_role() in('JEFE_VENTAS','COMERCIAL')
    or (private.zyteron_role()='EJECUTIVA_VENTAS' and exists(select 1 from public.clients c where c.id=target_client and (c.account_executive_id=auth.uid()
        or exists(select 1 from public.client_assignments a where a.client_id=c.id and a.user_id=auth.uid() and a.active))))
$$;
create or replace function private.portal_finance_client() returns uuid language sql stable security definer set search_path=public as $$
  select p.client_id from public.client_portal_users p join public.client_portal_settings s on s.client_id=p.client_id
  where p.auth_user_id=auth.uid() and p.status='ACTIVE' and s.enabled and s.invoices_visible and private.zyteron_role()='PORTAL_CLIENT' limit 1
$$;

do $$ declare t text; begin
  foreach t in array array['finance_settings','chart_of_accounts','cost_centers','accounting_periods','journal_entries','journal_entry_lines','accounting_rules','accounting_rule_versions','accounting_events','tax_rules','tax_rule_versions','tax_document_types','dte_certificates','tax_folio_authorizations','tax_folios','tax_document_events','received_tax_documents','rcv_imports','rcv_entries','vendors','expense_categories','approval_policies','approval_requests','expenses','payables','bank_accounts','vendor_payments','vendor_payment_allocations','cash_accounts','cash_movements','payment_refunds','payment_provider_events','collection_reminder_rules','collection_reminders','bank_statement_imports','bank_transactions','reconciliation_matches','budgets','budget_lines','commission_finance_policies','commission_payments','cost_rates','scheduled_costs','forecast_scenarios','close_checklist_items','period_close_runs','period_close_tasks','period_snapshots','tax_obligations','f29_preparations','finance_analysis_runs'] loop
    execute format('drop policy if exists finance_accounting_read on public.%I',t);
    execute format('create policy finance_accounting_read on public.%I for select to authenticated using(private.can_view_accounting())',t);
  end loop;
  foreach t in array array['invoices','payments','payment_promises','collection_activities','billing_schedules','payment_links'] loop
    execute format('drop policy if exists finance_billing_read on public.%I',t);
    execute format('create policy finance_billing_read on public.%I for select to authenticated using(private.can_view_billing(client_id))',t);
  end loop;
  drop policy if exists finance_billing_read on public.invoice_lines;
  create policy finance_billing_read on public.invoice_lines for select to authenticated using(exists(select 1 from public.invoices i where i.id=invoice_id and private.can_view_billing(i.client_id)));
  drop policy if exists finance_billing_read on public.payment_allocations;
  create policy finance_billing_read on public.payment_allocations for select to authenticated using(exists(select 1 from public.invoices i where i.id=invoice_id and private.can_view_billing(i.client_id)));
  drop policy if exists finance_billing_read on public.tax_documents;
  create policy finance_billing_read on public.tax_documents for select to authenticated using(exists(select 1 from public.invoices i where i.id=invoice_id and private.can_view_billing(i.client_id)));
  drop policy if exists finance_billing_read on public.billing_schedule_runs;
  create policy finance_billing_read on public.billing_schedule_runs for select to authenticated using(private.can_view_accounting());
  drop policy if exists finance_events_read on public.finance_events;
  create policy finance_events_read on public.finance_events for select to authenticated using(private.can_view_accounting() or (client_id is not null and private.can_view_billing(client_id) and event_type in('INVOICE_ISSUED','PAYMENT_RECEIVED','PAYMENT_ALLOCATED','CREDIT_NOTE_ISSUED','DTE_REJECTED','PAYMENT_PROMISE_CREATED','COLLECTION_ACTIVITY')));
  drop policy if exists finance_notifications_own on public.finance_notifications;
  create policy finance_notifications_own on public.finance_notifications for select to authenticated using(user_id=auth.uid() or audience_role=private.zyteron_role());
  drop policy if exists finance_audit_read on public.finance_audit_events;
  create policy finance_audit_read on public.finance_audit_events for select to authenticated using(private.can_manage_finance());
end $$;

-- Portal Cliente futuro: sólo documentos propios, sin costos, márgenes, plan contable ni asientos.
create or replace view public.finance_portal_invoices with(security_barrier=true) as
  select i.id,i.invoice_number,i.document_type_code,t.folio,i.client_id,i.currency,i.net_amount,i.exempt_amount,i.tax_amount,i.total_amount,i.balance_due,
    case when i.status in('ISSUED','PARTIALLY_PAID') and i.due_date<current_date then 'OVERDUE' else i.status end status,i.issue_date,i.due_date
  from public.invoices i left join public.tax_documents t on t.id=i.tax_document_id
  where i.client_id=private.portal_finance_client() and i.status in('ISSUED','PARTIALLY_PAID','PAID','CREDITED');
create or replace view public.finance_portal_payments with(security_barrier=true) as
  select p.id,p.payment_reference,p.client_id,p.currency,p.gross_amount,p.status,p.received_at from public.payments p
  where p.client_id=private.portal_finance_client() and p.status in('CONFIRMED','PARTIALLY_REFUNDED','REFUNDED');
revoke all on public.finance_portal_invoices,public.finance_portal_payments from anon,public;
grant select on public.finance_portal_invoices,public.finance_portal_payments to authenticated;

insert into public.app_permissions(code,description) values
('finance.dashboard.view','Ver Financial Command Center'),('invoice.view','Ver facturación'),('invoice.create','Crear borradores de factura'),('invoice.edit','Editar borradores de factura'),
('invoice.approve','Aprobar facturas'),('invoice.issue','Emitir facturas'),('dte.view','Ver documentos tributarios'),('dte.issue','Emitir DTE'),('dte.credit_note','Emitir notas de crédito'),
('dte.debit_note','Emitir notas de débito'),('dte.manage','Gestionar certificados, CAF y DTE recibidos'),('receivable.view','Ver cuentas por cobrar'),('collection.manage','Gestionar cobranza'),
('payment.view','Ver pagos'),('payment.record','Registrar pagos con evidencia'),('payment.refund','Gestionar devoluciones'),('payment.allocate','Aplicar pagos'),
('payable.view','Ver cuentas por pagar'),('payable.approve','Aprobar cuentas por pagar'),('payable.pay','Registrar pagos a proveedores'),('expense.view','Ver gastos'),
('expense.create','Registrar gastos'),('expense.approve','Aprobar gastos'),('bank.view','Ver bancos'),('bank.import','Importar cartolas'),('bank.reconcile','Conciliar bancos'),
('accounting.view','Ver contabilidad'),('journal.create','Crear asientos'),('journal.review','Revisar asientos'),('journal.post','Contabilizar asientos'),('journal.reverse','Revertir asientos'),
('period.view','Ver períodos'),('period.close','Cerrar períodos'),('period.reopen','Reabrir períodos'),('tax.view','Ver impuestos'),('tax.review','Revisar impuestos'),('tax.manage','Gestionar impuestos'),
('report.finance.view','Ver informes financieros'),('report.finance.export','Exportar informes financieros'),('commission.finance.manage','Gestionar comisiones en Finanzas'),
('finance.settings.manage','Gestionar configuración contable')
on conflict(code) do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('FINANZAS'))r(role) cross join public.app_permissions p
where p.code like any(array['finance.%','invoice.%','dte.%','receivable.%','collection.%','payment.%','payable.%','expense.%','bank.%','accounting.%','journal.%','period.%','tax.%','report.finance.%','commission.finance.%']) on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'CONTADOR',code from public.app_permissions where code in('finance.dashboard.view','invoice.view','dte.view','dte.manage','receivable.view','payment.view','payable.view','expense.view','expense.approve','bank.view','bank.import','bank.reconcile','accounting.view','journal.create','journal.review','journal.post','journal.reverse','period.view','period.close','period.reopen','tax.view','tax.review','tax.manage','report.finance.view','report.finance.export') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('JEFE_VENTAS'),('COMERCIAL'))r(role) cross join public.app_permissions p where p.code in('invoice.view','invoice.create','receivable.view','collection.manage','payment.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'EJECUTIVA_VENTAS',code from public.app_permissions where code in('invoice.view','receivable.view','collection.manage') on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['invoices','payments','payment_allocations','tax_documents','bank_transactions','journal_entries','finance_notifications','period_close_runs','received_tax_documents','expenses','payables','finance_events'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('finance-documents','finance-documents',false,26214400,array['application/pdf','application/xml','text/xml','image/png','image/jpeg','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
('finance-secrets','finance-secrets',false,1048576,array['application/octet-stream'])
on conflict(id) do update set public=false;

do $$ declare fn text; begin
  foreach fn in array array['public.finance_number(text,regclass)','public.next_invoice_number()','public.next_payment_reference()','public.next_expense_number()','public.next_vendor_payment_number()',
    'public.finance_ensure_period(date)','public.finance_create_journal_entry(jsonb,jsonb)','public.finance_post_journal_entry(uuid,uuid)','public.finance_reverse_journal_entry(uuid,uuid,text,date)',
    'public.finance_reserve_folio(integer,text,uuid)','public.finance_refresh_invoice_balance(uuid)','public.finance_allocate_payment(uuid,uuid,numeric,uuid)','public.finance_reverse_allocation(uuid,uuid,text)',
    'public.finance_refresh_bank_transaction(uuid)','public.finance_close_period(uuid,uuid,jsonb)','public.finance_account_balances(date,date)'] loop
    execute format('revoke all on function %s from public,anon,authenticated',fn);
    execute format('grant execute on function %s to service_role',fn);
  end loop;
end $$;

commit;

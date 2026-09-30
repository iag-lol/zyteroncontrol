begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- Contact Directory ---------------------------------------------------------
alter table public.client_contacts
  add column if not exists contact_types text[] not null default '{}'::text[],
  add column if not exists notes text,
  add column if not exists portal_status text not null default 'DISABLED',
  add column if not exists archived_at timestamptz;

update public.client_contacts
set contact_types = array_remove(array[
  case when is_primary then 'PRINCIPAL' end,
  case when commercial_contact then 'COMERCIAL' end,
  case when technical_contact then 'TECNICO' end,
  case when billing_contact then 'FACTURACION' end,
  case when portal_access then 'PORTAL' end
], null)
where cardinality(contact_types) = 0;

alter table public.client_contacts drop constraint if exists client_contacts_portal_status_check;
alter table public.client_contacts add constraint client_contacts_portal_status_check
  check (portal_status in ('PENDING_INVITATION','INVITED','ACTIVE','DISABLED'));

alter table public.client_portal_users drop constraint if exists client_portal_users_status_check;
alter table public.client_portal_users add constraint client_portal_users_status_check
  check (status in ('PENDING_INVITATION','INVITED','ACTIVE','DISABLED','SUSPENDED','REVOKED'));
alter table public.client_portal_users alter column auth_user_id drop not null;
alter table public.client_portal_users add column if not exists invited_email text;
create unique index if not exists client_portal_users_contact_unique on public.client_portal_users(client_id,contact_id);

create index if not exists client_contacts_email_idx on public.client_contacts(lower(email));
create index if not exists client_contacts_phone_idx on public.client_contacts(phone);
create index if not exists client_contacts_types_idx on public.client_contacts using gin(contact_types);

create or replace function public.set_primary_client_contact(target_contact_id uuid, target_client_id uuid)
returns void language plpgsql security definer set search_path=public
as $$ begin
  update public.client_contacts set is_primary=false,contact_types=array_remove(contact_types,'PRINCIPAL'),updated_at=now()
  where client_id=target_client_id and is_primary;
  if target_contact_id is not null then
    update public.client_contacts set is_primary=true,contact_types=array_append(array_remove(contact_types,'PRINCIPAL'),'PRINCIPAL'),updated_at=now()
    where id=target_contact_id and client_id=target_client_id;
  end if;
end $$;

-- Contract Management ------------------------------------------------------
create sequence if not exists public.client_contract_number_seq start 1;

create table if not exists public.contract_type_catalog (
  code text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.contract_type_catalog(code,name) values
('DESARROLLO','Desarrollo'),('MANTENCION','Mantención'),('SOPORTE','Soporte'),('HOSTING','Hosting'),
('SEO','SEO'),('SOFTWARE','Software'),('CONSULTORIA','Consultoría'),('SERVICIO_RECURRENTE','Servicio recurrente'),('OTRO','Otro')
on conflict(code) do nothing;

create or replace function public.next_client_contract_number()
returns text language sql volatile
as $$
  select 'CTR-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.client_contract_number_seq')::text, 6, '0')
$$;

create table if not exists public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique default public.next_client_contract_number(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  description text,
  contract_type text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','IN_REVIEW','PENDING_SIGNATURE','SIGNED','ACTIVE','EXPIRING','EXPIRED','TERMINATED','CANCELLED')),
  start_date date,
  end_date date,
  renewal_type text not null default 'MANUAL' check (renewal_type in ('NONE','MANUAL','AUTOMATIC')),
  renewal_notice_days integer not null default 30 check (renewal_notice_days >= 0),
  billing_frequency text check (billing_frequency is null or billing_frequency in ('ONE_TIME','MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','CUSTOM')),
  currency char(3) not null default 'CLP',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  signed_at timestamptz,
  created_by uuid,
  responsible_user_id uuid,
  document_id uuid,
  signature_status text not null default 'NOT_CONFIGURED' check (signature_status in ('NOT_CONFIGURED','DRAFT','REQUESTED','VIEWED','SIGNED','REJECTED','EXPIRED','CANCELLED')),
  signature_provider text,
  signature_request_id text,
  document_hash text,
  portal_visible boolean not null default false,
  version integer not null default 1 check (version > 0),
  parent_contract_id uuid references public.client_contracts(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.client_contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.client_contracts(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  version_kind text not null default 'CONTRACT' check (version_kind in ('CONTRACT','ANNEX')),
  title text not null,
  storage_path text,
  document_hash text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(contract_id, version_number, version_kind)
);

create table if not exists public.client_contract_signers (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.client_contracts(id) on delete restrict,
  contact_id uuid references public.client_contacts(id) on delete restrict,
  name text not null,
  email text not null,
  signing_order integer not null default 1 check (signing_order > 0),
  status text not null default 'PENDING' check (status in ('PENDING','SENT','VIEWED','SIGNED','REJECTED','EXPIRED')),
  signed_at timestamptz,
  provider_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_contracts_client_idx on public.client_contracts(client_id, status);
create index if not exists client_contracts_end_date_idx on public.client_contracts(end_date) where archived_at is null;
create index if not exists client_contracts_responsible_idx on public.client_contracts(responsible_user_id);

-- Service Operations -------------------------------------------------------
create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  category text not null,
  description text,
  default_price numeric(14,2) check (default_price is null or default_price >= 0),
  currency char(3) not null default 'CLP',
  billing_type text not null default 'ONE_TIME' check (billing_type in ('ONE_TIME','MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','CUSTOM')),
  active boolean not null default true,
  requires_project boolean not null default false,
  requires_monitoring boolean not null default false,
  requires_support boolean not null default false,
  requires_renewal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_catalog(name, code, category, billing_type, requires_project, requires_monitoring, requires_support, requires_renewal)
values
  ('Sitio Web Básico','WEB_BASIC','DESARROLLO','ONE_TIME',true,false,false,false),
  ('Sitio Web Medio','WEB_MEDIUM','DESARROLLO','ONE_TIME',true,false,false,false),
  ('Sitio Web Avanzado','WEB_ADVANCED','DESARROLLO','ONE_TIME',true,false,false,false),
  ('Mantenimiento Web','WEB_MAINTENANCE','MANTENCION','MONTHLY',false,true,true,true),
  ('SEO','SEO','MARKETING','MONTHLY',false,false,false,true),
  ('Hosting','HOSTING','INFRAESTRUCTURA','ANNUAL',false,true,true,true),
  ('Software Personalizado','CUSTOM_SOFTWARE','DESARROLLO','CUSTOM',true,false,true,false),
  ('Soporte','SUPPORT','SOPORTE','MONTHLY',false,false,true,true),
  ('GPS','GPS','TECNOLOGIA','MONTHLY',false,true,true,true),
  ('Consultoría','CONSULTING','CONSULTORIA','CUSTOM',false,false,false,false)
on conflict (code) do nothing;

alter table public.client_services alter column status drop default;
alter table public.client_services drop constraint if exists client_services_status_check;
update public.client_services set status = 'PENDING_ACTIVATION' where status = 'PENDING';
alter table public.client_services add constraint client_services_status_check
  check (status in ('QUOTED','PENDING_ACTIVATION','ACTIVE','SUSPENDED','PENDING_RENEWAL','CANCELLED','EXPIRED'));
alter table public.client_services alter column status set default 'PENDING_ACTIVATION';

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='client_services' and column_name='price')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='client_services' and column_name='agreed_price') then
    alter table public.client_services rename column price to agreed_price;
  end if;
end $$;

alter table public.client_services
  add column if not exists catalog_service_id uuid references public.service_catalog(id) on delete restrict,
  add column if not exists project_id uuid,
  add column if not exists technical_owner_id uuid,
  add column if not exists activation_date date,
  add column if not exists end_date date,
  add column if not exists billing_type text,
  add column if not exists portal_visible boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists(select 1 from pg_constraint where conname='client_services_contract_fk') then
    alter table public.client_services add constraint client_services_contract_fk foreign key(contract_id)
      references public.client_contracts(id) on delete restrict not valid;
  end if;
end $$;

alter table public.client_services drop constraint if exists client_services_billing_type_check;
alter table public.client_services add constraint client_services_billing_type_check
  check (billing_type is null or billing_type in ('ONE_TIME','MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','CUSTOM'));
alter table public.client_services drop constraint if exists client_services_agreed_price_check;
alter table public.client_services add constraint client_services_agreed_price_check
  check (agreed_price is null or agreed_price >= 0);
alter table public.client_services drop constraint if exists client_services_dates_check;
alter table public.client_services add constraint client_services_dates_check
  check ((end_date is null or end_date >= start_date) and (renewal_date is null or renewal_date >= start_date));

create table if not exists public.client_contract_services (
  contract_id uuid not null references public.client_contracts(id) on delete restrict,
  client_service_id uuid not null references public.client_services(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(contract_id, client_service_id)
);

create index if not exists client_services_catalog_idx on public.client_services(catalog_service_id);
create index if not exists client_services_responsible_idx on public.client_services(responsible_user_id);
create index if not exists client_services_renewal_status_idx on public.client_services(renewal_date, status);

-- Renewal Control Center ---------------------------------------------------
create table if not exists public.client_renewals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  source_type text not null check (source_type in ('CONTRACT','SERVICE','HOSTING','DOMAIN','MAINTENANCE','LICENSE','SUBSCRIPTION','SUPPORT','AUDIT')),
  source_id uuid not null,
  title text not null,
  renewal_date date not null,
  notice_date date,
  assigned_to uuid,
  status text not null default 'UPCOMING' check (status in ('UPCOMING','CONTACT_REQUIRED','CONTACTED','NEGOTIATING','RENEWED','NOT_RENEWED','CANCELLED','EXPIRED')),
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  currency char(3) not null default 'CLP',
  auto_renew boolean not null default false,
  notes text,
  opportunity_id uuid,
  outcome text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type, source_id, renewal_date)
);

create table if not exists public.renewal_notification_events (
  id uuid primary key default gen_random_uuid(),
  renewal_id uuid not null references public.client_renewals(id) on delete restrict,
  threshold_days integer not null check (threshold_days in (90,60,30,15,7,1)),
  scheduled_for date not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(renewal_id, threshold_days)
);

create table if not exists public.client_domain_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  user_id uuid,
  audience_role text,
  event_type text not null,
  title text not null,
  body text,
  status text not null default 'PENDING' check (status in ('PENDING','DELIVERED','READ','CANCELLED')),
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.client_domain_audit_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists client_renewals_client_idx on public.client_renewals(client_id, status);
create index if not exists client_renewals_date_idx on public.client_renewals(renewal_date, status);
create index if not exists client_renewals_assigned_idx on public.client_renewals(assigned_to);
create index if not exists client_domain_notifications_user_idx on public.client_domain_notifications(user_id, status, created_at desc);
create index if not exists client_domain_audit_client_idx on public.client_domain_audit_events(client_id, occurred_at desc);

-- Renewals are created in the same database transaction as their source.
create or replace function public.sync_client_domain_renewal()
returns trigger language plpgsql security definer set search_path=public
as $$
declare source_kind text; due_date date; notice_days integer; renewal_title text; renewal_value numeric; renewal_currency text; owner_id uuid; automatic boolean;
begin
  if tg_table_name='client_contracts' then
    if new.end_date is null or new.renewal_type='NONE' then return new; end if;
    source_kind:='CONTRACT'; due_date:=new.end_date; notice_days:=new.renewal_notice_days;
    renewal_title:='Renovación · '||new.name; renewal_value:=new.total; renewal_currency:=new.currency;
    owner_id:=new.responsible_user_id; automatic:=new.renewal_type='AUTOMATIC';
  else
    if new.renewal_date is null then return new; end if;
    source_kind:='SERVICE'; due_date:=new.renewal_date; notice_days:=90;
    renewal_title:='Renovación · '||new.service_name; renewal_value:=new.agreed_price; renewal_currency:=new.currency;
    owner_id:=new.responsible_user_id; automatic:=false;
  end if;
  insert into public.client_renewals(client_id,source_type,source_id,title,renewal_date,notice_date,assigned_to,status,estimated_value,currency,auto_renew)
  values(new.client_id,source_kind,new.id,renewal_title,due_date,due_date-notice_days,owner_id,'UPCOMING',renewal_value,renewal_currency,automatic)
  on conflict(source_type,source_id,renewal_date) do update set
    title=excluded.title,notice_date=excluded.notice_date,assigned_to=excluded.assigned_to,
    estimated_value=excluded.estimated_value,currency=excluded.currency,auto_renew=excluded.auto_renew,updated_at=now();
  return new;
end $$;

drop trigger if exists client_contracts_sync_renewal on public.client_contracts;
create trigger client_contracts_sync_renewal after insert or update of end_date,renewal_type,renewal_notice_days,total,currency,responsible_user_id
on public.client_contracts for each row execute function public.sync_client_domain_renewal();
drop trigger if exists client_services_sync_renewal on public.client_services;
create trigger client_services_sync_renewal after insert or update of renewal_date,agreed_price,currency,responsible_user_id
on public.client_services for each row execute function public.sync_client_domain_renewal();

create or replace function public.sync_renewal_notification_schedule()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.renewal_notification_events(renewal_id,threshold_days,scheduled_for)
  select new.id,days,new.renewal_date-days from unnest(array[90,60,30,15,7,1]) days
  on conflict(renewal_id,threshold_days) do update set scheduled_for=excluded.scheduled_for,delivered_at=null;
  return new;
end $$;

drop trigger if exists client_renewals_sync_notifications on public.client_renewals;
create trigger client_renewals_sync_notifications after insert or update of renewal_date
on public.client_renewals for each row execute function public.sync_renewal_notification_schedule();

create or replace function public.process_client_renewal_notifications()
returns integer language plpgsql security definer set search_path=public
as $$
declare alert record; processed integer:=0;
begin
  for alert in
    select e.id,e.renewal_id,e.threshold_days,r.client_id,r.title,r.assigned_to,r.source_type
    from public.renewal_notification_events e
    join public.client_renewals r on r.id=e.renewal_id
    where e.scheduled_for<=current_date and e.delivered_at is null
    order by e.scheduled_for for update of e skip locked
  loop
    insert into public.client_domain_notifications(client_id,user_id,audience_role,event_type,title,body,source_type,source_id)
    values(alert.client_id,alert.assigned_to,case when alert.threshold_days<=7 then 'GERENTE_GENERAL' else 'EJECUTIVA_VENTAS' end,
      'RENEWAL_DUE','Renovación en '||alert.threshold_days||' días',alert.title,'RENEWAL',alert.renewal_id);
    insert into public.client_events(client_id,event_type,title,description,metadata)
    values(alert.client_id,case when alert.source_type='CONTRACT' then 'CONTRACT_EXPIRING' else 'SERVICE_RENEWAL_DUE' end,
      case when alert.source_type='CONTRACT' then 'Contrato próximo a vencer' else 'Renovación de servicio próxima' end,
      alert.title,jsonb_build_object('renewalId',alert.renewal_id,'thresholdDays',alert.threshold_days));
    update public.renewal_notification_events set delivered_at=now() where id=alert.id;
    processed:=processed+1;
  end loop;
  return processed;
end $$;

revoke all on function public.process_client_renewal_notifications() from public,anon,authenticated;
grant execute on function public.process_client_renewal_notifications() to service_role;

do $$ declare has_job boolean; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    execute 'select exists(select 1 from cron.job where jobname=''zyteron-renewal-alerts'')' into has_job;
    if not has_job then
      execute 'select cron.schedule(''zyteron-renewal-alerts'',''0 8 * * *'',''select public.process_client_renewal_notifications()'')';
    end if;
  end if;
end $$;

-- Transactional service activation and renewal completion -----------------
create or replace function public.activate_client_service(target_service_id uuid)
returns public.client_services
language plpgsql security definer set search_path = public
as $$
declare result public.client_services;
begin
  update public.client_services
  set status='ACTIVE', activation_date=coalesce(activation_date,current_date), updated_at=now()
  where id=target_service_id and status in ('PENDING_ACTIVATION','SUSPENDED')
  returning * into result;
  if result.id is null then raise exception 'SERVICE_NOT_ACTIVATABLE'; end if;
  insert into public.client_events(client_id,event_type,title,description,metadata)
  values(result.client_id,'SERVICE_ACTIVATED','Servicio activado',result.service_name,jsonb_build_object('serviceId',result.id));
  insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload)
  values('CLIENT_SERVICE',result.id,'SERVICE_ACTIVATED',jsonb_build_object('clientId',result.client_id,'serviceId',result.id));
  return result;
end $$;

create or replace function public.complete_client_renewal(target_renewal_id uuid, next_renewal_date date, result_notes text default null)
returns public.client_renewals
language plpgsql security definer set search_path = public
as $$
declare renewal public.client_renewals;
begin
  update public.client_renewals
  set status='RENEWED', outcome=result_notes, completed_at=now(), updated_at=now()
  where id=target_renewal_id and status not in ('RENEWED','NOT_RENEWED','CANCELLED','EXPIRED')
  returning * into renewal;
  if renewal.id is null then raise exception 'RENEWAL_NOT_COMPLETABLE'; end if;
  if renewal.source_type='SERVICE' then
    update public.client_services set renewal_date=next_renewal_date,status='ACTIVE',updated_at=now() where id=renewal.source_id;
  elsif renewal.source_type='CONTRACT' then
    update public.client_contracts set end_date=next_renewal_date,status='ACTIVE',updated_at=now() where id=renewal.source_id;
  end if;
  insert into public.client_events(client_id,event_type,title,description,metadata)
  values(renewal.client_id,case when renewal.source_type='CONTRACT' then 'CONTRACT_RENEWED' else 'SERVICE_RENEWED' end,'Renovación completada',renewal.title,jsonb_build_object('renewalId',renewal.id));
  insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload)
  values('RENEWAL',renewal.id,'RENEWAL_COMPLETED',jsonb_build_object('clientId',renewal.client_id,'renewalId',renewal.id,'nextDate',next_renewal_date));
  return renewal;
end $$;

revoke all on function public.set_primary_client_contact(uuid,uuid) from public,anon,authenticated;
revoke all on function public.activate_client_service(uuid) from public,anon,authenticated;
revoke all on function public.complete_client_renewal(uuid,date,text) from public,anon,authenticated;
grant execute on function public.set_primary_client_contact(uuid,uuid) to service_role;
grant execute on function public.activate_client_service(uuid) to service_role;
grant execute on function public.complete_client_renewal(uuid,date,text) to service_role;

-- Permissions --------------------------------------------------------------
create table if not exists public.app_permissions (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.role_permissions (
  role text not null,
  permission_code text not null references public.app_permissions(code) on delete cascade,
  primary key(role, permission_code)
);

insert into public.app_permissions(code,description) values
('client.contacts.view','Ver directorio de contactos'),('client.contacts.manage','Gestionar contactos'),
('client.contracts.view','Ver contratos'),('client.contracts.create','Crear contratos'),('client.contracts.edit','Editar contratos'),
('client.contracts.approve','Aprobar contratos'),('client.contracts.sign_request','Solicitar firma electrónica'),
('client.services.view','Ver servicios contratados'),('client.services.manage','Gestionar servicios'),
('client.services.activate','Activar servicios'),('client.services.suspend','Suspender servicios'),
('client.renewals.view','Ver renovaciones'),('client.renewals.manage','Gestionar renovaciones'),
('client.renewals.convert','Convertir renovación en oportunidad'),('client.renewals.complete','Completar renovaciones')
on conflict(code) do nothing;

insert into public.role_permissions(role,permission_code)
select role, code from (values ('GERENTE_GENERAL'),('EJECUTIVA_VENTAS'),('COMERCIAL')) roles(role)
cross join public.app_permissions
on conflict do nothing;

insert into public.role_permissions(role,permission_code) values
('JEFE_DESARROLLO','client.contacts.view'),('JEFE_DESARROLLO','client.contracts.view'),('JEFE_DESARROLLO','client.services.view'),
('PROGRAMADOR','client.contacts.view'),('PROGRAMADOR','client.services.view'),
('FINANZAS','client.contacts.view'),('FINANZAS','client.contracts.view'),('FINANZAS','client.services.view'),('FINANZAS','client.renewals.view')
on conflict do nothing;

-- RLS: service-role writes; authenticated users receive explicit client scope.
alter table public.client_contracts enable row level security;
alter table public.contract_type_catalog enable row level security;
alter table public.client_contract_versions enable row level security;
alter table public.client_contract_signers enable row level security;
alter table public.service_catalog enable row level security;
alter table public.client_contract_services enable row level security;
alter table public.client_renewals enable row level security;
alter table public.renewal_notification_events enable row level security;
alter table public.client_domain_notifications enable row level security;
alter table public.client_domain_audit_events enable row level security;
alter table public.app_permissions enable row level security;
alter table public.role_permissions enable row level security;

create or replace function private.can_access_client(target_client_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select
  private.zyteron_role()='GERENTE_GENERAL'
  or exists(select 1 from public.client_assignments a where a.client_id=target_client_id and a.user_id=auth.uid() and a.active)
  or exists(select 1 from public.client_portal_users p where p.client_id=target_client_id and p.auth_user_id=auth.uid() and p.status='ACTIVE')
$$;

create policy client_contracts_scoped_read on public.client_contracts for select to authenticated
using (private.can_access_client(client_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or portal_visible));
create policy client_contracts_manager_write on public.client_contracts for all to authenticated
using (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id))
with check (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id));
create policy contract_type_catalog_authenticated_read on public.contract_type_catalog for select to authenticated using (active or private.zyteron_role()='GERENTE_GENERAL');
create policy contract_type_catalog_manager_write on public.contract_type_catalog for all to authenticated
using (private.zyteron_role()='GERENTE_GENERAL') with check (private.zyteron_role()='GERENTE_GENERAL');
create policy client_contacts_manager_write on public.client_contacts for all to authenticated
using (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id))
with check (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id));
create policy client_services_manager_write on public.client_services for all to authenticated
using (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id))
with check (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id));
create policy client_services_portal_read on public.client_services for select to authenticated
using (private.zyteron_role()='PORTAL_CLIENT' and portal_visible and exists(select 1 from public.client_portal_users p where p.client_id=client_services.client_id and p.auth_user_id=auth.uid() and p.status='ACTIVE'));
create policy client_renewals_scoped_read on public.client_renewals for select to authenticated using (private.can_access_client(client_id));
create policy client_renewals_manager_write on public.client_renewals for all to authenticated
using (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id))
with check (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id));
create policy service_catalog_authenticated_read on public.service_catalog for select to authenticated using (active or private.zyteron_role()='GERENTE_GENERAL');
create policy service_catalog_manager_write on public.service_catalog for all to authenticated
using (private.zyteron_role()='GERENTE_GENERAL') with check (private.zyteron_role()='GERENTE_GENERAL');
create policy client_contract_versions_scoped_read on public.client_contract_versions for select to authenticated
using (private.zyteron_role()<>'PORTAL_CLIENT' and exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id)));
create policy client_contract_versions_manager_write on public.client_contract_versions for all to authenticated
using (exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')))
with check (exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')));
create policy client_contract_signers_scoped_read on public.client_contract_signers for select to authenticated
using (private.zyteron_role()<>'PORTAL_CLIENT' and exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id)));
create policy client_contract_signers_manager_write on public.client_contract_signers for all to authenticated
using (exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')))
with check (exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')));
create policy client_contract_services_scoped_read on public.client_contract_services for select to authenticated
using (private.zyteron_role()<>'PORTAL_CLIENT' and exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id)));
create policy client_contract_services_manager_write on public.client_contract_services for all to authenticated
using (exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')))
with check (exists(select 1 from public.client_contracts c where c.id=contract_id and private.can_access_client(c.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')));
create policy renewal_notification_events_scoped_read on public.renewal_notification_events for select to authenticated
using (exists(select 1 from public.client_renewals r where r.id=renewal_id and private.can_access_client(r.client_id)));
create policy renewal_notification_events_manager_write on public.renewal_notification_events for all to authenticated
using (exists(select 1 from public.client_renewals r where r.id=renewal_id and private.can_access_client(r.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')))
with check (exists(select 1 from public.client_renewals r where r.id=renewal_id and private.can_access_client(r.client_id) and private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL')));
create policy client_domain_notifications_scoped_read on public.client_domain_notifications for select to authenticated
using (private.can_access_client(client_id) and (user_id is null or user_id=auth.uid() or audience_role=private.zyteron_role()));
create policy client_domain_notifications_manager_write on public.client_domain_notifications for all to authenticated
using (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id))
with check (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and private.can_access_client(client_id));
create policy client_domain_audit_events_scoped_read on public.client_domain_audit_events for select to authenticated
using (private.zyteron_role()='GERENTE_GENERAL' or (client_id is not null and private.can_access_client(client_id)));
create policy client_domain_audit_events_manager_write on public.client_domain_audit_events for insert to authenticated
with check (private.zyteron_role() in ('GERENTE_GENERAL','EJECUTIVA_VENTAS','COMERCIAL') and client_id is not null and private.can_access_client(client_id));
create policy app_permissions_authenticated_read on public.app_permissions for select to authenticated using (true);
create policy role_permissions_authenticated_read on public.role_permissions for select to authenticated using (true);

-- Realtime publications are idempotent across environments.
do $$ declare table_name text; begin
  foreach table_name in array array['client_contacts','client_contracts','client_services','client_renewals'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
end $$;

-- Private contract document bucket. Access is issued by the API through signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-contracts','client-contracts',false,26214400,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do update set public=false;

commit;

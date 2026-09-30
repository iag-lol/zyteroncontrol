create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function private.zyteron_role() returns text
language sql stable security definer set search_path = public
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  rut text not null,
  business_activity text,
  website text,
  phone text,
  general_email text,
  country text not null default 'Chile',
  region text,
  commune text,
  address text,
  account_executive_id uuid,
  client_lead_id uuid,
  development_lead_id uuid,
  source text,
  client_type text,
  status text not null default 'ONBOARDING' check (status in ('ACTIVE','ONBOARDING','INACTIVE','ARCHIVED')),
  billing_legal_name text,
  billing_rut text,
  billing_activity text,
  billing_address text,
  dte_email text,
  payment_terms text,
  credit_days integer not null default 0 check (credit_days >= 0),
  currency char(3) not null default 'CLP',
  payment_customer_reference text,
  health_status text not null default 'INSUFFICIENT_DATA' check (health_status in ('HEALTHY','ATTENTION','RISK','CRITICAL','INSUFFICIENT_DATA')),
  health_factors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint clients_rut_unique unique (rut)
);

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  position text,
  department text,
  email text not null,
  phone text,
  whatsapp text,
  is_primary boolean not null default false,
  billing_contact boolean not null default false,
  technical_contact boolean not null default false,
  commercial_contact boolean not null default false,
  portal_access boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists client_contacts_one_primary on public.client_contacts(client_id) where is_primary;

create table if not exists public.client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  service_id text not null,
  service_name text not null,
  contract_id uuid,
  start_date date not null,
  renewal_date date,
  billing_frequency text,
  price numeric(14,2),
  currency char(3) not null default 'CLP',
  status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
  responsible_user_id uuid,
  sla text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (renewal_date is null or renewal_date >= start_date)
);

create table if not exists public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  user_id uuid not null,
  assignment_type text not null check (assignment_type in ('ACCOUNT_EXECUTIVE','CLIENT_LEAD','DEVELOPMENT_LEAD','DEVELOPER','FINANCE','SUPPORT')),
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique (client_id, user_id, assignment_type)
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  author_id uuid not null,
  body text not null,
  visibility text not null default 'INTERNAL_ONLY' check (visibility in ('INTERNAL_ONLY','CLIENT_VISIBLE','CLIENT_SUMMARY_ONLY')),
  created_at timestamptz not null default now()
);

create table if not exists public.client_preferences (
  client_id uuid primary key references public.clients(id) on delete restrict,
  timezone text not null default 'America/Santiago',
  locale text not null default 'es-CL',
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_portal_settings (
  client_id uuid primary key references public.clients(id) on delete restrict,
  enabled boolean not null default false,
  projects_visible boolean not null default false,
  documents_visible boolean not null default false,
  invoices_visible boolean not null default false,
  tickets_visible boolean not null default false,
  monitoring_visible boolean not null default false,
  audits_visible boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_portal_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  contact_id uuid not null references public.client_contacts(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'INVITED' check (status in ('INVITED','ACTIVE','SUSPENDED','REVOKED')),
  created_at timestamptz not null default now(),
  unique (client_id, auth_user_id)
);

create table if not exists public.client_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#39735c'
);
create table if not exists public.client_tag_assignments (
  client_id uuid not null references public.clients(id) on delete restrict,
  tag_id uuid not null references public.client_tags(id) on delete restrict,
  primary key (client_id, tag_id)
);
create table if not exists public.client_relationships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  related_client_id uuid not null references public.clients(id) on delete restrict,
  relationship_type text not null,
  created_at timestamptz not null default now(),
  check (client_id <> related_client_id),
  unique (client_id, related_client_id, relationship_type)
);

create table if not exists public.client_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  event_type text not null,
  title text not null,
  description text,
  actor_id uuid,
  visibility text not null default 'INTERNAL_ONLY' check (visibility in ('INTERNAL_ONLY','CLIENT_VISIBLE','CLIENT_SUMMARY_ONLY')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.business_event_outbox (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0
);

create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_health_idx on public.clients(health_status);
create index if not exists clients_created_idx on public.clients(created_at desc);
create index if not exists clients_search_idx on public.clients using gin (to_tsvector('spanish', coalesce(legal_name,'') || ' ' || coalesce(trade_name,'') || ' ' || coalesce(rut,'') || ' ' || coalesce(general_email,'') || ' ' || coalesce(website,'')));
create index if not exists client_contacts_client_idx on public.client_contacts(client_id, status);
create index if not exists client_services_client_idx on public.client_services(client_id, status);
create index if not exists client_services_renewal_idx on public.client_services(renewal_date) where status = 'ACTIVE';
create index if not exists client_assignments_user_idx on public.client_assignments(user_id, active);
create index if not exists client_events_timeline_idx on public.client_events(client_id, occurred_at desc);
create index if not exists business_event_outbox_pending_idx on public.business_event_outbox(occurred_at) where processed_at is null;

alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_services enable row level security;
alter table public.client_assignments enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_preferences enable row level security;
alter table public.client_portal_settings enable row level security;
alter table public.client_portal_users enable row level security;
alter table public.client_tags enable row level security;
alter table public.client_tag_assignments enable row level security;
alter table public.client_relationships enable row level security;
alter table public.client_events enable row level security;
alter table public.business_event_outbox enable row level security;

create policy clients_gerente_all on public.clients for all to authenticated
using (private.zyteron_role() = 'GERENTE_GENERAL') with check (private.zyteron_role() = 'GERENTE_GENERAL');
create policy clients_assigned_read on public.clients for select to authenticated using (
  private.zyteron_role() in ('EJECUTIVA_VENTAS','COMERCIAL','JEFE_DESARROLLO','PROGRAMADOR','FINANZAS')
  and exists (select 1 from public.client_assignments a where a.client_id = clients.id and a.user_id = auth.uid() and a.active)
);
create policy clients_sales_create on public.clients for insert to authenticated
with check (private.zyteron_role() in ('EJECUTIVA_VENTAS','COMERCIAL'));
create policy clients_sales_update on public.clients for update to authenticated
using (private.zyteron_role() in ('EJECUTIVA_VENTAS','COMERCIAL') and account_executive_id = auth.uid())
with check (private.zyteron_role() in ('EJECUTIVA_VENTAS','COMERCIAL') and account_executive_id = auth.uid());

do $$ declare table_name text; begin
  foreach table_name in array array['client_contacts','client_services','client_assignments','client_notes','client_preferences','client_portal_settings','client_tags','client_tag_assignments','client_relationships','client_events'] loop
    execute format('create policy %I on public.%I for all to authenticated using (private.zyteron_role() = ''GERENTE_GENERAL'') with check (private.zyteron_role() = ''GERENTE_GENERAL'')', table_name || '_gerente_all', table_name);
  end loop;
end $$;

create policy client_contacts_assigned_read on public.client_contacts for select to authenticated using (
  exists (select 1 from public.client_assignments a where a.client_id = client_contacts.client_id and a.user_id = auth.uid() and a.active)
);
create policy client_services_assigned_read on public.client_services for select to authenticated using (
  exists (select 1 from public.client_assignments a where a.client_id = client_services.client_id and a.user_id = auth.uid() and a.active)
);
create policy client_events_assigned_read on public.client_events for select to authenticated using (
  exists (select 1 from public.client_assignments a where a.client_id = client_events.client_id and a.user_id = auth.uid() and a.active)
);
create policy client_portal_own_client on public.clients for select to authenticated using (
  exists (select 1 from public.client_portal_users p where p.client_id = clients.id and p.auth_user_id = auth.uid() and p.status = 'ACTIVE')
);
create policy client_portal_contacts on public.client_contacts for select to authenticated using (
  exists (select 1 from public.client_portal_users p where p.client_id = client_contacts.client_id and p.auth_user_id = auth.uid() and p.status = 'ACTIVE')
);

alter publication supabase_realtime add table public.client_events;
alter publication supabase_realtime add table public.clients;

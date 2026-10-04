-- Módulo 05 · Site Reliability Center.
-- Reutiliza projects, project_endpoints, deployments y tasks de Operaciones. Persistencia UTC; los
-- agregados diarios se alinean al día calendario America/Santiago. Las escrituras se realizan sólo
-- desde NestJS (service_role); usuarios autenticados reciben lectura con alcance por proyecto.
begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create sequence if not exists public.monitoring_incident_number_seq;
create or replace function public.next_incident_number() returns text language sql volatile set search_path=public as $$
  select 'INC-' || extract(year from (now() at time zone 'America/Santiago'))::integer || '-' || lpad(nextval('public.monitoring_incident_number_seq')::text,6,'0')
$$;

-- Endpoints: se amplía la entidad de Operaciones; el cliente se deriva del proyecto.
alter table public.project_endpoints add column if not exists client_id uuid references public.clients(id) on delete restrict;
update public.project_endpoints e set client_id=p.client_id from public.projects p where p.id=e.project_id and e.client_id is distinct from p.client_id;
create or replace function public.monitoring_endpoint_client_sync() returns trigger language plpgsql security definer set search_path=public as $$
begin select client_id into new.client_id from public.projects where id=new.project_id; return new; end $$;
drop trigger if exists project_endpoints_client_sync on public.project_endpoints;
create trigger project_endpoints_client_sync before insert or update of project_id on public.project_endpoints for each row execute function public.monitoring_endpoint_client_sync();
create index if not exists project_endpoints_project_idx on public.project_endpoints(project_id) where active;
create index if not exists project_endpoints_client_idx on public.project_endpoints(client_id) where active;
create index if not exists project_endpoints_responsible_idx on public.project_endpoints(responsible_user_id) where active;

-- Configuración operacional (fila única). Ningún umbral queda fijo en código.
create table if not exists public.monitoring_settings(
  id boolean primary key default true check(id),
  raw_retention_days integer not null default 30 check(raw_retention_days between 7 and 90),
  hourly_retention_days integer not null default 90 check(hourly_retention_days between 30 and 400),
  daily_retention_days integer not null default 730 check(daily_retention_days between 90 and 1825),
  reopen_window_minutes integer not null default 30 check(reopen_window_minutes between 0 and 1440),
  recovery_policy text not null default 'MONITORING' check(recovery_policy in('MONITORING','AUTO_RESOLVE')),
  auto_resolve_after_minutes integer default 30 check(auto_resolve_after_minutes is null or auto_resolve_after_minutes between 5 and 1440),
  uptime_maintenance_policy text not null default 'EXCLUDE' check(uptime_maintenance_policy in('EXCLUDE','INCLUDE')),
  postmortem_severities text[] not null default array['HIGH','CRITICAL'],
  ssl_alert_days integer[] not null default array[90,60,30,15,7,3,1],
  ssl_warning_days integer not null default 30 check(ssl_warning_days between 1 and 120),
  ssl_check_interval_minutes integer not null default 360 check(ssl_check_interval_minutes between 60 and 1440),
  manual_check_cooldown_seconds integer not null default 60 check(manual_check_cooldown_seconds between 30 and 3600),
  per_host_concurrency integer not null default 2 check(per_host_concurrency between 1 and 5),
  content_inspect_bytes integer not null default 65536 check(content_inspect_bytes between 1024 and 262144),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.monitoring_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.monitor_severity_rules(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  environment text,
  endpoint_type text,
  project_priority text check(project_priority is null or project_priority in('LOW','NORMAL','HIGH','URGENT','CRITICAL')),
  client_id uuid references public.clients(id) on delete restrict,
  severity text not null check(severity in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.monitor_severity_rules(name,environment,project_priority,severity)
select v.name,v.environment,v.project_priority,v.severity from(values
  ('Producción prioritaria caída','PRODUCTION','URGENT','CRITICAL'),
  ('Producción crítica caída','PRODUCTION','CRITICAL','CRITICAL'),
  ('Producción caída','PRODUCTION',null,'HIGH'),
  ('Staging caído','STAGING',null,'LOW'),
  ('Desarrollo caído','DEVELOPMENT',null,'INFO')
) v(name,environment,project_priority,severity)
where not exists(select 1 from public.monitor_severity_rules);

create table if not exists public.monitor_alert_rules(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope_type text not null default 'GLOBAL' check(scope_type in('GLOBAL','CLIENT','PROJECT','MONITOR')),
  client_id uuid references public.clients(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  monitor_id uuid,
  min_severity text not null default 'INFO' check(min_severity in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  enabled boolean not null default true,
  channels text[] not null default array['IN_APP','REALTIME'],
  notify_events text[] not null default array['INCIDENT_CONFIRMED','INCIDENT_ESCALATED','ENDPOINT_RECOVERED','INCIDENT_RESOLVED','SSL_EXPIRING','SSL_EXPIRED','LATENCY_DEGRADED','MAINTENANCE_STARTED','MAINTENANCE_COMPLETED'],
  escalation_policy jsonb not null default '{"steps":[{"afterMinutes":0,"targets":["ENDPOINT_RESPONSIBLE"]},{"afterMinutes":5,"targets":["PROJECT_LEAD"]},{"afterMinutes":15,"targets":["DEVELOPMENT_MANAGER"]}],"criticalImmediateTargets":["GENERAL_MANAGER"]}'::jsonb,
  recovery_targets text[] not null default array['ENDPOINT_RESPONSIBLE','INCIDENT_ASSIGNEE','PROJECT_LEAD'],
  sound_profile text not null default 'DEFAULT' check(sound_profile in('DEFAULT','URGENT','SILENT')),
  critical_sound_profile text not null default 'URGENT' check(critical_sound_profile in('DEFAULT','URGENT','SILENT')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(channels <@ array['IN_APP','REALTIME','EMAIL','WEB_PUSH']),
  check((scope_type='GLOBAL' and client_id is null and project_id is null and monitor_id is null) or (scope_type='CLIENT' and client_id is not null) or (scope_type='PROJECT' and project_id is not null) or (scope_type='MONITOR' and monitor_id is not null))
);
insert into public.monitor_alert_rules(name,scope_type) select 'Escalamiento estándar Zyteron','GLOBAL' where not exists(select 1 from public.monitor_alert_rules where scope_type='GLOBAL');

create table if not exists public.monitors(
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.project_endpoints(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  monitor_type text not null default 'HTTPS' check(monitor_type in('HTTP','HTTPS','TCP','DNS','API','CUSTOM')),
  enabled boolean not null default true,
  interval_seconds integer not null default 300 check(interval_seconds in(60,300,600,900,1800,3600)),
  timeout_ms integer not null default 10000 check(timeout_ms between 1000 and 30000),
  http_method text not null default 'GET' check(http_method in('GET','HEAD')),
  expected_status_min integer not null default 200 check(expected_status_min between 100 and 599),
  expected_status_max integer not null default 299 check(expected_status_max between 100 and 599),
  expected_content text check(expected_content is null or char_length(expected_content) between 1 and 200),
  follow_redirects boolean not null default true,
  max_redirects integer not null default 3 check(max_redirects between 0 and 5),
  failure_threshold integer not null default 3 check(failure_threshold between 1 and 10),
  recovery_threshold integer not null default 2 check(recovery_threshold between 1 and 10),
  ssl_monitoring_enabled boolean not null default true,
  warning_latency_ms integer check(warning_latency_ms is null or warning_latency_ms between 50 and 60000),
  critical_latency_ms integer check(critical_latency_ms is null or critical_latency_ms between 50 and 60000),
  incident_severity text check(incident_severity is null or incident_severity in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  maintenance_mode text not null default 'CHECK_AND_SUPPRESS' check(maintenance_mode in('CHECK_AND_SUPPRESS','PAUSE_CHECKS')),
  alert_rule_id uuid references public.monitor_alert_rules(id) on delete restrict,
  client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),
  status text not null default 'UNKNOWN' check(status in('UNKNOWN','ONLINE','DEGRADED','OFFLINE','MAINTENANCE','DISABLED')),
  status_reason text,
  status_changed_at timestamptz,
  consecutive_failures integer not null default 0 check(consecutive_failures>=0),
  consecutive_successes integer not null default 0 check(consecutive_successes>=0),
  failure_streak_started_at timestamptz,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_status_code integer,
  last_latency_ms integer,
  last_error_type text,
  last_error_message text,
  next_check_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_manual_check_at timestamptz,
  state_version bigint not null default 0,
  ssl_status text not null default 'UNKNOWN' check(ssl_status in('HEALTHY','EXPIRING_SOON','EXPIRED','INVALID','UNKNOWN','NOT_APPLICABLE')),
  ssl_expires_at timestamptz,
  ssl_issuer text,
  ssl_subject text,
  ssl_error_type text,
  ssl_fingerprint text,
  ssl_checked_at timestamptz,
  ssl_next_check_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(expected_status_min<=expected_status_max),
  check(warning_latency_ms is null or critical_latency_ms is null or warning_latency_ms<critical_latency_ms),
  -- Sólo HTTP/HTTPS tienen ejecutor real; otros tipos quedan reservados y no pueden activarse.
  check(not enabled or monitor_type in('HTTP','HTTPS')),
  unique(endpoint_id,monitor_type)
);
alter table public.monitor_alert_rules drop constraint if exists monitor_alert_rules_monitor_id_fkey;
alter table public.monitor_alert_rules add constraint monitor_alert_rules_monitor_id_fkey foreign key(monitor_id) references public.monitors(id) on delete restrict;

create or replace function public.monitoring_monitor_scope_sync() returns trigger language plpgsql security definer set search_path=public as $$
begin select project_id,client_id into new.project_id,new.client_id from public.project_endpoints where id=new.endpoint_id; if new.project_id is null then raise exception 'Endpoint no encontrado'; end if; return new; end $$;
drop trigger if exists monitors_scope_sync on public.monitors;
create trigger monitors_scope_sync before insert or update of endpoint_id on public.monitors for each row execute function public.monitoring_monitor_scope_sync();
create or replace function public.monitoring_project_client_cascade() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.client_id is distinct from old.client_id then update public.project_endpoints set client_id=new.client_id where project_id=new.id; update public.monitors set client_id=new.client_id where project_id=new.id; update public.incidents set client_id=new.client_id where project_id=new.id and status not in('CLOSED'); end if; return new; end $$;

create table if not exists public.monitor_checks(
  id bigint generated always as identity primary key,
  monitor_id uuid not null references public.monitors(id) on delete restrict,
  endpoint_id uuid not null references public.project_endpoints(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  checked_at timestamptz not null,
  success boolean not null,
  status_code integer,
  latency_ms integer check(latency_ms is null or latency_ms>=0),
  error_type text check(error_type is null or error_type in('TIMEOUT','DNS','CONNECTION','TLS','SSRF_BLOCKED','HTTP_STATUS','CONTENT_MISMATCH','REDIRECT_LIMIT','REDIRECT_LOOP','RESPONSE_TOO_LARGE','INVALID_URL','UNKNOWN')),
  error_code text,
  error_message text check(error_message is null or char_length(error_message)<=300),
  ssl_valid boolean,
  ssl_expiry_at timestamptz,
  redirect_count integer not null default 0,
  content_matched boolean,
  in_maintenance boolean not null default false,
  trigger_type text not null default 'SCHEDULED' check(trigger_type in('SCHEDULED','MANUAL')),
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.monitor_hourly_rollups(
  monitor_id uuid not null references public.monitors(id) on delete restrict,
  period_start timestamptz not null,
  checks integer not null, successes integer not null, failures integer not null,
  maintenance_checks integer not null default 0, maintenance_successes integer not null default 0,
  uptime_percentage numeric(7,4),
  avg_latency_ms numeric(10,2), p50_latency_ms numeric(10,2), p95_latency_ms numeric(10,2), min_latency_ms integer, max_latency_ms integer,
  updated_at timestamptz not null default now(),
  primary key(monitor_id,period_start)
);
create table if not exists public.monitor_daily_rollups(
  monitor_id uuid not null references public.monitors(id) on delete restrict,
  period_start timestamptz not null,
  checks integer not null, successes integer not null, failures integer not null,
  maintenance_checks integer not null default 0, maintenance_successes integer not null default 0,
  uptime_percentage numeric(7,4),
  avg_latency_ms numeric(10,2), p50_latency_ms numeric(10,2), p95_latency_ms numeric(10,2), min_latency_ms integer, max_latency_ms integer,
  updated_at timestamptz not null default now(),
  primary key(monitor_id,period_start)
);

create table if not exists public.ssl_observations(
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitors(id) on delete restrict,
  endpoint_id uuid not null references public.project_endpoints(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  hostname text not null,
  observed_at timestamptz not null default now(),
  status text not null check(status in('HEALTHY','EXPIRING_SOON','EXPIRED','INVALID','UNKNOWN','NOT_APPLICABLE')),
  valid boolean,
  issuer text, subject text, not_before timestamptz, expires_at timestamptz, days_remaining integer,
  fingerprint_sha256 text,
  error_type text check(error_type is null or error_type in('EXPIRED','HOSTNAME_MISMATCH','UNTRUSTED','SELF_SIGNED','NOT_YET_VALID','TLS_FAILURE','CONNECTION','SSRF_BLOCKED','TIMEOUT')),
  error_code text
);

create table if not exists public.incidents(
  id uuid primary key default gen_random_uuid(),
  incident_number text not null unique default public.next_incident_number(),
  project_id uuid not null references public.projects(id) on delete restrict,
  endpoint_id uuid references public.project_endpoints(id) on delete restrict,
  monitor_id uuid references public.monitors(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  source text not null default 'MONITOR' check(source in('MONITOR','MANUAL')),
  title text not null,
  description text,
  client_summary text,
  severity text not null check(severity in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'DETECTED' check(status in('DETECTED','CONFIRMED','ACKNOWLEDGED','INVESTIGATING','MITIGATING','MONITORING','RESOLVED','POSTMORTEM_REQUIRED','CLOSED')),
  failure_type text,
  detected_at timestamptz not null default now(),
  confirmed_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  assigned_to uuid,
  assigned_at timestamptz,
  current_outage_started_at timestamptz,
  recovered_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid,
  closed_at timestamptz,
  closed_by uuid,
  downtime_seconds integer check(downtime_seconds is null or downtime_seconds>=0),
  root_cause text,
  impact text,
  resolution text,
  preventive_actions text,
  postmortem_required boolean not null default false,
  postmortem_completed_at timestamptz,
  client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),
  reopened_count integer not null default 0,
  last_reopened_at timestamptz,
  escalation_level integer not null default 0,
  last_escalated_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(confirmed_at is null or confirmed_at>=detected_at),
  check(client_visibility='INTERNAL' or nullif(trim(client_summary),'') is not null)
);
-- Un único incidente activo por monitor: evita duplicados aunque existan varios workers.
create unique index if not exists incidents_one_active_per_monitor on public.incidents(monitor_id) where monitor_id is not null and status in('DETECTED','CONFIRMED','ACKNOWLEDGED','INVESTIGATING','MITIGATING','MONITORING');
drop trigger if exists projects_monitoring_client_cascade on public.projects;
create trigger projects_monitoring_client_cascade after update of client_id on public.projects for each row execute function public.monitoring_project_client_cascade();

create table if not exists public.incident_events(
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  event_type text not null check(event_type in('DETECTED','CONFIRMED','ACKNOWLEDGED','ASSIGNED','COMMENT','STATUS_CHANGED','RECOVERY_DETECTED','RESOLVED','REOPENED','RELAPSED','ESCALATED','TASK_CREATED','BUG_LINKED','POSTMORTEM_UPDATED','CLOSED','VISIBILITY_CHANGED','SEVERITY_CHANGED')),
  from_status text,
  to_status text,
  actor_id uuid,
  actor_type text not null default 'USER' check(actor_type in('USER','SYSTEM')),
  message text,
  visibility text not null default 'INTERNAL' check(visibility in('INTERNAL','CLIENT_VISIBLE')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Vínculos desacoplados: TASK usa tasks de Operaciones; BUG queda preparado sin depender de Desarrollo.
create table if not exists public.incident_links(
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete restrict,
  link_type text not null check(link_type in('TASK','BUG','DEPLOYMENT','EXTERNAL')),
  target_id uuid,
  external_reference text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check(target_id is not null or nullif(trim(external_reference),'') is not null)
);
create unique index if not exists incident_links_unique_target on public.incident_links(incident_id,link_type,target_id) where target_id is not null;
create or replace function public.monitoring_incident_link_guard() returns trigger language plpgsql set search_path=public as $$
declare incident_project uuid; begin
  select project_id into incident_project from public.incidents where id=new.incident_id;
  if new.link_type='TASK' and not exists(select 1 from public.tasks where id=new.target_id and project_id=incident_project) then raise exception 'La tarea debe pertenecer al proyecto del incidente'; end if;
  if new.link_type='DEPLOYMENT' and not exists(select 1 from public.deployments where id=new.target_id and project_id=incident_project) then raise exception 'El deployment debe pertenecer al proyecto del incidente'; end if;
  return new; end $$;
drop trigger if exists incident_links_guard on public.incident_links;
create trigger incident_links_guard before insert or update on public.incident_links for each row execute function public.monitoring_incident_link_guard();

create table if not exists public.maintenance_windows(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  endpoint_id uuid references public.project_endpoints(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  title text not null,
  description text,
  client_summary text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'PLANNED' check(status in('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
  suppress_alerts boolean not null default true,
  client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),
  created_by uuid,
  cancelled_by uuid,
  cancelled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at>starts_at),
  check(ends_at-starts_at<=interval '14 days')
);
create or replace function public.monitoring_maintenance_scope_sync() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.endpoint_id is not null and not exists(select 1 from public.project_endpoints where id=new.endpoint_id and project_id=new.project_id) then raise exception 'El endpoint debe pertenecer al proyecto de la ventana'; end if;
  select client_id into new.client_id from public.projects where id=new.project_id; return new; end $$;
drop trigger if exists maintenance_windows_scope_sync on public.maintenance_windows;
create trigger maintenance_windows_scope_sync before insert or update of project_id,endpoint_id on public.maintenance_windows for each row execute function public.monitoring_maintenance_scope_sync();

create table if not exists public.monitoring_events(
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  endpoint_id uuid references public.project_endpoints(id) on delete restrict,
  monitor_id uuid references public.monitors(id) on delete restrict,
  incident_id uuid references public.incidents(id) on delete restrict,
  maintenance_window_id uuid references public.maintenance_windows(id) on delete restrict,
  event_type text not null,
  tone text not null default 'INFO' check(tone in('INFO','SUCCESS','WARNING','CRITICAL')),
  title text not null,
  visibility text not null default 'INTERNAL' check(visibility in('INTERNAL','CLIENT_VISIBLE')),
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Ledger de entregas: deduplica alertas y actúa como bandeja IN_APP (Realtime la distribuye con RLS).
create table if not exists public.alert_delivery_events(
  id uuid primary key default gen_random_uuid(),
  dedup_key text not null unique,
  incident_id uuid references public.incidents(id) on delete restrict,
  monitor_id uuid references public.monitors(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  maintenance_window_id uuid references public.maintenance_windows(id) on delete restrict,
  rule_id uuid references public.monitor_alert_rules(id) on delete restrict,
  recipient_user_id uuid,
  recipient_role text,
  channel text not null check(channel in('IN_APP','REALTIME','EMAIL','WEB_PUSH')),
  stage text not null,
  event_type text not null,
  status text not null check(status in('DELIVERED','SENT','PROVIDER_NOT_CONFIGURED','NO_ADDRESS','FAILED','SUPPRESSED')),
  title text not null,
  body text,
  href text,
  severity text check(severity is null or severity in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  sound_profile text not null default 'DEFAULT' check(sound_profile in('DEFAULT','URGENT','SILENT')),
  provider_reference text,
  error_message text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check(recipient_user_id is not null or recipient_role is not null)
);

create table if not exists public.monitoring_worker_heartbeats(
  worker_id text primary key,
  hostname text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  checks_executed bigint not null default 0,
  last_error text
);

-- Preparado para status page pública futura: deshabilitada por defecto y sin ruta pública.
create table if not exists public.monitoring_status_pages(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  title text not null,
  enabled boolean not null default false,
  show_uptime boolean not null default true,
  show_incidents boolean not null default true,
  show_maintenance boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monitors_due_idx on public.monitors(next_check_at) where enabled;
create index if not exists monitors_endpoint_idx on public.monitors(endpoint_id);
create index if not exists monitors_project_status_idx on public.monitors(project_id,status);
create index if not exists monitors_client_idx on public.monitors(client_id);
create index if not exists monitors_ssl_expiry_idx on public.monitors(ssl_expires_at) where ssl_monitoring_enabled;
create index if not exists monitors_ssl_due_idx on public.monitors(ssl_next_check_at) where enabled and ssl_monitoring_enabled;
create index if not exists monitor_checks_monitor_time_idx on public.monitor_checks(monitor_id,checked_at desc);
create index if not exists monitor_checks_endpoint_time_idx on public.monitor_checks(endpoint_id,checked_at desc);
create index if not exists monitor_checks_checked_at_idx on public.monitor_checks(checked_at);
create index if not exists monitor_checks_failures_idx on public.monitor_checks(monitor_id,checked_at desc) where not success;
create index if not exists monitor_daily_rollups_period_idx on public.monitor_daily_rollups(period_start);
create index if not exists monitor_hourly_rollups_period_idx on public.monitor_hourly_rollups(period_start);
create index if not exists ssl_observations_monitor_idx on public.ssl_observations(monitor_id,observed_at desc);
create index if not exists ssl_observations_expiry_idx on public.ssl_observations(expires_at);
create index if not exists incidents_project_status_idx on public.incidents(project_id,status,detected_at desc);
create index if not exists incidents_endpoint_idx on public.incidents(endpoint_id,detected_at desc);
create index if not exists incidents_monitor_idx on public.incidents(monitor_id,detected_at desc);
create index if not exists incidents_client_idx on public.incidents(client_id,detected_at desc);
create index if not exists incidents_status_idx on public.incidents(status,severity);
create index if not exists incidents_detected_idx on public.incidents(detected_at desc);
create index if not exists incidents_resolved_idx on public.incidents(resolved_at desc) where resolved_at is not null;
create index if not exists incidents_assignee_idx on public.incidents(assigned_to,status);
create index if not exists incident_events_incident_idx on public.incident_events(incident_id,occurred_at);
create index if not exists incident_links_incident_idx on public.incident_links(incident_id);
create index if not exists maintenance_windows_project_idx on public.maintenance_windows(project_id,starts_at desc);
create index if not exists maintenance_windows_active_idx on public.maintenance_windows(starts_at,ends_at) where status in('PLANNED','ACTIVE');
create index if not exists monitoring_events_time_idx on public.monitoring_events(occurred_at desc);
create index if not exists monitoring_events_project_idx on public.monitoring_events(project_id,occurred_at desc);
create index if not exists monitoring_events_client_idx on public.monitoring_events(client_id,occurred_at desc);
create index if not exists monitoring_events_monitor_idx on public.monitoring_events(monitor_id,occurred_at desc);
create index if not exists alert_delivery_recipient_idx on public.alert_delivery_events(recipient_user_id,created_at desc);
create index if not exists alert_delivery_role_idx on public.alert_delivery_events(recipient_role,created_at desc);
create index if not exists alert_delivery_incident_idx on public.alert_delivery_events(incident_id);

-- Contexto de ejecución entregado al worker (sin credenciales ni cabeceras).
create or replace function public.monitoring_execution_payload(p_monitor uuid) returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'id',m.id,'endpointId',m.endpoint_id,'projectId',m.project_id,'clientId',m.client_id,'monitorType',m.monitor_type,'enabled',m.enabled,
    'intervalSeconds',m.interval_seconds,'timeoutMs',m.timeout_ms,'httpMethod',m.http_method,'expectedStatusMin',m.expected_status_min,'expectedStatusMax',m.expected_status_max,
    'expectedContent',m.expected_content,'followRedirects',m.follow_redirects,'maxRedirects',m.max_redirects,'failureThreshold',m.failure_threshold,'recoveryThreshold',m.recovery_threshold,
    'sslMonitoringEnabled',m.ssl_monitoring_enabled,'warningLatencyMs',m.warning_latency_ms,'criticalLatencyMs',m.critical_latency_ms,'incidentSeverity',m.incident_severity,
    'maintenanceMode',m.maintenance_mode,'alertRuleId',m.alert_rule_id,'status',m.status,'statusReason',m.status_reason,'consecutiveFailures',m.consecutive_failures,
    'consecutiveSuccesses',m.consecutive_successes,'failureStreakStartedAt',m.failure_streak_started_at,'lastLatencyMs',m.last_latency_ms,'stateVersion',m.state_version,
    'sslFingerprint',m.ssl_fingerprint,'sslStatus',m.ssl_status,
    'endpoint',jsonb_build_object('id',e.id,'name',e.name,'url',e.url,'environment',e.environment,'endpointType',e.endpoint_type,'responsibleUserId',e.responsible_user_id,'active',e.active),
    'project',jsonb_build_object('id',p.id,'name',p.name,'projectNumber',p.project_number,'priority',p.priority,'projectLeadId',p.project_lead_id,'developmentManagerId',p.development_manager_id,'clientId',p.client_id,'clientName',coalesce(c.trade_name,c.legal_name)))
  from public.monitors m join public.project_endpoints e on e.id=m.endpoint_id join public.projects p on p.id=m.project_id left join public.clients c on c.id=p.client_id
  where m.id=p_monitor
$$;

create or replace function public.monitoring_active_maintenance(p_project uuid,p_endpoint uuid,p_at timestamptz default now()) returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('id',w.id,'title',w.title,'suppressAlerts',w.suppress_alerts,'endsAt',w.ends_at)
  from public.maintenance_windows w
  where w.project_id=p_project and (w.endpoint_id is null or w.endpoint_id=p_endpoint) and w.status in('PLANNED','ACTIVE') and w.starts_at<=p_at and w.ends_at>p_at
  order by w.suppress_alerts desc,w.ends_at desc limit 1
$$;

-- Scheduler distribuido: cada worker reclama monitores vencidos con SKIP LOCKED y un lease temporal.
create or replace function public.monitoring_claim_due_monitors(p_worker text,p_limit integer default 20,p_lease_seconds integer default 120) returns jsonb language plpgsql security definer set search_path=public as $$
declare claimed jsonb;
begin
  if nullif(trim(p_worker),'') is null then raise exception 'Worker obligatorio'; end if;
  if p_limit not between 1 and 100 or p_lease_seconds not between 30 and 600 then raise exception 'Parámetros de claim inválidos'; end if;
  -- Ventanas con pausa de checks: se pospone la ejecución sin generar evidencia ficticia.
  update public.monitors m set next_check_at=now()+make_interval(secs=>m.interval_seconds),
    status=case when m.status<>'MAINTENANCE' then 'MAINTENANCE' else m.status end,
    status_reason='Checks pausados por ventana de mantenimiento',
    status_changed_at=case when m.status<>'MAINTENANCE' then now() else m.status_changed_at end,
    state_version=m.state_version+1
  where m.enabled and m.maintenance_mode='PAUSE_CHECKS' and m.next_check_at<=now() and (m.lease_expires_at is null or m.lease_expires_at<now())
    and public.monitoring_active_maintenance(m.project_id,m.endpoint_id) is not null;
  with due as (
    select m.id from public.monitors m join public.project_endpoints e on e.id=m.endpoint_id
    where m.enabled and e.active and m.monitor_type in('HTTP','HTTPS') and m.next_check_at<=now() and (m.lease_expires_at is null or m.lease_expires_at<now())
    order by m.next_check_at limit p_limit for update of m skip locked
  ), leased as (
    update public.monitors m set lease_owner=p_worker,lease_expires_at=now()+make_interval(secs=>p_lease_seconds) from due where m.id=due.id returning m.id
  )
  select coalesce(jsonb_agg(public.monitoring_execution_payload(leased.id)),'[]'::jsonb) into claimed from leased;
  -- El payload se arma tras el lease; se reinyecta el owner para validación posterior.
  return (select coalesce(jsonb_agg(item||jsonb_build_object('leaseOwner',p_worker)),'[]'::jsonb) from jsonb_array_elements(claimed) item);
end $$;

-- CHECK NOW: respeta cooldown, lease y estado del monitor; nunca omite la política SSRF (se aplica en el worker).
create or replace function public.monitoring_claim_monitor(p_monitor uuid,p_worker text,p_lease_seconds integer default 120,p_cooldown_seconds integer default 60) returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.monitors%rowtype;
begin
  select * into m from public.monitors where id=p_monitor for update;
  if not found then raise exception 'MONITOR_NOT_FOUND'; end if;
  if not m.enabled then raise exception 'MONITOR_DISABLED'; end if;
  if m.lease_expires_at is not null and m.lease_expires_at>now() then raise exception 'MONITOR_BUSY'; end if;
  if m.last_manual_check_at is not null and m.last_manual_check_at>now()-make_interval(secs=>p_cooldown_seconds) then raise exception 'MONITOR_COOLDOWN'; end if;
  update public.monitors set lease_owner=p_worker,lease_expires_at=now()+make_interval(secs=>p_lease_seconds),last_manual_check_at=now() where id=p_monitor;
  return public.monitoring_execution_payload(p_monitor)||jsonb_build_object('leaseOwner',p_worker);
end $$;

create or replace function public.monitoring_release_lease(p_monitor uuid,p_worker text,p_retry_seconds integer default 60) returns void language sql security definer set search_path=public as $$
  update public.monitors set lease_owner=null,lease_expires_at=null,next_check_at=greatest(next_check_at,now()+make_interval(secs=>p_retry_seconds)) where id=p_monitor and lease_owner=p_worker
$$;

-- Habilitar/deshabilitar invalida cualquier check en vuelo (state_version) y libera el lease.
create or replace function public.monitoring_set_enabled(p_monitor uuid,p_enabled boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  update public.monitors set enabled=p_enabled,status=case when p_enabled then 'UNKNOWN' else 'DISABLED' end,
    status_reason=case when p_enabled then 'Monitor habilitado; esperando próximo check' else 'Monitor deshabilitado' end,status_changed_at=now(),
    consecutive_failures=0,consecutive_successes=0,failure_streak_started_at=null,next_check_at=now(),lease_owner=null,lease_expires_at=null,state_version=state_version+1
  where id=p_monitor;
  if not found then raise exception 'MONITOR_NOT_FOUND'; end if;
  update public.project_endpoints e set monitoring_enabled=exists(select 1 from public.monitors m where m.endpoint_id=e.id and m.enabled) where e.id=(select endpoint_id from public.monitors where id=p_monitor);
end $$;

-- Aplica parches de incidente con jsonb_populate_record: sólo cambian las claves presentes.
create or replace function public.monitoring_patch_incident(p_incident uuid,p_patch jsonb,p_expected text[] default null,p_guard jsonb default '{}'::jsonb) returns public.incidents language plpgsql security definer set search_path=public as $$
declare cur public.incidents%rowtype; nxt public.incidents%rowtype;
begin
  select * into cur from public.incidents where id=p_incident for update;
  if not found then raise exception 'INCIDENT_NOT_FOUND'; end if;
  if p_expected is not null and not(cur.status=any(p_expected)) then return null; end if;
  if p_guard ? 'escalationBelow' and cur.escalation_level>=(p_guard->>'escalationBelow')::integer then return null; end if;
  if coalesce((p_guard->>'unacknowledged')::boolean,false) and cur.acknowledged_at is not null then return null; end if;
  nxt:=jsonb_populate_record(cur,p_patch);
  update public.incidents set status=nxt.status,severity=nxt.severity,title=nxt.title,description=nxt.description,client_summary=nxt.client_summary,confirmed_at=nxt.confirmed_at,
    acknowledged_at=nxt.acknowledged_at,acknowledged_by=nxt.acknowledged_by,assigned_to=nxt.assigned_to,assigned_at=nxt.assigned_at,current_outage_started_at=nxt.current_outage_started_at,
    recovered_at=nxt.recovered_at,resolved_at=nxt.resolved_at,resolved_by=nxt.resolved_by,closed_at=nxt.closed_at,closed_by=nxt.closed_by,downtime_seconds=nxt.downtime_seconds,
    root_cause=nxt.root_cause,impact=nxt.impact,resolution=nxt.resolution,preventive_actions=nxt.preventive_actions,postmortem_required=nxt.postmortem_required,
    postmortem_completed_at=nxt.postmortem_completed_at,client_visibility=nxt.client_visibility,reopened_count=nxt.reopened_count,last_reopened_at=nxt.last_reopened_at,
    escalation_level=nxt.escalation_level,last_escalated_at=nxt.last_escalated_at,updated_at=now()
  where id=p_incident returning * into nxt;
  return nxt;
end $$;

create or replace function public.monitoring_insert_side_effects(p_incident public.incidents,p_monitor uuid,p_incident_events jsonb,p_monitoring_events jsonb,p_outbox jsonb) returns void language plpgsql security definer set search_path=public as $$
declare ev jsonb; m record;
begin
  select id,endpoint_id,project_id,client_id into m from public.monitors where id=coalesce(p_monitor,p_incident.monitor_id);
  if p_incident.id is not null then
    for ev in select * from jsonb_array_elements(coalesce(p_incident_events,'[]'::jsonb)) loop
      insert into public.incident_events(incident_id,project_id,event_type,from_status,to_status,actor_id,actor_type,message,visibility,metadata,occurred_at)
      values(p_incident.id,p_incident.project_id,ev->>'eventType',ev->>'fromStatus',ev->>'toStatus',nullif(ev->>'actorId','')::uuid,coalesce(ev->>'actorType','SYSTEM'),ev->>'message',coalesce(ev->>'visibility','INTERNAL'),coalesce(ev->'metadata','{}'::jsonb),coalesce((ev->>'occurredAt')::timestamptz,now()));
    end loop;
  end if;
  for ev in select * from jsonb_array_elements(coalesce(p_monitoring_events,'[]'::jsonb)) loop
    insert into public.monitoring_events(project_id,client_id,endpoint_id,monitor_id,incident_id,maintenance_window_id,event_type,tone,title,visibility,actor_id,payload,occurred_at)
    values(coalesce(p_incident.project_id,m.project_id),coalesce(p_incident.client_id,m.client_id),coalesce(p_incident.endpoint_id,m.endpoint_id),m.id,
      case when coalesce((ev->>'attachIncident')::boolean,true) then p_incident.id end,nullif(ev->>'maintenanceWindowId','')::uuid,ev->>'eventType',coalesce(ev->>'tone','INFO'),
      replace(ev->>'title','{incidentNumber}',coalesce(p_incident.incident_number,'')),coalesce(ev->>'visibility','INTERNAL'),nullif(ev->>'actorId','')::uuid,
      coalesce(ev->'payload','{}'::jsonb)||case when p_incident.id is not null then jsonb_build_object('incidentNumber',p_incident.incident_number) else '{}'::jsonb end,coalesce((ev->>'occurredAt')::timestamptz,now()));
  end loop;
  for ev in select * from jsonb_array_elements(coalesce(p_outbox,'[]'::jsonb)) loop
    insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload)
    values(coalesce(ev->>'aggregateType','INCIDENT'),coalesce(case when ev->>'aggregateType'='MONITOR' then m.id end,p_incident.id,m.id),ev->>'eventType',
      coalesce(ev->'payload','{}'::jsonb)||jsonb_build_object('incidentId',p_incident.id,'incidentNumber',p_incident.incident_number,'monitorId',m.id,'projectId',coalesce(p_incident.project_id,m.project_id),'clientId',coalesce(p_incident.client_id,m.client_id)));
  end loop;
end $$;

-- Motor transaccional: valida lease/versión, guarda evidencia y aplica la decisión del motor en una transacción.
create or replace function public.monitoring_apply_check(p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.monitors%rowtype; c jsonb:=p->'check'; s jsonb:=p->'state'; inc jsonb:=p->'incident'; check_id bigint; incident public.incidents%rowtype; applied boolean:=false; action text:=inc->>'action';
begin
  select * into m from public.monitors where id=(p->>'monitorId')::uuid for update;
  if not found then raise exception 'MONITOR_NOT_FOUND'; end if;
  if m.lease_owner is distinct from p->>'workerId' or m.state_version<>(p->>'expectedVersion')::bigint then raise exception 'MONITOR_LEASE_LOST'; end if;
  insert into public.monitor_checks(monitor_id,endpoint_id,project_id,checked_at,success,status_code,latency_ms,error_type,error_code,error_message,ssl_valid,ssl_expiry_at,redirect_count,content_matched,in_maintenance,trigger_type,source)
  values(m.id,m.endpoint_id,m.project_id,(c->>'checkedAt')::timestamptz,(c->>'success')::boolean,nullif(c->>'statusCode','')::integer,nullif(c->>'latencyMs','')::integer,nullif(c->>'errorType',''),nullif(c->>'errorCode',''),left(nullif(c->>'errorMessage',''),300),
    nullif(c->>'sslValid','')::boolean,nullif(c->>'sslExpiresAt','')::timestamptz,coalesce((c->>'redirectCount')::integer,0),nullif(c->>'contentMatched','')::boolean,coalesce((c->>'inMaintenance')::boolean,false),coalesce(c->>'triggerType','SCHEDULED'),c->>'source')
  returning id into check_id;
  if action='CREATE' then
    insert into public.incidents(project_id,endpoint_id,monitor_id,client_id,source,title,description,severity,status,failure_type,detected_at,confirmed_at,current_outage_started_at,assigned_to,assigned_at,postmortem_required)
    values(m.project_id,m.endpoint_id,m.id,m.client_id,'MONITOR',inc->'draft'->>'title',inc->'draft'->>'description',inc->'draft'->>'severity','CONFIRMED',inc->'draft'->>'failureType',
      (inc->'draft'->>'detectedAt')::timestamptz,(inc->'draft'->>'confirmedAt')::timestamptz,(inc->'draft'->>'confirmedAt')::timestamptz,nullif(inc->'draft'->>'assignedTo','')::uuid,
      case when nullif(inc->'draft'->>'assignedTo','') is not null then (inc->'draft'->>'confirmedAt')::timestamptz end,coalesce((inc->'draft'->>'postmortemRequired')::boolean,false))
    on conflict(monitor_id) where monitor_id is not null and status in('DETECTED','CONFIRMED','ACKNOWLEDGED','INVESTIGATING','MITIGATING','MONITORING') do nothing
    returning * into incident;
    applied:=incident.id is not null;
    if not applied then select * into incident from public.incidents where monitor_id=m.id and status in('DETECTED','CONFIRMED','ACKNOWLEDGED','INVESTIGATING','MITIGATING','MONITORING'); end if;
  elsif action in('REOPEN','RELAPSE','RECOVER') then
    incident:=public.monitoring_patch_incident((inc->>'id')::uuid,inc->'patch',array(select jsonb_array_elements_text(inc->'expectedStatuses')));
    applied:=incident.id is not null;
  end if;
  perform public.monitoring_insert_side_effects(case when applied then incident else null end,m.id,case when applied then p->'incidentEvents' else '[]'::jsonb end,
    (select coalesce(jsonb_agg(e),'[]'::jsonb) from jsonb_array_elements(coalesce(p->'monitoringEvents','[]'::jsonb)) e where applied or not coalesce((e->>'requiresIncident')::boolean,false)),
    (select coalesce(jsonb_agg(e),'[]'::jsonb) from jsonb_array_elements(coalesce(p->'outbox','[]'::jsonb)) e where applied or not coalesce((e->>'requiresIncident')::boolean,false)));
  update public.monitors set status=s->>'status',status_reason=s->>'statusReason',status_changed_at=case when s->>'status'<>m.status then (c->>'checkedAt')::timestamptz else m.status_changed_at end,
    consecutive_failures=(s->>'consecutiveFailures')::integer,consecutive_successes=(s->>'consecutiveSuccesses')::integer,failure_streak_started_at=nullif(s->>'failureStreakStartedAt','')::timestamptz,
    last_checked_at=(c->>'checkedAt')::timestamptz,last_success_at=case when (c->>'success')::boolean then (c->>'checkedAt')::timestamptz else m.last_success_at end,
    last_failure_at=case when (c->>'success')::boolean then m.last_failure_at else (c->>'checkedAt')::timestamptz end,last_status_code=nullif(c->>'statusCode','')::integer,
    last_latency_ms=nullif(c->>'latencyMs','')::integer,last_error_type=nullif(c->>'errorType',''),last_error_message=left(nullif(c->>'errorMessage',''),300),
    next_check_at=(s->>'nextCheckAt')::timestamptz,lease_owner=null,lease_expires_at=null,state_version=m.state_version+1,updated_at=now()
  where id=m.id;
  return jsonb_build_object('checkId',check_id,'incidentId',incident.id,'incidentNumber',incident.incident_number,'incidentApplied',applied,'stateVersion',m.state_version+1);
end $$;

-- Mutaciones humanas (acknowledge, assign, estados, resolución, postmortem) con control optimista.
create or replace function public.monitoring_mutate_incident(p_incident uuid,p_expected_status text,p_patch jsonb,p_incident_events jsonb,p_monitoring_events jsonb,p_outbox jsonb,p_guard jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare incident public.incidents%rowtype;
begin
  incident:=public.monitoring_patch_incident(p_incident,p_patch,case when p_expected_status is null then null else array[p_expected_status] end,p_guard);
  if incident.id is null then return null; end if;
  perform public.monitoring_insert_side_effects(incident,incident.monitor_id,p_incident_events,p_monitoring_events,p_outbox);
  return to_jsonb(incident);
end $$;

-- Automatización de ventanas por fecha/hora UTC; los eventos quedan en monitoring_events y outbox.
create or replace function public.monitoring_run_maintenance_transitions() returns jsonb language plpgsql security definer set search_path=public as $$
declare started jsonb:='[]'::jsonb; completed jsonb:='[]'::jsonb; w public.maintenance_windows%rowtype;
begin
  if not pg_try_advisory_xact_lock(hashtext('monitoring_maintenance_transitions')) then return jsonb_build_object('started',started,'completed',completed,'skipped',true); end if;
  for w in update public.maintenance_windows set status='ACTIVE',started_at=coalesce(started_at,now()),updated_at=now() where status='PLANNED' and starts_at<=now() and ends_at>now() returning * loop
    started:=started||jsonb_build_array(to_jsonb(w));
    insert into public.monitoring_events(project_id,client_id,endpoint_id,maintenance_window_id,event_type,tone,title,visibility,payload) values(w.project_id,w.client_id,w.endpoint_id,w.id,'MAINTENANCE_STARTED','INFO','Inició la ventana de mantenimiento «'||w.title||'».',w.client_visibility,jsonb_build_object('endsAt',w.ends_at,'suppressAlerts',w.suppress_alerts));
    insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values('MAINTENANCE_WINDOW',w.id,'MAINTENANCE_STARTED',jsonb_build_object('projectId',w.project_id,'clientId',w.client_id,'endpointId',w.endpoint_id));
  end loop;
  for w in update public.maintenance_windows set status='COMPLETED',started_at=coalesce(started_at,starts_at),completed_at=now(),updated_at=now() where status in('PLANNED','ACTIVE') and ends_at<=now() returning * loop
    completed:=completed||jsonb_build_array(to_jsonb(w));
    insert into public.monitoring_events(project_id,client_id,endpoint_id,maintenance_window_id,event_type,tone,title,visibility,payload) values(w.project_id,w.client_id,w.endpoint_id,w.id,'MAINTENANCE_COMPLETED','SUCCESS','Finalizó la ventana de mantenimiento «'||w.title||'».',w.client_visibility,jsonb_build_object('startedAt',w.started_at));
    insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values('MAINTENANCE_WINDOW',w.id,'MAINTENANCE_COMPLETED',jsonb_build_object('projectId',w.project_id,'clientId',w.client_id,'endpointId',w.endpoint_id));
  end loop;
  -- Monitores marcados MAINTENANCE vuelven a UNKNOWN para que el próximo check determine su estado real.
  update public.monitors m set status=case when m.enabled then 'UNKNOWN' else 'DISABLED' end,status_reason='Ventana de mantenimiento finalizada; esperando próximo check',status_changed_at=now(),next_check_at=least(m.next_check_at,now()),state_version=m.state_version+1
  where m.status='MAINTENANCE' and m.lease_owner is null and public.monitoring_active_maintenance(m.project_id,m.endpoint_id) is null;
  return jsonb_build_object('started',started,'completed',completed,'skipped',false);
end $$;

-- Agregados horarios y diarios (día America/Santiago) recalculados de forma incremental e idempotente.
create or replace function public.monitoring_refresh_rollups(p_from timestamptz,p_to timestamptz default now()) returns integer language plpgsql security definer set search_path=public as $$
declare policy text; affected integer:=0; n integer; day_from timestamptz;
begin
  select uptime_maintenance_policy into policy from public.monitoring_settings where id;
  insert into public.monitor_hourly_rollups(monitor_id,period_start,checks,successes,failures,maintenance_checks,maintenance_successes,uptime_percentage,avg_latency_ms,p50_latency_ms,p95_latency_ms,min_latency_ms,max_latency_ms,updated_at)
  select monitor_id,date_trunc('hour',checked_at),count(*),count(*) filter(where success),count(*) filter(where not success),count(*) filter(where in_maintenance),count(*) filter(where in_maintenance and success),
    case when policy='EXCLUDE' then case when count(*) filter(where not in_maintenance)>0 then round(100.0*count(*) filter(where success and not in_maintenance)/count(*) filter(where not in_maintenance),4) end else round(100.0*count(*) filter(where success)/count(*),4) end,
    round(avg(latency_ms) filter(where success),2),percentile_cont(0.5) within group(order by latency_ms) filter(where success),percentile_cont(0.95) within group(order by latency_ms) filter(where success),
    min(latency_ms) filter(where success),max(latency_ms) filter(where success),now()
  from public.monitor_checks where checked_at>=date_trunc('hour',p_from) and checked_at<p_to group by monitor_id,date_trunc('hour',checked_at)
  on conflict(monitor_id,period_start) do update set checks=excluded.checks,successes=excluded.successes,failures=excluded.failures,maintenance_checks=excluded.maintenance_checks,maintenance_successes=excluded.maintenance_successes,
    uptime_percentage=excluded.uptime_percentage,avg_latency_ms=excluded.avg_latency_ms,p50_latency_ms=excluded.p50_latency_ms,p95_latency_ms=excluded.p95_latency_ms,min_latency_ms=excluded.min_latency_ms,max_latency_ms=excluded.max_latency_ms,updated_at=now();
  get diagnostics n=row_count; affected:=affected+n;
  day_from:=(date_trunc('day',p_from at time zone 'America/Santiago') at time zone 'America/Santiago');
  insert into public.monitor_daily_rollups(monitor_id,period_start,checks,successes,failures,maintenance_checks,maintenance_successes,uptime_percentage,avg_latency_ms,p50_latency_ms,p95_latency_ms,min_latency_ms,max_latency_ms,updated_at)
  select monitor_id,(date_trunc('day',checked_at at time zone 'America/Santiago') at time zone 'America/Santiago'),count(*),count(*) filter(where success),count(*) filter(where not success),count(*) filter(where in_maintenance),count(*) filter(where in_maintenance and success),
    case when policy='EXCLUDE' then case when count(*) filter(where not in_maintenance)>0 then round(100.0*count(*) filter(where success and not in_maintenance)/count(*) filter(where not in_maintenance),4) end else round(100.0*count(*) filter(where success)/count(*),4) end,
    round(avg(latency_ms) filter(where success),2),percentile_cont(0.5) within group(order by latency_ms) filter(where success),percentile_cont(0.95) within group(order by latency_ms) filter(where success),
    min(latency_ms) filter(where success),max(latency_ms) filter(where success),now()
  from public.monitor_checks where checked_at>=day_from and checked_at<p_to group by monitor_id,(date_trunc('day',checked_at at time zone 'America/Santiago') at time zone 'America/Santiago')
  on conflict(monitor_id,period_start) do update set checks=excluded.checks,successes=excluded.successes,failures=excluded.failures,maintenance_checks=excluded.maintenance_checks,maintenance_successes=excluded.maintenance_successes,
    uptime_percentage=excluded.uptime_percentage,avg_latency_ms=excluded.avg_latency_ms,p50_latency_ms=excluded.p50_latency_ms,p95_latency_ms=excluded.p95_latency_ms,min_latency_ms=excluded.min_latency_ms,max_latency_ms=excluded.max_latency_ms,updated_at=now();
  get diagnostics n=row_count; affected:=affected+n;
  return affected;
end $$;

-- Retención: los checks crudos se purgan por lotes sólo después de existir su agregado diario.
create or replace function public.monitoring_purge(p_batch integer default 5000) returns jsonb language plpgsql security definer set search_path=public as $$
declare cfg public.monitoring_settings%rowtype; raw_deleted integer:=0; hourly_deleted integer; daily_deleted integer; ssl_deleted integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('monitoring_purge')) then return jsonb_build_object('skipped',true); end if;
  select * into cfg from public.monitoring_settings where id;
  perform public.monitoring_refresh_rollups(now()-make_interval(days=>cfg.raw_retention_days+1),now()-make_interval(days=>cfg.raw_retention_days-1));
  delete from public.monitor_checks where id in(select id from public.monitor_checks where checked_at<now()-make_interval(days=>cfg.raw_retention_days) order by checked_at limit p_batch);
  get diagnostics raw_deleted=row_count;
  delete from public.monitor_hourly_rollups where period_start<now()-make_interval(days=>cfg.hourly_retention_days); get diagnostics hourly_deleted=row_count;
  delete from public.monitor_daily_rollups where period_start<now()-make_interval(days=>cfg.daily_retention_days); get diagnostics daily_deleted=row_count;
  delete from public.ssl_observations where observed_at<now()-interval '400 days'; get diagnostics ssl_deleted=row_count;
  return jsonb_build_object('rawDeleted',raw_deleted,'hourlyDeleted',hourly_deleted,'dailyDeleted',daily_deleted,'sslDeleted',ssl_deleted,'skipped',false);
end $$;

-- Estadísticas de un monitor: percentiles exactos desde checks crudos (dentro de retención) y uptime 90d desde agregados diarios.
create or replace function public.monitoring_monitor_stats(p_monitor uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare policy text; result jsonb:='{}'::jsonb; w record; first_check timestamptz; uptime jsonb:='{}'::jsonb; latency jsonb:='{}'::jsonb;
begin
  select uptime_maintenance_policy into policy from public.monitoring_settings where id;
  select min(checked_at) into first_check from public.monitor_checks where monitor_id=p_monitor;
  for w in select * from(values('h1',interval '1 hour'),('h24',interval '24 hours'),('d7',interval '7 days'),('d30',interval '30 days')) v(k,span) loop
    select uptime||jsonb_build_object(w.k,jsonb_build_object(
      'checks',count(*),'successes',count(*) filter(where success),'maintenanceChecks',count(*) filter(where in_maintenance),
      'percentage',case when policy='EXCLUDE' then case when count(*) filter(where not in_maintenance)>0 then round(100.0*count(*) filter(where success and not in_maintenance)/count(*) filter(where not in_maintenance),4) end else case when count(*)>0 then round(100.0*count(*) filter(where success)/count(*),4) end end)),
      latency||jsonb_build_object(w.k,jsonb_build_object('samples',count(*) filter(where success),'avg',round(avg(latency_ms) filter(where success),2),
      'p50',case when count(*) filter(where success)>=5 then percentile_cont(0.5) within group(order by latency_ms) filter(where success) end,
      'p95',case when count(*) filter(where success)>=20 then percentile_cont(0.95) within group(order by latency_ms) filter(where success) end,
      'min',min(latency_ms) filter(where success),'max',max(latency_ms) filter(where success)))
    into uptime,latency from public.monitor_checks where monitor_id=p_monitor and checked_at>=now()-w.span;
  end loop;
  select uptime||jsonb_build_object('d90',jsonb_build_object('checks',coalesce(sum(checks),0),'successes',coalesce(sum(successes),0),'maintenanceChecks',coalesce(sum(maintenance_checks),0),
    'percentage',case when policy='EXCLUDE' then case when sum(checks-maintenance_checks)>0 then round(100.0*sum(successes-maintenance_successes)/sum(checks-maintenance_checks),4) end else case when sum(checks)>0 then round(100.0*sum(successes)/sum(checks),4) end end))
  into uptime from public.monitor_daily_rollups where monitor_id=p_monitor and period_start>=now()-interval '90 days';
  return jsonb_build_object('uptime',uptime,'latency',latency,'firstCheckAt',first_check,'maintenancePolicy',policy,'generatedAt',now());
end $$;

create or replace function public.monitoring_uptime_pct(p_checks numeric,p_successes numeric,p_mchecks numeric,p_msuccesses numeric,p_policy text) returns numeric language sql immutable as $$
  select case when p_policy='EXCLUDE' then case when coalesce(p_checks,0)-coalesce(p_mchecks,0)>0 then round(100.0*(p_successes-coalesce(p_msuccesses,0))/(p_checks-coalesce(p_mchecks,0)),4) end
         else case when coalesce(p_checks,0)>0 then round(100.0*p_successes/p_checks,4) end end
$$;
-- Estadísticas de flota desde agregados (sin recorrer checks crudos en cada dashboard).
create or replace function public.monitoring_fleet_stats(p_monitors uuid[]) returns jsonb language sql stable security definer set search_path=public as $$
  with cfg as(select uptime_maintenance_policy policy from public.monitoring_settings where id),
  h as(select monitor_id,sum(checks) checks,sum(successes) successes,sum(maintenance_checks) mchecks,sum(maintenance_successes) msuccesses,
         case when sum(successes)>0 then round(sum(avg_latency_ms*successes)/nullif(sum(successes) filter(where avg_latency_ms is not null),0),2) end avg_latency,max(p95_latency_ms) worst_hour_p95
       from public.monitor_hourly_rollups where monitor_id=any(p_monitors) and period_start>=now()-interval '24 hours' group by monitor_id),
  d as(select monitor_id,
         sum(checks) filter(where period_start>=now()-interval '7 days') c7,sum(successes) filter(where period_start>=now()-interval '7 days') s7,sum(maintenance_checks) filter(where period_start>=now()-interval '7 days') mc7,sum(maintenance_successes) filter(where period_start>=now()-interval '7 days') ms7,
         sum(checks) filter(where period_start>=now()-interval '30 days') c30,sum(successes) filter(where period_start>=now()-interval '30 days') s30,sum(maintenance_checks) filter(where period_start>=now()-interval '30 days') mc30,sum(maintenance_successes) filter(where period_start>=now()-interval '30 days') ms30,
         sum(checks) c90,sum(successes) s90,sum(maintenance_checks) mc90,sum(maintenance_successes) ms90,min(period_start) first_day
       from public.monitor_daily_rollups where monitor_id=any(p_monitors) and period_start>=now()-interval '90 days' group by monitor_id)
  select coalesce(jsonb_object_agg(m.id,jsonb_build_object(
    'h24',public.monitoring_uptime_pct(h.checks,h.successes,h.mchecks,h.msuccesses,(select policy from cfg)),
    'd7',public.monitoring_uptime_pct(d.c7,d.s7,d.mc7,d.ms7,(select policy from cfg)),
    'd30',public.monitoring_uptime_pct(d.c30,d.s30,d.mc30,d.ms30,(select policy from cfg)),
    'd90',public.monitoring_uptime_pct(d.c90,d.s90,d.mc90,d.ms90,(select policy from cfg)),
    'checks24h',coalesce(h.checks,0),'avgLatency24h',h.avg_latency,'worstHourP95',h.worst_hour_p95,'firstDay',d.first_day)),'{}'::jsonb)
  from unnest(p_monitors) m(id) left join h on h.monitor_id=m.id left join d on d.monitor_id=m.id
$$;

-- Percentiles exactos de 24 h por monitor para ranking de endpoints lentos (umbral recomendado: <500 monitores).
create or replace function public.monitoring_latency_ranking(p_monitors uuid[],p_hours integer default 24) returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(monitor_id,jsonb_build_object('samples',samples,'avg',avg_ms,'p50',p50,'p95',p95)),'{}'::jsonb) from(
    select monitor_id,count(*) samples,round(avg(latency_ms),2) avg_ms,
      case when count(*)>=5 then percentile_cont(0.5) within group(order by latency_ms) end p50,
      case when count(*)>=20 then percentile_cont(0.95) within group(order by latency_ms) end p95
    from public.monitor_checks where monitor_id=any(p_monitors) and success and checked_at>=now()-make_interval(hours=>least(greatest(p_hours,1),720)) group by monitor_id) x
$$;

-- Proyección de actividad: Client 360 y Project Activity consumen los hitos relevantes sin duplicar lógica.
create or replace function public.monitoring_activity_projection() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.event_type not in('ENDPOINT_OFFLINE','INCIDENT_CONFIRMED','INCIDENT_ACKNOWLEDGED','ENDPOINT_RECOVERED','INCIDENT_RESOLVED','INCIDENT_REOPENED','MAINTENANCE_STARTED','MAINTENANCE_COMPLETED','SSL_EXPIRED') then return new; end if;
  if new.client_id is not null then
    insert into public.client_events(client_id,event_type,title,description,actor_id,visibility,metadata,occurred_at)
    values(new.client_id,'MONITORING_'||new.event_type,new.title,null,new.actor_id,case when new.visibility='CLIENT_VISIBLE' then 'CLIENT_SUMMARY_ONLY' else 'INTERNAL_ONLY' end,jsonb_build_object('monitoringEventId',new.id,'incidentId',new.incident_id,'monitorId',new.monitor_id),new.occurred_at);
  end if;
  if new.project_id is not null then
    insert into public.operations_events(project_id,aggregate_type,aggregate_id,event_type,actor_id,payload,occurred_at)
    values(new.project_id,'MONITORING',coalesce(new.incident_id,new.monitor_id,new.maintenance_window_id,new.id),new.event_type,new.actor_id,jsonb_build_object('title',new.title,'monitoringEventId',new.id),new.occurred_at);
  end if;
  return new;
end $$;
drop trigger if exists monitoring_events_activity_projection on public.monitoring_events;
create trigger monitoring_events_activity_projection after insert on public.monitoring_events for each row execute function public.monitoring_activity_projection();

do $$ declare table_name text; begin
  foreach table_name in array array['monitors','monitor_severity_rules','monitor_alert_rules','incidents','maintenance_windows','monitoring_status_pages'] loop
    execute format('drop trigger if exists %I on public.%I',table_name||'_touch_updated_at',table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',table_name||'_touch_updated_at',table_name);
  end loop;
end $$;

-- RLS: deny by default; lectura con alcance de proyecto. Las escrituras sólo ocurren vía API (service_role).
do $$ declare table_name text; begin
  foreach table_name in array array['monitoring_settings','monitor_severity_rules','monitor_alert_rules','monitors','monitor_checks','monitor_hourly_rollups','monitor_daily_rollups','ssl_observations','incidents','incident_events','incident_links','maintenance_windows','monitoring_events','alert_delivery_events','monitoring_worker_heartbeats','monitoring_status_pages'] loop
    execute format('alter table public.%I enable row level security',table_name);
  end loop;
end $$;

create or replace function private.monitoring_scope_all() returns boolean language sql stable security definer set search_path=public as $$
  select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','OPERACIONES')
$$;
create or replace function private.can_view_monitoring_project(target_project_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select target_project_id is not null and (private.monitoring_scope_all() or (private.zyteron_role() in('PROGRAMADOR','DESARROLLO','TECH_LEAD','SOPORTE_TECNICO') and private.can_access_project(target_project_id)))
$$;
create or replace function private.can_view_monitoring_config() returns boolean language sql stable security definer set search_path=public as $$
  select private.monitoring_scope_all() or private.zyteron_role() in('PROGRAMADOR','DESARROLLO','TECH_LEAD','SOPORTE_TECNICO')
$$;
create or replace function private.portal_monitoring_client() returns uuid language sql stable security definer set search_path=public as $$
  select p.client_id from public.client_portal_users p join public.client_portal_settings s on s.client_id=p.client_id
  where p.auth_user_id=auth.uid() and p.status='ACTIVE' and s.enabled and s.monitoring_visible and private.zyteron_role()='PORTAL_CLIENT' limit 1
$$;

do $$ declare table_name text; begin
  foreach table_name in array array['monitors','monitor_checks','ssl_observations','incidents','incident_events','maintenance_windows','monitoring_events'] loop
    execute format('drop policy if exists monitoring_project_read on public.%I',table_name);
    if table_name='incident_events' then
      execute 'create policy monitoring_project_read on public.incident_events for select to authenticated using(private.can_view_monitoring_project(project_id))';
    else
      execute format('create policy monitoring_project_read on public.%I for select to authenticated using(private.can_view_monitoring_project(project_id))',table_name);
    end if;
  end loop;
  drop policy if exists monitoring_rollup_read on public.monitor_hourly_rollups;
  create policy monitoring_rollup_read on public.monitor_hourly_rollups for select to authenticated using(exists(select 1 from public.monitors m where m.id=monitor_id and private.can_view_monitoring_project(m.project_id)));
  drop policy if exists monitoring_rollup_read on public.monitor_daily_rollups;
  create policy monitoring_rollup_read on public.monitor_daily_rollups for select to authenticated using(exists(select 1 from public.monitors m where m.id=monitor_id and private.can_view_monitoring_project(m.project_id)));
  drop policy if exists monitoring_links_read on public.incident_links;
  create policy monitoring_links_read on public.incident_links for select to authenticated using(exists(select 1 from public.incidents i where i.id=incident_id and private.can_view_monitoring_project(i.project_id)));
  drop policy if exists monitoring_config_read on public.monitoring_settings;
  create policy monitoring_config_read on public.monitoring_settings for select to authenticated using(private.can_view_monitoring_config());
  drop policy if exists monitoring_config_read on public.monitor_severity_rules;
  create policy monitoring_config_read on public.monitor_severity_rules for select to authenticated using(private.can_view_monitoring_config());
  drop policy if exists monitoring_rules_read on public.monitor_alert_rules;
  create policy monitoring_rules_read on public.monitor_alert_rules for select to authenticated using(private.monitoring_scope_all() or (private.can_view_monitoring_config() and (scope_type in('GLOBAL','CLIENT') or (project_id is not null and private.can_view_monitoring_project(project_id)) or exists(select 1 from public.monitors m where m.id=monitor_id and private.can_view_monitoring_project(m.project_id)))));
  drop policy if exists monitoring_alerts_recipient on public.alert_delivery_events;
  create policy monitoring_alerts_recipient on public.alert_delivery_events for select to authenticated using(recipient_user_id=auth.uid() or (recipient_role=private.zyteron_role() and (project_id is null or private.monitoring_scope_all() or private.can_view_monitoring_project(project_id))));
  drop policy if exists monitoring_heartbeats_read on public.monitoring_worker_heartbeats;
  create policy monitoring_heartbeats_read on public.monitoring_worker_heartbeats for select to authenticated using(private.monitoring_scope_all());
  drop policy if exists monitoring_status_pages_read on public.monitoring_status_pages;
  create policy monitoring_status_pages_read on public.monitoring_status_pages for select to authenticated using(private.monitoring_scope_all());
end $$;

-- Portal Cliente futuro: vistas con columnas seguras; nunca exponen notas internas, errores ni infraestructura.
create or replace view public.monitoring_portal_status with(security_barrier=true) as
  select m.id monitor_id,e.name endpoint_name,e.environment,m.client_id,m.status,m.ssl_status,m.ssl_expires_at,m.last_checked_at,
    (select uptime_percentage from public.monitor_daily_rollups r where r.monitor_id=m.id order by period_start desc limit 1) last_day_uptime
  from public.monitors m join public.project_endpoints e on e.id=m.endpoint_id
  where m.client_visibility='CLIENT_VISIBLE' and m.client_id=private.portal_monitoring_client();
create or replace view public.monitoring_portal_incidents with(security_barrier=true) as
  select i.id,i.incident_number,i.client_id,i.severity,i.status,i.client_summary,i.detected_at,i.confirmed_at,i.recovered_at,i.resolved_at,i.downtime_seconds
  from public.incidents i where i.client_visibility='CLIENT_VISIBLE' and i.client_id=private.portal_monitoring_client();
create or replace view public.monitoring_portal_maintenance with(security_barrier=true) as
  select w.id,w.client_id,coalesce(w.client_summary,w.title) summary,w.starts_at,w.ends_at,w.status
  from public.maintenance_windows w where w.client_visibility='CLIENT_VISIBLE' and w.client_id=private.portal_monitoring_client();
revoke all on public.monitoring_portal_status,public.monitoring_portal_incidents,public.monitoring_portal_maintenance from anon,public;
grant select on public.monitoring_portal_status,public.monitoring_portal_incidents,public.monitoring_portal_maintenance to authenticated;

insert into public.app_permissions(code,description) values
('monitoring.dashboard.view','Ver Reliability Command Center'),('monitoring.summary.view','Ver resumen autorizado de monitoreo'),
('monitor.view','Ver monitores'),('monitor.create','Crear monitores'),('monitor.edit','Editar monitores'),('monitor.disable','Habilitar o deshabilitar monitores'),
('endpoint.view','Ver endpoints monitoreados'),('endpoint.manage','Gestionar endpoints monitoreados'),
('incident.view','Ver incidentes'),('incident.acknowledge','Reconocer incidentes'),('incident.assign','Asignar incidentes'),('incident.manage','Gestionar incidentes'),('incident.resolve','Resolver incidentes'),
('ssl.view','Ver certificados SSL/TLS'),('maintenance.view','Ver ventanas de mantenimiento'),('maintenance.create','Crear ventanas de mantenimiento'),('maintenance.manage','Gestionar ventanas de mantenimiento'),
('alert_rule.view','Ver reglas de alerta'),('alert_rule.manage','Gestionar reglas de alerta'),('monitoring.export','Exportar informes de monitoreo'),('monitoring.settings.manage','Gestionar políticas de monitoreo')
on conflict(code) do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('JEFE_DESARROLLO'))r(role) cross join public.app_permissions p
where p.code like any(array['monitoring.%','monitor.%','endpoint.%','incident.%','ssl.%','maintenance.%','alert_rule.%']) on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'OPERACIONES',p.code from public.app_permissions p
where p.code like any(array['monitoring.%','monitor.%','endpoint.%','incident.%','ssl.%','maintenance.%','alert_rule.view']) and p.code<>'monitoring.settings.manage' on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'TECH_LEAD',p.code from public.app_permissions p
where p.code in('monitoring.dashboard.view','monitor.view','monitor.create','monitor.edit','monitor.disable','endpoint.view','endpoint.manage','incident.view','incident.acknowledge','incident.assign','incident.manage','incident.resolve','ssl.view','maintenance.view','maintenance.create','maintenance.manage','alert_rule.view','monitoring.export') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('PROGRAMADOR'),('DESARROLLO'))r(role) cross join public.app_permissions p
where p.code in('monitoring.dashboard.view','monitor.view','monitor.create','monitor.edit','endpoint.view','incident.view','incident.acknowledge','incident.manage','incident.resolve','ssl.view','maintenance.view','maintenance.create','alert_rule.view','monitoring.export') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'SOPORTE_TECNICO',p.code from public.app_permissions p
where p.code in('monitoring.dashboard.view','monitor.view','endpoint.view','incident.view','incident.acknowledge','incident.manage','ssl.view','maintenance.view','alert_rule.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,'monitoring.summary.view' from(values('JEFE_VENTAS'),('COMERCIAL'),('EJECUTIVA_VENTAS'))r(role) on conflict do nothing;

do $$ declare table_name text; begin
  foreach table_name in array array['monitors','incidents','incident_events','maintenance_windows','monitoring_events','alert_delivery_events'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then execute format('alter publication supabase_realtime add table public.%I',table_name); end if;
  end loop;
end $$;

do $$ declare fn text; begin
  foreach fn in array array[
    'public.next_incident_number()','public.monitoring_execution_payload(uuid)','public.monitoring_active_maintenance(uuid,uuid,timestamptz)',
    'public.monitoring_claim_due_monitors(text,integer,integer)','public.monitoring_claim_monitor(uuid,text,integer,integer)','public.monitoring_release_lease(uuid,text,integer)','public.monitoring_set_enabled(uuid,boolean)',
    'public.monitoring_patch_incident(uuid,jsonb,text[],jsonb)','public.monitoring_insert_side_effects(public.incidents,uuid,jsonb,jsonb,jsonb)','public.monitoring_apply_check(jsonb)',
    'public.monitoring_mutate_incident(uuid,text,jsonb,jsonb,jsonb,jsonb,jsonb)','public.monitoring_run_maintenance_transitions()','public.monitoring_refresh_rollups(timestamptz,timestamptz)',
    'public.monitoring_purge(integer)','public.monitoring_uptime_pct(numeric,numeric,numeric,numeric,text)','public.monitoring_monitor_stats(uuid)','public.monitoring_fleet_stats(uuid[])','public.monitoring_latency_ranking(uuid[],integer)'] loop
    execute format('revoke all on function %s from public,anon,authenticated',fn);
    execute format('grant execute on function %s to service_role',fn);
  end loop;
end $$;

commit;

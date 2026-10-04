-- Zyteron Enterprise Control Plane. Configuration metadata only; canonical
-- business entities remain owned by their domain modules.
begin;

create extension if not exists pgcrypto;

create table if not exists public.configuration_registry(
 id uuid primary key default gen_random_uuid(),namespace text not null,key text not null,value jsonb,value_type text not null check(value_type in('STRING','INTEGER','DECIMAL','BOOLEAN','ENUM','DURATION','JSON','SECRET_REFERENCE')),
 environment text not null default 'PRODUCTION' check(environment in('DEVELOPMENT','STAGING','PRODUCTION')),classification text not null default 'INTERNAL' check(classification in('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED','CRITICAL')),
 version integer not null default 1 check(version>0),effective_from timestamptz not null default now(),description text,schema jsonb not null default '{}',owner_domain text not null,approval_required boolean not null default false,updated_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(namespace,key,environment)
);
create table if not exists public.configuration_versions(id uuid primary key default gen_random_uuid(),configuration_id uuid not null references public.configuration_registry(id) on delete restrict,version integer not null,value jsonb,effective_from timestamptz not null,created_by uuid,change_reason text not null,created_at timestamptz not null default now(),unique(configuration_id,version));
create table if not exists public.configuration_change_requests(id uuid primary key default gen_random_uuid(),configuration_id uuid references public.configuration_registry(id) on delete restrict,namespace text not null,key text not null,before_value jsonb,after_value jsonb,value_type text not null,classification text not null,reason text not null,status text not null default 'DRAFT' check(status in('DRAFT','REVIEW','APPROVED','REJECTED','SCHEDULED','APPLIED','CANCELLED')),requested_by uuid,reviewed_by uuid,review_reason text,effective_from timestamptz not null default now(),applied_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.configuration_snapshots(id uuid primary key default gen_random_uuid(),environment text not null,label text not null,snapshot jsonb not null,created_by uuid,created_at timestamptz not null default now());
create table if not exists public.configuration_history(id uuid primary key default gen_random_uuid(),configuration_id uuid references public.configuration_registry(id) on delete restrict,namespace text not null,key text not null,action text not null,before_value jsonb,after_value jsonb,actor_id uuid,actor_role text,reason text not null,approval_id uuid references public.configuration_change_requests(id) on delete restrict,version integer,occurred_at timestamptz not null default now());
create table if not exists public.configuration_audit_events(id uuid primary key default gen_random_uuid(),action text not null,resource_type text not null,resource_id uuid,actor_id uuid,actor_role text,before_safe jsonb,after_safe jsonb,reason text not null,request_id text,occurred_at timestamptz not null default now());
create table if not exists public.configuration_outbox(id uuid primary key default gen_random_uuid(),event_type text not null,aggregate_type text not null,aggregate_id uuid not null,payload_safe jsonb not null default '{}',status text not null default 'PENDING' check(status in('PENDING','PROCESSING','DELIVERED','FAILED','DEAD_LETTER')),attempts integer not null default 0,available_at timestamptz not null default now(),processed_at timestamptz,last_error_safe text,created_at timestamptz not null default now());

create table if not exists public.numbering_sequences(id uuid primary key default gen_random_uuid(),code text not null unique,prefix text not null,year_format text not null default 'YYYY',padding integer not null default 6 check(padding between 1 and 12),separator text not null default '-',reset_policy text not null default 'YEARLY' check(reset_policy in('NEVER','YEARLY','MONTHLY')),next_value bigint not null default 1 check(next_value>0),active boolean not null default true,updated_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table if not exists public.automation_rules(id uuid primary key default gen_random_uuid(),name text not null,description text,event_type text not null,conditions jsonb not null default '[]',actions jsonb not null default '[]',priority integer not null default 100,enabled boolean not null default false,dry_run boolean not null default true,environment text not null default 'PRODUCTION',version integer not null default 1,max_depth integer not null default 3 check(max_depth between 1 and 10),retry_policy jsonb not null default '{"maxAttempts":3,"backoffSeconds":30}',created_by uuid,updated_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.automation_rule_versions(id uuid primary key default gen_random_uuid(),rule_id uuid not null references public.automation_rules(id) on delete restrict,version integer not null,snapshot jsonb not null,created_by uuid,reason text not null,created_at timestamptz not null default now(),unique(rule_id,version));
create table if not exists public.automation_runs(id uuid primary key default gen_random_uuid(),rule_id uuid not null references public.automation_rules(id) on delete restrict,event_id uuid,correlation_id uuid not null,causation_id uuid,depth integer not null default 0,matched boolean not null,actions jsonb not null default '[]',result text not null check(result in('DRY_RUN','SUCCESS','FAILED','DEAD_LETTER','SKIPPED_LOOP','DUPLICATE')),duration_ms integer not null default 0,error_safe text,created_at timestamptz not null default now());

create table if not exists public.escalation_policies(id uuid primary key default gen_random_uuid(),name text not null,steps jsonb not null default '[]',active boolean not null default true,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.alert_rules(id uuid primary key default gen_random_uuid(),name text not null,source text not null,event_type text not null,severity_min text not null check(severity_min in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),conditions jsonb not null default '[]',recipients text[] not null default '{}',channels text[] not null default '{IN_APP}',quiet_hours jsonb not null default '{}',dedup_window_minutes integer not null default 15 check(dedup_window_minutes>0),escalation_policy_id uuid references public.escalation_policies(id) on delete restrict,acknowledge_required boolean not null default false,critical_override boolean not null default false,enabled boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.alert_delivery_policies(id uuid primary key default gen_random_uuid(),alert_rule_id uuid not null references public.alert_rules(id) on delete restrict,channel text not null,provider_integration_id uuid,mandatory boolean not null default false,digest_mode text not null default 'IMMEDIATE',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(alert_rule_id,channel));

-- Development originally owned this shared catalog. Create its compatible base
-- here as well so Control Plane remains installable when modules are applied
-- independently or an older environment never ran the Development migration.
create table if not exists public.integration_connections(
 id uuid primary key default gen_random_uuid(),
 provider text not null,
 display_name text not null,
 external_reference text,
 status text not null default 'NOT_CONFIGURED',
 last_sync_at timestamptz,
 last_error text,
 code text,
 name text,
 category text,
 environment text not null default 'PRODUCTION',
 owner_domain text,
 configuration jsonb not null default '{}',
 secret_reference text,
 last_test_at timestamptz,
 last_success_at timestamptz,
 last_error_safe text,
 last_latency_ms integer,
 enabled boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(provider,display_name)
);

alter table public.integration_connections add column if not exists code text;
alter table public.integration_connections add column if not exists name text;
alter table public.integration_connections add column if not exists category text;
alter table public.integration_connections add column if not exists environment text not null default 'PRODUCTION';
alter table public.integration_connections add column if not exists owner_domain text;
alter table public.integration_connections add column if not exists configuration jsonb not null default '{}';
alter table public.integration_connections add column if not exists secret_reference text;
alter table public.integration_connections add column if not exists last_test_at timestamptz;
alter table public.integration_connections add column if not exists last_success_at timestamptz;
alter table public.integration_connections add column if not exists last_error_safe text;
alter table public.integration_connections add column if not exists last_latency_ms integer;
alter table public.integration_connections add column if not exists enabled boolean not null default false;
alter table public.integration_connections drop constraint if exists integration_connections_status_check;
alter table public.integration_connections add constraint integration_connections_status_check check(status in('NOT_CONFIGURED','CONFIGURED','CONNECTED','DEGRADED','ERROR','DISABLED','DISCONNECTED'));
create unique index if not exists integration_connections_code_uq on public.integration_connections(code) where code is not null;
create table if not exists public.integration_health_checks(id uuid primary key default gen_random_uuid(),integration_id uuid not null references public.integration_connections(id) on delete restrict,status text not null,message_safe text not null,latency_ms integer,checked_at timestamptz not null default now());

create table if not exists public.outgoing_webhooks(id uuid primary key default gen_random_uuid(),name text not null,url text not null check(url ~ '^https://'),events text[] not null default '{}',secret_reference text,enabled boolean not null default false,retry_policy jsonb not null default '{"maxAttempts":5,"backoffSeconds":30}',status text not null default 'CONFIGURED',created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.webhook_deliveries(id uuid primary key default gen_random_uuid(),webhook_id uuid not null references public.outgoing_webhooks(id) on delete restrict,event_type text not null,delivery_id uuid not null unique,status text not null default 'PENDING' check(status in('PENDING','PROCESSING','DELIVERED','FAILED','DEAD_LETTER')),attempts integer not null default 0,response_code integer,duration_ms integer,error_safe text,next_attempt_at timestamptz,created_at timestamptz not null default now());

create table if not exists public.feature_flags(id uuid primary key default gen_random_uuid(),key text not null,description text not null,enabled boolean not null default false,environment text not null default 'PRODUCTION',scope text not null default 'GLOBAL' check(scope in('GLOBAL','ROLE','TEAM','USER','CLIENT','ENVIRONMENT')),rollout numeric(5,2) not null default 0 check(rollout between 0 and 100),kill_switch boolean not null default false,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(key,environment,scope));
create table if not exists public.feature_flag_overrides(id uuid primary key default gen_random_uuid(),feature_flag_id uuid not null references public.feature_flags(id) on delete restrict,target_type text not null,target_id text not null,enabled boolean not null,created_by uuid,created_at timestamptz not null default now(),unique(feature_flag_id,target_type,target_id));
create table if not exists public.workflow_definitions(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,owner_domain text not null,states jsonb not null default '[]',transitions jsonb not null default '[]',guards jsonb not null default '[]',version integer not null default 1,status text not null default 'DRAFT',created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.workflow_versions(id uuid primary key default gen_random_uuid(),workflow_id uuid not null references public.workflow_definitions(id) on delete restrict,version integer not null,snapshot jsonb not null,reason text not null,created_by uuid,created_at timestamptz not null default now(),unique(workflow_id,version));

create table if not exists public.system_jobs(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,owner_domain text not null,schedule text,enabled boolean not null default false,manual_run_allowed boolean not null default false,status text not null default 'DISABLED' check(status in('IDLE','RUNNING','SUCCESS','FAILED','DELAYED','DISABLED')),last_run_at timestamptz,next_run_at timestamptz,duration_ms integer,last_error_safe text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.system_job_runs(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.system_jobs(id) on delete restrict,status text not null check(status in('QUEUED','RUNNING','SUCCESS','FAILED','DEAD_LETTER')),requested_by uuid,started_at timestamptz,finished_at timestamptz,duration_ms integer,error_safe text,created_at timestamptz not null default now());
create table if not exists public.system_diagnostics(id uuid primary key default gen_random_uuid(),service text not null,status text not null check(status in('HEALTHY','DEGRADED','ERROR','NOT_CONFIGURED')),latency_ms integer,message text not null,checked_at timestamptz not null default now());

create index if not exists configuration_registry_namespace_idx on public.configuration_registry(namespace,environment,updated_at desc);
create index if not exists configuration_history_lookup_idx on public.configuration_history(namespace,key,occurred_at desc);
create index if not exists configuration_outbox_pending_idx on public.configuration_outbox(status,available_at);
create index if not exists automation_runs_rule_idx on public.automation_runs(rule_id,created_at desc);
create index if not exists webhook_deliveries_retry_idx on public.webhook_deliveries(status,next_attempt_at);
create index if not exists diagnostics_service_idx on public.system_diagnostics(service,checked_at desc);

insert into public.integration_connections(provider,display_name,code,name,category,owner_domain,status,environment,enabled)
select code,name,code,name,category,owner,'NOT_CONFIGURED','PRODUCTION',false from(values
 ('SUPABASE','Supabase','Platform','SYSTEM'),('GITHUB','GitHub','Development','DEVELOPMENT'),('RENDER','Render','Platform','SYSTEM'),('MERCADO_PAGO','Mercado Pago','Payments','FINANCE'),('SII_DTE','SII / DTE Provider','Tax','FINANCE'),('ELECTRONIC_SIGNATURE','Firma electrónica','Documents','DOCUMENTS'),('EMAIL','Email Provider','Notifications','NOTIFICATIONS'),('MICROSOFT_GRAPH','Microsoft Graph','Productivity','SYSTEM'))v(code,name,category,owner)
where not exists(select 1 from public.integration_connections i where i.code=v.code);
insert into public.system_jobs(code,name,owner_domain,manual_run_allowed) values
 ('MONITOR_CHECKS','Monitor checks','MONITORING',true),('RENEWALS','Renewals','CLIENTS',true),('AUDIT_SCHEDULER','Audit scheduler','AUDITS',true),('BILLING_SCHEDULES','Billing schedules','FINANCE',true),('SLA_JOBS','SLA jobs','SUPPORT',true),('RETENTION','Retention','SECURITY',false),('SECURITY_SCANS','Security scans','SECURITY',true),('BACKUP_CHECKS','Backup checks','SECURITY',true),('NOTIFICATION_DELIVERY','Notification delivery','NOTIFICATIONS',true),('AUTOMATION_WORKER','Automation worker','SETTINGS',false)
on conflict(code)do nothing;
insert into public.numbering_sequences(code,prefix,padding) values('COT','COT',5),('OT','OT',6),('PRJ','PRJ',6),('CTR','CTR',6),('AUD','AUD',6),('FND','FND',6),('SUP','SUP',6),('INV','INV',6),('SEC','SEC',6),('EMP','EMP',6) on conflict(code)do nothing;

insert into public.app_permissions(code,description) values
 ('settings.dashboard.view','Ver Control Plane'),('settings.company.view','Ver configuración empresarial'),('settings.company.manage','Gestionar configuración empresarial'),('settings.organization.view','Ver organización'),('settings.organization.manage','Gestionar organización'),('settings.numbering.view','Ver numeraciones'),('settings.numbering.manage','Gestionar numeraciones'),('settings.calendar.view','Ver calendarios'),('settings.calendar.manage','Gestionar calendarios'),('automation.view','Ver automatizaciones'),('automation.create','Crear automatizaciones'),('automation.edit','Editar automatizaciones'),('automation.enable','Activar automatizaciones'),('automation.approve','Aprobar automatizaciones'),('alert.view','Ver políticas de alerta'),('alert.manage','Gestionar políticas de alerta'),('notification_policy.view','Ver políticas de notificación'),('notification_policy.manage','Gestionar políticas de notificación'),('integration.view','Ver integraciones'),('integration.manage','Gestionar integraciones'),('integration.test','Probar integraciones'),('webhook.view','Ver webhooks'),('webhook.manage','Gestionar webhooks'),('feature_flag.view','Ver feature flags'),('feature_flag.manage','Gestionar feature flags'),('workflow.view','Ver workflows'),('workflow.manage','Gestionar workflows'),('approval_policy.view','Ver aprobaciones'),('approval_policy.manage','Gestionar aprobaciones'),('template.admin','Administrar plantillas canónicas'),('ai_settings.view','Ver configuración IA'),('ai_settings.manage','Gestionar configuración IA'),('portal_settings.view','Ver configuración Portal'),('portal_settings.manage','Gestionar configuración Portal'),('system_settings.view','Ver configuración de sistema'),('system_settings.manage','Gestionar configuración de sistema'),('job.view','Ver jobs'),('job.run','Ejecutar jobs permitidos'),('diagnostics.view','Ver diagnósticos'),('diagnostics.run','Ejecutar diagnósticos'),('configuration_history.view','Ver historial de configuración'),('configuration.rollback','Revertir configuración') on conflict(code)do update set description=excluded.description;
insert into public.role_permissions(role,permission_code)
select role,code from(values('GERENTE_GENERAL'),('SECURITY_ADMIN'))r(role) cross join(values('settings.dashboard.view'),('settings.company.view'),('settings.company.manage'),('settings.organization.view'),('settings.organization.manage'),('settings.numbering.view'),('settings.numbering.manage'),('settings.calendar.view'),('settings.calendar.manage'),('automation.view'),('automation.create'),('automation.edit'),('automation.enable'),('automation.approve'),('alert.view'),('alert.manage'),('notification_policy.view'),('notification_policy.manage'),('integration.view'),('integration.manage'),('integration.test'),('webhook.view'),('webhook.manage'),('feature_flag.view'),('feature_flag.manage'),('workflow.view'),('workflow.manage'),('approval_policy.view'),('approval_policy.manage'),('template.admin'),('ai_settings.view'),('ai_settings.manage'),('portal_settings.view'),('portal_settings.manage'),('system_settings.view'),('system_settings.manage'),('job.view'),('job.run'),('diagnostics.view'),('diagnostics.run'),('configuration_history.view'),('configuration.rollback'))p(code) on conflict do nothing;
insert into public.role_permissions(role,permission_code) values
 ('RRHH','settings.dashboard.view'),('RRHH','settings.company.view'),('RRHH','settings.company.manage'),('RRHH','settings.organization.view'),('RRHH','settings.organization.manage'),('RRHH','settings.calendar.view'),('RRHH','settings.calendar.manage'),('RRHH','configuration_history.view'),
 ('FINANZAS','settings.dashboard.view'),('FINANZAS','settings.company.view'),('FINANZAS','settings.company.manage'),('FINANZAS','approval_policy.view'),('FINANZAS','configuration_history.view'),
 ('JEFE_DESARROLLO','settings.dashboard.view'),('JEFE_DESARROLLO','automation.view'),('JEFE_DESARROLLO','automation.create'),('JEFE_DESARROLLO','automation.edit'),('JEFE_DESARROLLO','integration.view'),('JEFE_DESARROLLO','feature_flag.view'),('JEFE_DESARROLLO','job.view'),('JEFE_DESARROLLO','configuration_history.view'),
 ('OPERACIONES','settings.dashboard.view'),('OPERACIONES','automation.view'),('OPERACIONES','automation.create'),('OPERACIONES','automation.edit'),('OPERACIONES','alert.view'),('OPERACIONES','integration.view'),('OPERACIONES','job.view'),('OPERACIONES','configuration_history.view'),
 ('JEFE_VENTAS','settings.dashboard.view'),('JEFE_VENTAS','settings.company.view'),('JEFE_VENTAS','automation.view'),('JEFE_VENTAS','alert.view'),('JEFE_VENTAS','integration.view'),('JEFE_VENTAS','configuration_history.view') on conflict do nothing;

create or replace function private.settings_can_view()returns boolean language sql stable security definer set search_path=public,private as $$select private.zyteron_role() in('GERENTE_GENERAL','SECURITY_ADMIN','RRHH','FINANZAS','JEFE_VENTAS','JEFE_DESARROLLO','OPERACIONES')$$;
create or replace function private.settings_can_manage()returns boolean language sql stable security definer set search_path=public,private as $$select private.zyteron_role() in('GERENTE_GENERAL','SECURITY_ADMIN')$$;
create or replace function private.prevent_configuration_evidence_mutation()returns trigger language plpgsql as $$begin raise exception 'configuration evidence is append-only';end$$;
drop trigger if exists configuration_history_immutable on public.configuration_history;create trigger configuration_history_immutable before update or delete on public.configuration_history for each row execute function private.prevent_configuration_evidence_mutation();
drop trigger if exists configuration_audit_immutable on public.configuration_audit_events;create trigger configuration_audit_immutable before update or delete on public.configuration_audit_events for each row execute function private.prevent_configuration_evidence_mutation();

-- Authenticated clients are read-only. Every mutation passes through the API,
-- whose service role enforces permissions, AAL2, versioning, approval and audit.
do $$declare t text;begin foreach t in array array['configuration_registry','configuration_versions','configuration_change_requests','configuration_snapshots','configuration_history','configuration_audit_events','configuration_outbox','numbering_sequences','automation_rules','automation_rule_versions','automation_runs','escalation_policies','alert_rules','alert_delivery_policies','integration_health_checks','outgoing_webhooks','webhook_deliveries','feature_flags','feature_flag_overrides','workflow_definitions','workflow_versions','system_jobs','system_job_runs','system_diagnostics'] loop execute format('alter table public.%I enable row level security',t);execute format('drop policy if exists %I on public.%I',t||'_read',t);execute format('create policy %I on public.%I for select to authenticated using(private.settings_can_view())',t||'_read',t);execute format('drop policy if exists %I on public.%I',t||'_manage',t);end loop;end$$;

do $$begin alter publication supabase_realtime add table public.configuration_registry;exception when duplicate_object then null;end$$;
do $$begin alter publication supabase_realtime add table public.automation_rules;exception when duplicate_object then null;end$$;
do $$begin alter publication supabase_realtime add table public.alert_rules;exception when duplicate_object then null;end$$;
do $$begin alter publication supabase_realtime add table public.feature_flags;exception when duplicate_object then null;end$$;
do $$begin alter publication supabase_realtime add table public.system_jobs;exception when duplicate_object then null;end$$;

commit;

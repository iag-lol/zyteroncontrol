-- Reparación incremental del dominio Monitoreo.
-- Requiere explícitamente la migración canónica 20261001050000_site_reliability_monitoring.sql.

do $$
declare required_table text;
begin
  foreach required_table in array array['monitors','monitor_checks','incidents','monitor_alert_rules','alert_delivery_events','monitoring_worker_heartbeats','business_event_outbox'] loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'MONITORING_BASE_MISSING: public.% no existe; aplique primero 20261001050000_site_reliability_monitoring.sql', required_table;
    end if;
  end loop;
end $$;

alter table public.business_event_outbox
  add column if not exists lease_owner text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_error text;

create index if not exists business_event_outbox_monitoring_lease_idx
  on public.business_event_outbox(occurred_at)
  where processed_at is null and event_type in('INCIDENT_CONFIRMED','ENDPOINT_RECOVERED','INCIDENT_RESOLVED','LATENCY_DEGRADED','MAINTENANCE_STARTED','MAINTENANCE_COMPLETED');

create or replace function public.monitoring_claim_outbox(p_worker text,p_limit integer default 50,p_lease_seconds integer default 120)
returns table(id uuid,aggregate_type text,aggregate_id uuid,event_type text,payload jsonb,occurred_at timestamptz,attempts integer)
language plpgsql security definer set search_path=public as $$
begin
  if nullif(trim(p_worker),'') is null or p_limit not between 1 and 100 or p_lease_seconds not between 30 and 600 then
    raise exception 'Parámetros de claim de outbox inválidos';
  end if;
  return query
  with pending as (
    select o.id from public.business_event_outbox o
    where o.processed_at is null
      and o.event_type in('INCIDENT_CONFIRMED','ENDPOINT_RECOVERED','INCIDENT_RESOLVED','LATENCY_DEGRADED','MAINTENANCE_STARTED','MAINTENANCE_COMPLETED')
      and (o.lease_expires_at is null or o.lease_expires_at<now())
    order by o.occurred_at limit p_limit for update skip locked
  ), claimed as (
    update public.business_event_outbox o
      set lease_owner=p_worker,lease_expires_at=now()+make_interval(secs=>p_lease_seconds),attempts=o.attempts+1,last_error=null
    from pending where o.id=pending.id
    returning o.id,o.aggregate_type,o.aggregate_id,o.event_type,o.payload,o.occurred_at,o.attempts
  ) select * from claimed;
end $$;

create or replace function public.monitoring_complete_outbox(p_id uuid,p_worker text,p_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.business_event_outbox
    set processed_at=case when p_error is null then now() else processed_at end,
        lease_owner=null,lease_expires_at=null,last_error=left(p_error,500)
  where id=p_id and lease_owner=p_worker;
end $$;

revoke all on function public.monitoring_claim_outbox(text,integer,integer),public.monitoring_complete_outbox(uuid,text,text) from public,anon,authenticated;
grant execute on function public.monitoring_claim_outbox(text,integer,integer),public.monitoring_complete_outbox(uuid,text,text) to service_role;

alter table public.monitoring_worker_heartbeats
  add column if not exists release_sha text,
  add column if not exists persistence_mode text not null default 'unknown',
  add column if not exists scheduler_active boolean not null default false,
  add column if not exists process_role text not null default 'unknown',
  add column if not exists next_job_at timestamptz,
  add column if not exists queue_lag_seconds bigint,
  add column if not exists last_check_at timestamptz;

do $$
declare constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  where c.conrelid='public.alert_delivery_events'::regclass
    and c.contype='c'
    and pg_get_constraintdef(c.oid) ilike '%status%provider_not_configured%';
  if constraint_name is null then
    raise exception 'MONITORING_SCHEMA_DRIFT: no se encontró el check de status de alert_delivery_events';
  end if;
  execute format('alter table public.alert_delivery_events drop constraint %I', constraint_name);
  alter table public.alert_delivery_events add constraint alert_delivery_events_status_check
    check(status in('QUEUED','ACCEPTED','DELIVERED','SENT','PROVIDER_NOT_CONFIGURED','NO_ADDRESS','FAILED','SUPPRESSED'));
end $$;

alter table public.monitor_alert_rules alter column escalation_policy set default
  '{"steps":[{"afterMinutes":0,"targets":["ENDPOINT_RESPONSIBLE","DEVELOPMENT_MANAGER","GENERAL_MANAGER"]},{"afterMinutes":5,"targets":["PROJECT_LEAD"]}],"criticalImmediateTargets":[]}'::jsonb;

-- Sólo corrige la semilla canónica; no sobrescribe reglas empresariales personalizadas.
update public.monitor_alert_rules
set escalation_policy='{"steps":[{"afterMinutes":0,"targets":["ENDPOINT_RESPONSIBLE","DEVELOPMENT_MANAGER","GENERAL_MANAGER"]},{"afterMinutes":5,"targets":["PROJECT_LEAD"]}],"criticalImmediateTargets":[]}'::jsonb,
    updated_at=now()
where name='Escalamiento estándar Zyteron'
  and scope_type='GLOBAL'
  and escalation_policy='{"steps":[{"afterMinutes":0,"targets":["ENDPOINT_RESPONSIBLE"]},{"afterMinutes":5,"targets":["PROJECT_LEAD"]},{"afterMinutes":15,"targets":["DEVELOPMENT_MANAGER"]}],"criticalImmediateTargets":["GENERAL_MANAGER"]}'::jsonb;

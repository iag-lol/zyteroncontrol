-- Monitoreo puede pertenecer directamente a un cliente. Operaciones conserva sus proyectos como
-- vínculo opcional y no se crean proyectos sintéticos para satisfacer una restricción técnica.
begin;

do $$
begin
  if to_regclass('public.project_endpoints') is null or to_regclass('public.monitors') is null then
    raise exception 'Primero aplica las migraciones de Operaciones y Site Reliability';
  end if;
end $$;

alter table public.project_endpoints alter column project_id drop not null;
alter table public.monitors alter column project_id drop not null;
alter table public.monitor_checks alter column project_id drop not null;
alter table public.ssl_observations alter column project_id drop not null;
alter table public.incidents alter column project_id drop not null;
alter table public.incident_events alter column project_id drop not null;

alter table public.project_endpoints drop constraint if exists project_endpoints_monitoring_owner_check;
alter table public.project_endpoints add constraint project_endpoints_monitoring_owner_check
  check(project_id is not null or client_id is not null) not valid;
alter table public.project_endpoints validate constraint project_endpoints_monitoring_owner_check;

create or replace function public.monitoring_endpoint_client_sync() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.project_id is not null then
    select client_id into new.client_id from public.projects where id=new.project_id;
    if not found then raise exception 'Proyecto no encontrado'; end if;
  elsif new.client_id is null then
    raise exception 'El endpoint de monitoreo requiere cliente o proyecto';
  end if;
  return new;
end $$;

create or replace function public.monitoring_monitor_scope_sync() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  select project_id,client_id into new.project_id,new.client_id
  from public.project_endpoints where id=new.endpoint_id;
  if not found then raise exception 'Endpoint no encontrado'; end if;
  if new.project_id is null and new.client_id is null then raise exception 'Endpoint sin cliente ni proyecto'; end if;
  return new;
end $$;

-- Contexto seguro para el worker: el objeto project se mantiene estable, con campos nulos cuando
-- el monitor no está vinculado a un proyecto.
create or replace function public.monitoring_execution_payload(p_monitor uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'id',m.id,'endpointId',m.endpoint_id,'projectId',m.project_id,'clientId',m.client_id,'monitorType',m.monitor_type,'enabled',m.enabled,
    'intervalSeconds',m.interval_seconds,'timeoutMs',m.timeout_ms,'httpMethod',m.http_method,'expectedStatusMin',m.expected_status_min,'expectedStatusMax',m.expected_status_max,
    'expectedContent',m.expected_content,'followRedirects',m.follow_redirects,'maxRedirects',m.max_redirects,'failureThreshold',m.failure_threshold,'recoveryThreshold',m.recovery_threshold,
    'sslMonitoringEnabled',m.ssl_monitoring_enabled,'warningLatencyMs',m.warning_latency_ms,'criticalLatencyMs',m.critical_latency_ms,'incidentSeverity',m.incident_severity,
    'maintenanceMode',m.maintenance_mode,'alertRuleId',m.alert_rule_id,'status',m.status,'statusReason',m.status_reason,'consecutiveFailures',m.consecutive_failures,
    'consecutiveSuccesses',m.consecutive_successes,'failureStreakStartedAt',m.failure_streak_started_at,'lastLatencyMs',m.last_latency_ms,'stateVersion',m.state_version,
    'sslFingerprint',m.ssl_fingerprint,'sslStatus',m.ssl_status,
    'endpoint',jsonb_build_object('id',e.id,'name',e.name,'url',e.url,'environment',e.environment,'endpointType',e.endpoint_type,'responsibleUserId',e.responsible_user_id,'active',e.active),
    'project',jsonb_build_object('id',p.id,'name',p.name,'projectNumber',p.project_number,'priority',p.priority,'projectLeadId',p.project_lead_id,'developmentManagerId',p.development_manager_id,'clientId',m.client_id,'clientName',coalesce(c.trade_name,c.legal_name)))
  from public.monitors m
  join public.project_endpoints e on e.id=m.endpoint_id
  left join public.projects p on p.id=m.project_id
  left join public.clients c on c.id=m.client_id
  where m.id=p_monitor
$$;

-- Los roles con alcance de flota pueden consultar monitores sin proyecto. Los demás continúan
-- estrictamente limitados a proyectos donde poseen acceso explícito.
create or replace function private.can_view_monitoring_project(target_project_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select private.monitoring_scope_all()
    or (target_project_id is not null
      and private.zyteron_role() in('PROGRAMADOR','DESARROLLO','TECH_LEAD','SOPORTE_TECNICO')
      and private.can_access_project(target_project_id))
$$;

commit;

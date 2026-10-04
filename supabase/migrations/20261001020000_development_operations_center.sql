begin;

create extension if not exists pgcrypto;

alter table public.deployments drop constraint if exists deployments_status_check;
alter table public.deployments add constraint deployments_status_check check(status in('PLANNED','READY','PENDING_APPROVAL','QUEUED','BUILDING','IN_PROGRESS','DEPLOYING','VERIFYING','SUCCESS','BUILD_FAILED','DEPLOY_FAILED','HEALTH_CHECK_FAILED','FAILED','ROLLED_BACK','CANCELLED'));

create table if not exists public.developer_skills(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,skill text not null,level text not null default 'INTERMEDIATE' check(level in('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT')),verified_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,skill)
);
create table if not exists public.project_technologies(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,category text not null default 'OTHER' check(category in('FRONTEND','BACKEND','DATABASE','HOSTING','INTEGRATION','LANGUAGE','FRAMEWORK','OTHER')),name text not null,version text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,category,name)
);
create table if not exists public.project_repositories(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,provider text not null,repository_owner text not null,repository_name text not null,repository_url text not null,default_branch text not null,integration_status text not null default 'NOT_CONFIGURED' check(integration_status in('NOT_CONFIGURED','CONNECTED','ERROR','DISCONNECTED')),visibility text not null default 'PRIVATE' check(visibility in('PRIVATE','INTERNAL','PUBLIC')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,repository_owner,repository_name)
);
create table if not exists public.pull_requests(
 id uuid primary key default gen_random_uuid(),repository_id uuid not null references public.project_repositories(id) on delete restrict,project_id uuid not null references public.projects(id) on delete restrict,external_id text not null,number integer not null,title text not null,author text,reviewers text[] not null default '{}',source_branch text not null,target_branch text not null,checks_status text not null default 'UNKNOWN' check(checks_status in('PASS','FAIL','PENDING','UNKNOWN')),status text not null default 'OPEN' check(status in('OPEN','REVIEW_REQUIRED','CHANGES_REQUESTED','APPROVED','MERGED','CLOSED')),provider_url text,opened_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(repository_id,external_id)
);
create table if not exists public.pull_request_reviews(
 id uuid primary key default gen_random_uuid(),pull_request_id uuid not null references public.pull_requests(id) on delete restrict,external_id text not null,reviewer text not null,status text not null check(status in('PENDING','APPROVED','CHANGES_REQUESTED','COMMENTED','DISMISSED')),submitted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(pull_request_id,external_id)
);
create table if not exists public.project_environments(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,name text not null,type text not null check(type in('LOCAL','DEVELOPMENT','STAGING','PRODUCTION')),url text,status text not null default 'UNKNOWN' check(status in('UNKNOWN','HEALTHY','DEGRADED','DOWN','MAINTENANCE')),deployment_provider text,external_reference text,last_deployment_id uuid references public.deployments(id) on delete set null,responsible_user_id uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,name)
);
create table if not exists public.environment_variable_metadata(
 id uuid primary key default gen_random_uuid(),environment_id uuid not null references public.project_environments(id) on delete cascade,variable_name text not null,configured boolean not null default false,last_updated_at timestamptz,created_at timestamptz not null default now(),unique(environment_id,variable_name)
);
create table if not exists public.project_development_settings(
 project_id uuid primary key references public.projects(id) on delete restrict,require_qa_for_production boolean not null default true,require_merged_pr_for_production boolean not null default true,require_release_approval boolean not null default false,require_security_review boolean not null default false,stale_pull_request_hours integer not null default 72 check(stale_pull_request_hours>0),updated_by uuid,updated_at timestamptz not null default now()
);
create table if not exists public.build_runs(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,repository_id uuid references public.project_repositories(id) on delete restrict,provider text not null,external_id text not null,status text not null check(status in('QUEUED','BUILDING','PASS','FAIL','CANCELLED','UNKNOWN')),commit_sha text,branch text,logs_reference text,started_at timestamptz,completed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,external_id)
);
create table if not exists public.qa_runs(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,release_id uuid,environment_id uuid references public.project_environments(id) on delete restrict,name text not null,status text not null default 'PLANNED' check(status in('PLANNED','IN_PROGRESS','PASSED','PASSED_WITH_OBSERVATIONS','FAILED','BLOCKED','CANCELLED')),started_by uuid,assigned_to uuid,started_at timestamptz,completed_at timestamptz,result text,notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.qa_test_cases(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,suite text not null,title text not null,description text,preconditions text,expected_result text not null,priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','CRITICAL')),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.qa_test_results(
 id uuid primary key default gen_random_uuid(),qa_run_id uuid not null references public.qa_runs(id) on delete restrict,test_case_id uuid not null references public.qa_test_cases(id) on delete restrict,status text not null check(status in('PASS','FAIL','BLOCKED','SKIPPED')),actual_result text,evidence_document_id uuid,executed_by uuid,executed_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(qa_run_id,test_case_id)
);
create table if not exists public.bugs(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,task_id uuid references public.tasks(id) on delete restrict,title text not null,description text not null,severity text not null default 'MEDIUM' check(severity in('LOW','MEDIUM','HIGH','CRITICAL','BLOCKER')),priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','URGENT','CRITICAL')),environment text,status text not null default 'NEW' check(status in('NEW','TRIAGED','ASSIGNED','IN_PROGRESS','READY_FOR_QA','REOPENED','RESOLVED','CLOSED','WONT_FIX','DUPLICATE')),reported_by uuid,assigned_to uuid,steps_to_reproduce text,expected_behavior text,actual_behavior text,evidence_document_id uuid,client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_SUMMARY','CLIENT_VISIBLE')),detected_at timestamptz not null default now(),resolved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.bug_history(
 id uuid primary key default gen_random_uuid(),bug_id uuid not null references public.bugs(id) on delete restrict,field text not null,from_value text,to_value text,reason text,changed_by uuid,changed_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.releases(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,version text not null,name text not null,status text not null default 'DRAFT' check(status in('DRAFT','PLANNED','READY','PENDING_APPROVAL','DEPLOYING','RELEASED','FAILED','ROLLED_BACK','CANCELLED')),target_environment text not null,planned_at timestamptz,released_at timestamptz,created_by uuid,approved_by uuid,release_notes text,commit_sha text,deployment_id uuid references public.deployments(id) on delete restrict,client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_SUMMARY','CLIENT_VISIBLE')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,version)
);
alter table public.qa_runs drop constraint if exists qa_runs_release_id_fkey;
alter table public.qa_runs add constraint qa_runs_release_id_fkey foreign key(release_id) references public.releases(id) on delete restrict;
create table if not exists public.technical_debt_items(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,title text not null,description text not null,impact text,severity text not null default 'MEDIUM' check(severity in('LOW','MEDIUM','HIGH','CRITICAL')),estimated_effort numeric(10,2) check(estimated_effort is null or estimated_effort>=0),status text not null default 'OPEN' check(status in('OPEN','PLANNED','IN_PROGRESS','RESOLVED','ACCEPTED')),owner_id uuid,target_date date,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.project_external_services(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,provider text not null,service_name text not null,external_id text,environment text,status text not null default 'UNKNOWN',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,provider,service_name,environment)
);
create table if not exists public.integration_connections(
 id uuid primary key default gen_random_uuid(),provider text not null,display_name text not null,external_reference text,status text not null default 'NOT_CONFIGURED' check(status in('NOT_CONFIGURED','CONNECTED','ERROR','DISCONNECTED')),last_sync_at timestamptz,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,display_name)
);
create table if not exists public.external_integration_events(
 id uuid primary key default gen_random_uuid(),provider text not null,event_type text not null,external_id text not null,received_at timestamptz not null default now(),processed_at timestamptz,status text not null default 'RECEIVED' check(status in('RECEIVED','PROCESSING','PROCESSED','FAILED','IGNORED')),error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,external_id)
);
create table if not exists public.development_events(
 id uuid primary key default gen_random_uuid(),project_id uuid references public.projects(id) on delete restrict,aggregate_type text not null,aggregate_id uuid not null,event_type text not null,actor_id uuid,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now()
);
create table if not exists public.development_notifications(
 id uuid primary key default gen_random_uuid(),event_key text not null unique,user_id uuid,audience_role text,type text not null,title text not null,body text,entity_type text not null,entity_id uuid not null,read_at timestamptz,created_at timestamptz not null default now()
);

create index if not exists project_repositories_project_idx on public.project_repositories(project_id,integration_status);
create index if not exists pull_requests_review_queue_idx on public.pull_requests(status,checks_status,updated_at);
create index if not exists environments_status_idx on public.project_environments(status,type);
create index if not exists qa_runs_project_status_idx on public.qa_runs(project_id,status,created_at desc);
create index if not exists bugs_project_status_idx on public.bugs(project_id,status,severity,updated_at desc);
create index if not exists releases_project_status_idx on public.releases(project_id,status,planned_at);
create index if not exists debt_project_status_idx on public.technical_debt_items(project_id,status,severity);
create index if not exists development_events_project_idx on public.development_events(project_id,occurred_at desc);

create or replace function private.can_manage_development() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO')$$;
create or replace function private.can_read_development() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','TECH_LEAD','PROGRAMADOR','QA','SOPORTE_TECNICO','DESARROLLO')$$;

do $$ declare table_name text;begin
 foreach table_name in array array['developer_skills','project_technologies','project_repositories','pull_requests','pull_request_reviews','project_environments','environment_variable_metadata','project_development_settings','build_runs','qa_runs','qa_test_cases','qa_test_results','bugs','bug_history','releases','technical_debt_items','project_external_services','integration_connections','external_integration_events','development_events','development_notifications'] loop
  execute format('alter table public.%I enable row level security',table_name);
 end loop;
end$$;

do $$ declare table_name text;begin
 foreach table_name in array array['project_technologies','project_repositories','pull_requests','project_environments','build_runs','qa_runs','qa_test_cases','bugs','releases','technical_debt_items','project_external_services'] loop
  execute format('drop policy if exists development_project_scope on public.%I',table_name);
  execute format('create policy development_project_scope on public.%I for all to authenticated using(private.can_access_project(project_id)) with check(private.can_access_project(project_id) and (private.can_manage_development() or private.zyteron_role() in(''TECH_LEAD'',''PROGRAMADOR'',''QA'')))',table_name);
 end loop;
 drop policy if exists development_project_settings_scope on public.project_development_settings;create policy development_project_settings_scope on public.project_development_settings for all to authenticated using(private.can_access_project(project_id)) with check(private.can_manage_development());
 drop policy if exists development_skills_scope on public.developer_skills;create policy development_skills_scope on public.developer_skills for select to authenticated using(private.can_read_development());create policy development_skills_manage on public.developer_skills for all to authenticated using(user_id=auth.uid() or private.can_manage_development()) with check(user_id=auth.uid() or private.can_manage_development());
 drop policy if exists development_pr_review_scope on public.pull_request_reviews;create policy development_pr_review_scope on public.pull_request_reviews for all to authenticated using(exists(select 1 from public.pull_requests p where p.id=pull_request_id and private.can_access_project(p.project_id))) with check(exists(select 1 from public.pull_requests p where p.id=pull_request_id and private.can_access_project(p.project_id)));
 drop policy if exists development_env_metadata_scope on public.environment_variable_metadata;create policy development_env_metadata_scope on public.environment_variable_metadata for select to authenticated using(exists(select 1 from public.project_environments e where e.id=environment_id and private.can_access_project(e.project_id)));
 drop policy if exists development_qa_result_scope on public.qa_test_results;create policy development_qa_result_scope on public.qa_test_results for all to authenticated using(exists(select 1 from public.qa_runs q where q.id=qa_run_id and private.can_access_project(q.project_id))) with check(exists(select 1 from public.qa_runs q where q.id=qa_run_id and private.can_access_project(q.project_id)));
 drop policy if exists development_bug_history_scope on public.bug_history;create policy development_bug_history_scope on public.bug_history for select to authenticated using(exists(select 1 from public.bugs b where b.id=bug_id and private.can_access_project(b.project_id)));
 drop policy if exists development_integrations_manage on public.integration_connections;create policy development_integrations_manage on public.integration_connections for all to authenticated using(private.can_manage_development()) with check(private.can_manage_development());
 drop policy if exists development_external_events_read on public.external_integration_events;create policy development_external_events_read on public.external_integration_events for select to authenticated using(private.can_manage_development());
 drop policy if exists development_events_scope on public.development_events;create policy development_events_scope on public.development_events for select to authenticated using((project_id is not null and private.can_access_project(project_id)) or private.can_manage_development());
 drop policy if exists development_notifications_own on public.development_notifications;create policy development_notifications_own on public.development_notifications for select to authenticated using(user_id=auth.uid() or audience_role=private.zyteron_role() or private.can_manage_development());
end$$;

insert into public.app_permissions(code,description) values
('development.dashboard.view','Ver Dev Command Center'),('development.assignment.manage','Gestionar asignación técnica'),('development.team.view','Ver equipo técnico'),('development.workload.view','Ver capacidad técnica'),
('repository.view','Ver repositorios'),('repository.connect','Conectar repositorios'),('repository.manage','Gestionar repositorios'),('pullrequest.view','Ver pull requests'),('pullrequest.review','Revisar pull requests'),
('qa.view','Ver QA'),('qa.create','Crear QA'),('qa.execute','Ejecutar QA'),('qa.approve','Aprobar QA'),('bug.view','Ver bugs'),('bug.create','Crear bugs'),('bug.assign','Asignar bugs'),('bug.edit','Editar bugs'),('bug.resolve','Resolver bugs'),
('release.view','Ver releases'),('release.create','Crear releases'),('release.approve','Aprobar releases'),('release.deploy','Desplegar releases'),('environment.view','Ver ambientes'),('environment.manage','Gestionar ambientes'),
('deployment.trigger','Ejecutar deployment'),('deployment.rollback','Registrar rollback'),('technical_debt.view','Ver deuda técnica'),('technical_debt.manage','Gestionar deuda técnica'),('development_docs.view','Ver documentación técnica'),('development_docs.manage','Gestionar documentación técnica') on conflict(code) do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('JEFE_DESARROLLO'))r(role) cross join public.app_permissions p where p.code like any(array['development.%','repository.%','pullrequest.%','qa.%','bug.%','release.%','environment.%','deployment.%','technical_debt.%','development_docs.%']) on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('TECH_LEAD'),('PROGRAMADOR'),('QA'),('SOPORTE_TECNICO'),('DESARROLLO'))r(role) cross join public.app_permissions p where p.code in('development.dashboard.view','development.team.view','development.workload.view','repository.view','pullrequest.view','qa.view','bug.view','bug.create','release.view','environment.view','deployment.view','technical_debt.view','development_docs.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'TECH_LEAD',code from public.app_permissions where code in('development.assignment.manage','repository.connect','repository.manage','pullrequest.review','qa.create','qa.execute','bug.assign','bug.edit','bug.resolve','release.create','release.deploy','environment.manage','deployment.trigger','technical_debt.manage','development_docs.manage') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'QA',code from public.app_permissions where code in('qa.create','qa.execute','qa.approve','bug.edit') on conflict do nothing;

do $$ declare table_name text;begin
 foreach table_name in array array['project_repositories','pull_requests','project_environments','build_runs','qa_runs','qa_test_cases','bugs','releases','technical_debt_items','development_events'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then execute format('alter publication supabase_realtime add table public.%I',table_name);end if;
 end loop;
end$$;
do $$ declare table_name text;begin
 foreach table_name in array array['developer_skills','project_technologies','project_repositories','pull_requests','pull_request_reviews','project_environments','project_development_settings','build_runs','qa_runs','qa_test_cases','qa_test_results','bugs','bug_history','releases','technical_debt_items','project_external_services','integration_connections','external_integration_events'] loop
  execute format('drop trigger if exists %I on public.%I',table_name||'_touch_updated_at',table_name);
  execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',table_name||'_touch_updated_at',table_name);
 end loop;
end$$;

revoke all on function private.can_manage_development() from public,anon;
revoke all on function private.can_read_development() from public,anon;
grant execute on function private.can_manage_development() to authenticated,service_role;
grant execute on function private.can_read_development() to authenticated,service_role;

commit;

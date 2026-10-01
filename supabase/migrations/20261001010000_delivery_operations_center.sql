begin;

create extension if not exists pgcrypto;
create sequence if not exists public.operations_work_order_number_seq;
create sequence if not exists public.operations_project_number_seq;

create or replace function public.next_work_order_number() returns text language sql volatile set search_path=public as $$
  select 'OT-' || extract(year from now())::integer || '-' || lpad(nextval('public.operations_work_order_number_seq')::text,6,'0')
$$;
create or replace function public.next_project_number() returns text language sql volatile set search_path=public as $$
  select 'PRJ-' || extract(year from now())::integer || '-' || lpad(nextval('public.operations_project_number_seq')::text,6,'0')
$$;

alter table public.work_orders drop constraint if exists work_orders_status_check;
alter table public.work_orders drop constraint if exists work_orders_priority_check;
alter table public.work_orders alter column quote_id drop not null;
alter table public.work_orders alter column quote_version drop not null;
alter table public.work_orders alter column work_order_number set default public.next_work_order_number();
update public.work_orders set status=case status when 'PENDING_HANDOFF' then 'READY_FOR_HANDOFF' when 'READY' then 'PENDING_PLANNING' else status end;
alter table public.work_orders add column if not exists quote_version_id uuid references public.quote_versions(id) on delete restrict;
alter table public.work_orders add column if not exists sale_id uuid references public.sales(id) on delete restrict;
alter table public.work_orders add column if not exists contract_id uuid references public.client_contracts(id) on delete restrict;
alter table public.work_orders add column if not exists handoff_id uuid references public.sales_handoffs(id) on delete restrict;
alter table public.work_orders add column if not exists title text;
alter table public.work_orders add column if not exists description text;
alter table public.work_orders add column if not exists commercial_snapshot jsonb not null default '{}'::jsonb;
alter table public.work_orders add column if not exists development_manager_id uuid;
alter table public.work_orders add column if not exists assigned_to uuid;
alter table public.work_orders add column if not exists planned_start_date date;
alter table public.work_orders add column if not exists target_date date;
alter table public.work_orders add column if not exists actual_start_date timestamptz;
alter table public.work_orders add column if not exists completed_at timestamptz;
alter table public.work_orders add column if not exists estimated_hours numeric(10,2);
alter table public.work_orders add column if not exists budget_reference numeric(16,2);
alter table public.work_orders add column if not exists currency char(3) not null default 'CLP';
update public.work_orders set title=coalesce(title,'Orden de trabajo '||work_order_number),development_manager_id=coalesce(development_manager_id,development_owner_id),target_date=coalesce(target_date,deadline),commercial_snapshot=coalesce(commercial_snapshot,'{}'::jsonb);
alter table public.work_orders alter column title set not null;
alter table public.work_orders add constraint work_orders_status_check check(status in('DRAFT','READY_FOR_HANDOFF','PENDING_PLANNING','PLANNING','PENDING_ASSIGNMENT','ASSIGNED','IN_PROGRESS','IN_REVIEW','WAITING_CLIENT','COMPLETED','CLOSED','CANCELLED'));
alter table public.work_orders add constraint work_orders_priority_check check(priority in('LOW','NORMAL','HIGH','URGENT','CRITICAL'));
alter table public.work_orders add constraint work_orders_estimated_hours_check check(estimated_hours is null or estimated_hours>=0);

create table if not exists public.work_order_status_history(id uuid primary key default gen_random_uuid(),work_order_id uuid not null references public.work_orders(id) on delete restrict,from_status text,to_status text not null,reason text,changed_by uuid,changed_at timestamptz not null default now());
create table if not exists public.work_order_assignments(id uuid primary key default gen_random_uuid(),work_order_id uuid not null references public.work_orders(id) on delete restrict,user_id uuid not null,assignment_role text not null,assigned_by uuid,assigned_at timestamptz not null default now(),unassigned_at timestamptz);
create table if not exists public.work_order_items(id uuid primary key default gen_random_uuid(),work_order_id uuid not null references public.work_orders(id) on delete restrict,description text not null,quantity numeric(12,3) not null default 1 check(quantity>0),estimated_hours numeric(10,2) check(estimated_hours is null or estimated_hours>=0),sort_order integer not null default 0);

create table if not exists public.projects(
 id uuid primary key default gen_random_uuid(),project_number text not null unique default public.next_project_number(),client_id uuid references public.clients(id) on delete restrict,work_order_id uuid not null unique references public.work_orders(id) on delete restrict,quote_id uuid references public.quotes(id) on delete restrict,contract_id uuid references public.client_contracts(id) on delete restrict,name text not null,description text,scope text not null,status text not null default 'PLANNING' check(status in('PLANNING','READY','IN_PROGRESS','BLOCKED','INTERNAL_REVIEW','QA','WAITING_CLIENT','READY_FOR_PRODUCTION','PRODUCTION','MAINTENANCE','COMPLETED','ON_HOLD','CANCELLED','ARCHIVED')),priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','URGENT','CRITICAL')),health text not null default 'ON_TRACK' check(health in('ON_TRACK','ATTENTION','AT_RISK','CRITICAL','COMPLETED')),health_reason text not null default 'Sin señales de riesgo operacionales.',progress numeric(5,2) not null default 0 check(progress between 0 and 100),development_manager_id uuid,project_lead_id uuid,planned_start_date date,actual_start_date timestamptz,target_date date,completed_at timestamptz,estimated_hours numeric(10,2),budgeted_hours numeric(10,2),staging_url text,production_url text,repository_url text,client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz
);
create table if not exists public.project_members(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,user_id uuid not null,user_name text,project_role text not null default 'DEVELOPER' check(project_role in('PROJECT_MANAGER','TECH_LEAD','DEVELOPER','QA','DESIGNER','SUPPORT','OBSERVER')),allocation_percentage numeric(5,2) check(allocation_percentage is null or allocation_percentage between 0 and 100),assigned_by uuid,assigned_at timestamptz not null default now(),removed_at timestamptz,active boolean not null default true,unique(project_id,user_id));
create table if not exists public.project_milestones(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,name text not null,description text,status text not null default 'PLANNED' check(status in('PLANNED','IN_PROGRESS','AT_RISK','BLOCKED','COMPLETED','CANCELLED')),weight numeric(5,2) not null check(weight>=0 and weight<=100),planned_start_date date,due_date date,completed_at timestamptz,responsible_user_id uuid,client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.tasks(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,milestone_id uuid references public.project_milestones(id) on delete restrict,parent_task_id uuid references public.tasks(id) on delete restrict,title text not null,description text,status text not null default 'BACKLOG' check(status in('BACKLOG','TODO','IN_PROGRESS','BLOCKED','REVIEW','QA','DONE','CANCELLED')),priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','URGENT','CRITICAL')),assigned_to uuid,created_by uuid,estimated_minutes integer check(estimated_minutes is null or estimated_minutes>=0),actual_minutes integer not null default 0 check(actual_minutes>=0),start_date date,due_date date,completed_at timestamptz,blocked_reason text,blocked_type text,client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.task_dependencies(id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks(id) on delete restrict,depends_on_task_id uuid not null references public.tasks(id) on delete restrict,dependency_type text not null default 'REQUIRES' check(dependency_type in('REQUIRES','BLOCKS','RELATED')),created_at timestamptz not null default now(),check(task_id<>depends_on_task_id),unique(task_id,depends_on_task_id));
create table if not exists public.work_logs(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,task_id uuid references public.tasks(id) on delete restrict,user_id uuid not null,work_date date not null,started_at timestamptz,duration_minutes integer not null check(duration_minutes>0),description text not null,public_description text,work_type text not null default 'DEVELOPMENT' check(work_type in('DEVELOPMENT','DESIGN','MEETING','QA','SUPPORT','RESEARCH','DEPLOYMENT','DOCUMENTATION','MANAGEMENT','OTHER')),billable boolean not null default false,client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),commit_reference text,deployment_id uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.project_deliverables(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,milestone_id uuid references public.project_milestones(id) on delete restrict,name text not null,description text,type text not null default 'OTHER' check(type in('DOCUMENT','DESIGN','CODE','BUILD','REPORT','ACCESS','OTHER')),status text not null default 'PLANNED' check(status in('PLANNED','IN_PROGRESS','INTERNAL_REVIEW','READY_FOR_REVIEW','CLIENT_REVIEW','CHANGES_REQUESTED','APPROVED','DELIVERED','CANCELLED')),due_date date,owner_id uuid,document_id uuid,external_url text,version integer not null default 1 check(version>0),client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),submitted_at timestamptz,approved_at timestamptz,approved_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.deployments(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,environment text not null check(environment in('DEVELOPMENT','STAGING','PRODUCTION')),version text not null,commit_sha text,status text not null default 'PLANNED' check(status in('PLANNED','QUEUED','IN_PROGRESS','SUCCESS','FAILED','ROLLED_BACK','CANCELLED')),record_type text not null default 'MANUAL_RECORD' check(record_type in('MANUAL_RECORD','INTEGRATION')),requested_by uuid,deployed_by uuid,started_at timestamptz,completed_at timestamptz,notes text,rollback_of_id uuid references public.deployments(id) on delete restrict,client_visibility text not null default 'INTERNAL' check(client_visibility in('INTERNAL','CLIENT_VISIBLE')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.work_logs drop constraint if exists work_logs_deployment_id_fkey;
alter table public.work_logs add constraint work_logs_deployment_id_fkey foreign key(deployment_id) references public.deployments(id) on delete restrict;
create table if not exists public.project_endpoints(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,name text not null,url text not null,environment text not null default 'PRODUCTION',endpoint_type text not null default 'WEB',monitoring_enabled boolean not null default false,responsible_user_id uuid,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.project_risks(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,title text not null,description text,probability integer not null check(probability between 1 and 5),impact integer not null check(impact between 1 and 5),severity integer generated always as(probability*impact) stored,owner_id uuid,mitigation text,status text not null default 'OPEN' check(status in('OPEN','MITIGATING','ACCEPTED','RESOLVED')),created_at timestamptz not null default now(),resolved_at timestamptz);
create table if not exists public.change_requests(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,requested_by uuid,source text not null default 'INTERNAL' check(source in('INTERNAL','CLIENT','COMMERCIAL')),description text not null,reason text,scope_impact text,time_impact text,cost_impact numeric(16,2),currency char(3) not null default 'CLP',status text not null default 'REQUESTED' check(status in('REQUESTED','ANALYSIS','PENDING_APPROVAL','APPROVED','REJECTED','IMPLEMENTING','COMPLETED')),approved_by uuid,approved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.project_status_history(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,from_status text,to_status text not null,reason text,changed_by uuid,changed_at timestamptz not null default now());
create table if not exists public.operations_events(id uuid primary key default gen_random_uuid(),project_id uuid references public.projects(id) on delete restrict,work_order_id uuid references public.work_orders(id) on delete restrict,aggregate_type text not null,aggregate_id uuid not null,event_type text not null,actor_id uuid,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now());
create table if not exists public.operations_notifications(id uuid primary key default gen_random_uuid(),event_key text not null unique,user_id uuid,audience_role text,type text not null,title text not null,body text,entity_type text not null,entity_id uuid not null,read_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.operations_idempotency_keys(idempotency_key text not null,operation text not null,resource_id uuid not null,created_at timestamptz not null default now(),primary key(idempotency_key,operation));

create index if not exists work_orders_operations_idx on public.work_orders(status,priority,target_date);
create index if not exists projects_status_health_idx on public.projects(status,health,target_date) where archived_at is null;
create index if not exists project_members_user_idx on public.project_members(user_id,active);
create index if not exists milestones_project_due_idx on public.project_milestones(project_id,due_date);
create index if not exists tasks_project_status_idx on public.tasks(project_id,status,due_date);
create index if not exists tasks_assignee_idx on public.tasks(assigned_to,status);
create index if not exists work_logs_project_date_idx on public.work_logs(project_id,work_date desc);
create index if not exists deliverables_project_status_idx on public.project_deliverables(project_id,status);
create index if not exists deployments_project_created_idx on public.deployments(project_id,created_at desc);
create index if not exists operations_events_aggregate_idx on public.operations_events(aggregate_type,aggregate_id,occurred_at desc);

create or replace function public.operations_milestone_weight_guard() returns trigger language plpgsql set search_path=public as $$
declare current_weight numeric;begin select coalesce(sum(weight),0) into current_weight from public.project_milestones where project_id=new.project_id and id<>new.id and status<>'CANCELLED';if new.status<>'CANCELLED' and current_weight+new.weight>100 then raise exception 'La suma de pesos de los hitos no puede superar 100%%';end if;return new;end$$;
drop trigger if exists milestone_weight_guard on public.project_milestones;create trigger milestone_weight_guard before insert or update on public.project_milestones for each row execute function public.operations_milestone_weight_guard();
create or replace function public.operations_task_project_guard() returns trigger language plpgsql set search_path=public as $$
begin if new.parent_task_id is not null and not exists(select 1 from public.tasks where id=new.parent_task_id and project_id=new.project_id) then raise exception 'La tarea padre debe pertenecer al mismo proyecto';end if;if new.milestone_id is not null and not exists(select 1 from public.project_milestones where id=new.milestone_id and project_id=new.project_id) then raise exception 'El hito debe pertenecer al mismo proyecto';end if;return new;end$$;
drop trigger if exists task_project_guard on public.tasks;create trigger task_project_guard before insert or update on public.tasks for each row execute function public.operations_task_project_guard();
create or replace function public.operations_worklog_project_guard() returns trigger language plpgsql set search_path=public as $$
begin if new.task_id is not null and not exists(select 1 from public.tasks where id=new.task_id and project_id=new.project_id) then raise exception 'La tarea del worklog debe pertenecer al mismo proyecto';end if;if new.deployment_id is not null and not exists(select 1 from public.deployments where id=new.deployment_id and project_id=new.project_id) then raise exception 'El deployment del worklog debe pertenecer al mismo proyecto';end if;return new;end$$;
drop trigger if exists worklog_project_guard on public.work_logs;create trigger worklog_project_guard before insert or update on public.work_logs for each row execute function public.operations_worklog_project_guard();

create or replace function public.operations_recalculate_project(target_project_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare milestone_total numeric; milestone_done numeric; task_total integer; task_done integer; next_progress numeric; blocked_count integer; overdue_count integer; next_health text; next_reason text;
begin
 select coalesce(sum(weight),0),coalesce(sum(weight) filter(where status='COMPLETED'),0) into milestone_total,milestone_done from public.project_milestones where project_id=target_project_id and status<>'CANCELLED';
 select count(*),count(*) filter(where status='DONE'),count(*) filter(where status='BLOCKED'),count(*) filter(where due_date<current_date and status not in('DONE','CANCELLED')) into task_total,task_done,blocked_count,overdue_count from public.tasks where project_id=target_project_id and status<>'CANCELLED';
 next_progress:=case when milestone_total>0 and task_total>0 then round(((milestone_done/milestone_total)*70+(task_done::numeric/task_total)*30),2) when milestone_total>0 then round((milestone_done/milestone_total)*100,2) when task_total>0 then round((task_done::numeric/task_total)*100,2) else 0 end;
 if blocked_count>=3 or overdue_count>=5 then next_health:='CRITICAL';next_reason:=blocked_count||' tareas bloqueadas y '||overdue_count||' vencidas.';
 elsif blocked_count>0 or overdue_count>=2 then next_health:='AT_RISK';next_reason:=blocked_count||' tareas bloqueadas y '||overdue_count||' vencidas.';
 elsif overdue_count=1 then next_health:='ATTENTION';next_reason:='Existe una tarea vencida.';
 else next_health:='ON_TRACK';next_reason:='Sin señales de riesgo operacionales.';end if;
 update public.projects set progress=next_progress,health=next_health,health_reason=next_reason,updated_at=now() where id=target_project_id;
end $$;
create or replace function public.operations_project_progress_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin perform public.operations_recalculate_project(coalesce(new.project_id,old.project_id));return coalesce(new,old);end$$;
drop trigger if exists milestone_project_progress on public.project_milestones;create trigger milestone_project_progress after insert or update or delete on public.project_milestones for each row execute function public.operations_project_progress_trigger();
drop trigger if exists task_project_progress on public.tasks;create trigger task_project_progress after insert or update or delete on public.tasks for each row execute function public.operations_project_progress_trigger();

create or replace function public.operations_task_dependency_guard() returns trigger language plpgsql set search_path=public as $$
declare creates_cycle boolean;task_project uuid;dependency_project uuid;
begin
 select project_id into task_project from public.tasks where id=new.task_id;select project_id into dependency_project from public.tasks where id=new.depends_on_task_id;
 if task_project is null or dependency_project is null or task_project<>dependency_project then raise exception 'Las dependencias deben pertenecer al mismo proyecto';end if;
 with recursive chain(id) as(select new.depends_on_task_id union select d.depends_on_task_id from public.task_dependencies d join chain c on d.task_id=c.id) select exists(select 1 from chain where id=new.task_id) into creates_cycle;
 if creates_cycle then raise exception 'La dependencia crea un ciclo';end if;return new;
end$$;
drop trigger if exists task_dependency_guard on public.task_dependencies;create trigger task_dependency_guard before insert or update on public.task_dependencies for each row execute function public.operations_task_dependency_guard();

create or replace function public.operations_refresh_task_minutes() returns trigger language plpgsql security definer set search_path=public as $$begin update public.tasks set actual_minutes=(select coalesce(sum(duration_minutes),0) from public.work_logs where task_id=coalesce(new.task_id,old.task_id)),updated_at=now() where id=coalesce(new.task_id,old.task_id);return coalesce(new,old);end$$;
drop trigger if exists worklog_task_minutes on public.work_logs;create trigger worklog_task_minutes after insert or update or delete on public.work_logs for each row execute function public.operations_refresh_task_minutes();

create or replace function public.operations_change_work_order_status(target_work_order_id uuid,target_status text,actor_user_id uuid,change_reason text) returns void language plpgsql security definer set search_path=public as $$
declare prior text;
begin select status into prior from public.work_orders where id=target_work_order_id for update;if prior is null then raise exception 'Orden de trabajo no encontrada';end if;
 update public.work_orders set status=target_status,actual_start_date=case when target_status='IN_PROGRESS' then coalesce(actual_start_date,now()) else actual_start_date end,completed_at=case when target_status in('COMPLETED','CLOSED') then coalesce(completed_at,now()) else completed_at end,updated_at=now() where id=target_work_order_id;
 insert into public.work_order_status_history(work_order_id,from_status,to_status,reason,changed_by) values(target_work_order_id,prior,target_status,change_reason,actor_user_id);
 insert into public.operations_events(work_order_id,aggregate_type,aggregate_id,event_type,actor_id,payload) values(target_work_order_id,'WORK_ORDER',target_work_order_id,'WORK_ORDER_STATUS_CHANGED',actor_user_id,jsonb_build_object('from',prior,'to',target_status,'reason',change_reason));
 insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values('WORK_ORDER',target_work_order_id,'WORK_ORDER_STATUS_CHANGED',jsonb_build_object('from',prior,'to',target_status));
end$$;
create or replace function public.operations_change_project_status(target_project_id uuid,target_status text,actor_user_id uuid,change_reason text) returns void language plpgsql security definer set search_path=public as $$
declare prior text;
begin select status into prior from public.projects where id=target_project_id for update;if prior is null then raise exception 'Proyecto no encontrado';end if;
 update public.projects set status=target_status,actual_start_date=case when target_status='IN_PROGRESS' then coalesce(actual_start_date,now()) else actual_start_date end,completed_at=case when target_status='COMPLETED' then coalesce(completed_at,now()) else completed_at end,archived_at=case when target_status='ARCHIVED' then coalesce(archived_at,now()) else archived_at end,updated_at=now() where id=target_project_id;
 insert into public.project_status_history(project_id,from_status,to_status,reason,changed_by) values(target_project_id,prior,target_status,change_reason,actor_user_id);
 insert into public.operations_events(project_id,aggregate_type,aggregate_id,event_type,actor_id,payload) values(target_project_id,'PROJECT',target_project_id,'PROJECT_STATUS_CHANGED',actor_user_id,jsonb_build_object('from',prior,'to',target_status,'reason',change_reason));
 insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values('PROJECT',target_project_id,'PROJECT_STATUS_CHANGED',jsonb_build_object('from',prior,'to',target_status));
end$$;
create or replace function public.operations_change_task_status(target_task_id uuid,target_status text,actor_user_id uuid,change_reason text,block_type text) returns void language plpgsql security definer set search_path=public as $$
declare prior text;project uuid;
begin select status,project_id into prior,project from public.tasks where id=target_task_id for update;if prior is null then raise exception 'Tarea no encontrada';end if;
 update public.tasks set status=target_status,blocked_reason=case when target_status='BLOCKED' then change_reason else null end,blocked_type=case when target_status='BLOCKED' then block_type else null end,completed_at=case when target_status='DONE' then coalesce(completed_at,now()) else null end,updated_at=now() where id=target_task_id;
 insert into public.operations_events(project_id,aggregate_type,aggregate_id,event_type,actor_id,payload) values(project,'TASK',target_task_id,'TASK_STATUS_CHANGED',actor_user_id,jsonb_build_object('from',prior,'to',target_status,'reason',change_reason));
end$$;
create or replace function public.operations_complete_milestone(target_milestone_id uuid,actor_user_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare project uuid;begin update public.project_milestones set status='COMPLETED',completed_at=coalesce(completed_at,now()),updated_at=now() where id=target_milestone_id returning project_id into project;if project is null then raise exception 'Hito no encontrado';end if;insert into public.operations_events(project_id,aggregate_type,aggregate_id,event_type,actor_id) values(project,'MILESTONE',target_milestone_id,'MILESTONE_COMPLETED',actor_user_id);end$$;

create or replace function public.operations_create_project_from_work_order(target_work_order_id uuid,project_payload jsonb,actor_user_id uuid,idempotency_key text) returns uuid language plpgsql security definer set search_path=public as $$
declare work public.work_orders%rowtype;project_id uuid;existing uuid;
begin if nullif(trim(idempotency_key),'') is null then raise exception 'Idempotency-Key obligatorio';end if;
 select resource_id into existing from public.operations_idempotency_keys where operations_idempotency_keys.idempotency_key=$4 and operation='WORK_ORDER_TO_PROJECT';if existing is not null then return existing;end if;
 select * into work from public.work_orders where id=target_work_order_id for update;if not found then raise exception 'Orden de trabajo no encontrada';end if;
 select id into existing from public.projects where work_order_id=work.id;if existing is not null then return existing;end if;
 insert into public.projects(client_id,work_order_id,quote_id,contract_id,name,description,scope,priority,development_manager_id,project_lead_id,planned_start_date,target_date,estimated_hours,budgeted_hours,client_visibility,created_by)
 values(work.client_id,work.id,work.quote_id,work.contract_id,coalesce(nullif(project_payload->>'name',''),work.title),coalesce(project_payload->>'description',work.description),coalesce(nullif(project_payload->>'scope',''),work.scope),work.priority,coalesce((project_payload->>'developmentManagerId')::uuid,work.development_manager_id),coalesce((project_payload->>'projectLeadId')::uuid,work.assigned_to),coalesce((project_payload->>'plannedStartDate')::date,work.planned_start_date),coalesce((project_payload->>'targetDate')::date,work.target_date),coalesce((project_payload->>'estimatedHours')::numeric,work.estimated_hours),coalesce((project_payload->>'budgetedHours')::numeric,work.estimated_hours),coalesce(project_payload->>'clientVisibility','INTERNAL'),actor_user_id) returning id into project_id;
 update public.work_orders set status='IN_PROGRESS',actual_start_date=coalesce(actual_start_date,now()),updated_at=now() where id=work.id;
 insert into public.project_members(project_id,user_id,project_role,assigned_by) select project_id,(project_payload->>'projectLeadId')::uuid,'PROJECT_MANAGER',actor_user_id where nullif(project_payload->>'projectLeadId','') is not null on conflict(project_id,user_id) do nothing;
 insert into public.operations_idempotency_keys values($4,'WORK_ORDER_TO_PROJECT',project_id,now()) on conflict do nothing;
 insert into public.operations_events(project_id,work_order_id,aggregate_type,aggregate_id,event_type,actor_id,payload) values(project_id,work.id,'PROJECT',project_id,'PROJECT_CREATED',actor_user_id,jsonb_build_object('workOrderId',work.id));
 insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values('PROJECT',project_id,'PROJECT_CREATED',jsonb_build_object('workOrderId',work.id,'clientId',work.client_id));return project_id;
end$$;

create or replace function public.operations_dashboard_summary() returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object(
  'newWorkOrders',(select count(*) from public.work_orders where status in('DRAFT','READY_FOR_HANDOFF')),
  'pendingPlanning',(select count(*) from public.work_orders where status in('PENDING_PLANNING','PLANNING')),
  'activeProjects',(select count(*) from public.projects where status not in('COMPLETED','CANCELLED','ARCHIVED') and archived_at is null),
  'atRiskProjects',(select count(*) from public.projects where health in('AT_RISK','CRITICAL') and archived_at is null),
  'overdueProjects',(select count(*) from public.projects where target_date<current_date and status not in('COMPLETED','CANCELLED','ARCHIVED')),
  'overdueTasks',(select count(*) from public.tasks where due_date<current_date and status not in('DONE','CANCELLED')),
  'blockedTasks',(select count(*) from public.tasks where status='BLOCKED'),
  'upcomingMilestones',(select count(*) from public.project_milestones where due_date between current_date and current_date+interval '14 days' and status not in('COMPLETED','CANCELLED')),
  'overdueMilestones',(select count(*) from public.project_milestones where due_date<current_date and status not in('COMPLETED','CANCELLED')),
  'pendingDeliverables',(select count(*) from public.project_deliverables where status not in('APPROVED','DELIVERED','CANCELLED')),
  'pendingDeployments',(select count(*) from public.deployments where status in('PLANNED','QUEUED','IN_PROGRESS')),
  'minutesToday',(select coalesce(sum(duration_minutes),0) from public.work_logs where work_date=current_date),
  'unassignedProjects',(select count(*) from public.projects where project_lead_id is null and archived_at is null))
$$;

create or replace function public.convert_quote_to_work_order(target_quote_id uuid,actor_user_id uuid,idempotency_key text,override_reason text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare q public.quotes%rowtype;s public.sales%rowtype;v public.quote_versions%rowtype;work_id uuid;existing uuid;handoff uuid;scope_text text;
begin if nullif(trim(idempotency_key),'') is null then raise exception 'Idempotency-Key obligatorio';end if;
 select resource_id into existing from public.commercial_idempotency_keys where commercial_idempotency_keys.idempotency_key=$3 and operation='QUOTE_TO_OT';if existing is not null then return jsonb_build_object('workOrderId',existing,'created',false);end if;
 select * into q from public.quotes where id=target_quote_id for update;select * into s from public.sales where quote_id=q.id for update;if not found then raise exception 'La cotización debe estar aceptada';end if;if s.work_order_id is not null then return jsonb_build_object('workOrderId',s.work_order_id,'created',false);end if;
 select * into v from public.quote_versions where quote_id=q.id and version_number=q.version order by created_at desc limit 1;select id into handoff from public.sales_handoffs where sale_id=s.id;select string_agg(description,E'\n') into scope_text from public.quote_items where quote_id=q.id;
 insert into public.work_orders(client_id,quote_id,quote_version,quote_version_id,sale_id,contract_id,handoff_id,title,scope,commercial_snapshot,target_date,commercial_owner_id,commercial_notes,created_by,status)
 values(q.client_id,q.id,q.version,v.id,s.id,s.contract_id,handoff,q.company_name||' · '||q.quote_number,coalesce(scope_text,'Alcance comercial por confirmar'),coalesce(v.snapshot,jsonb_build_object('quoteNumber',q.quote_number,'amount',q.total_amount,'currency',q.currency)),q.valid_until,q.owner_id,q.notes,actor_user_id,'READY_FOR_HANDOFF') returning id into work_id;
 update public.sales set work_order_id=work_id where id=s.id;update public.quotes set status='CONVERTED' where id=q.id;update public.sales_handoffs set work_order_id=work_id where id=handoff;
 insert into public.commercial_idempotency_keys(idempotency_key,operation,resource_id) values($3,'QUOTE_TO_OT',work_id) on conflict do nothing;
 insert into public.commercial_events(aggregate_type,aggregate_id,event_type,actor_id,payload) values('WORK_ORDER',work_id,'WORK_ORDER_CREATED',actor_user_id,jsonb_build_object('quoteId',q.id,'overrideReason',override_reason));insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values('WORK_ORDER',work_id,'WORK_ORDER_CREATED',jsonb_build_object('quoteId',q.id,'clientId',q.client_id));return jsonb_build_object('workOrderId',work_id,'created',true);end$$;

do $$ declare table_name text;begin foreach table_name in array array['projects','project_members','project_milestones','tasks','task_dependencies','work_logs','project_deliverables','deployments','project_endpoints','project_risks','change_requests','project_status_history','work_order_status_history','work_order_assignments','work_order_items','operations_events','operations_notifications','operations_idempotency_keys'] loop execute format('alter table public.%I enable row level security',table_name);end loop;end$$;
create or replace function private.can_manage_operations() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','OPERACIONES')$$;
create or replace function private.can_access_project(target_project_id uuid) returns boolean language sql stable security definer set search_path=public as $$select private.can_manage_operations() or exists(select 1 from public.projects p where p.id=target_project_id and (p.project_lead_id=auth.uid() or p.development_manager_id=auth.uid())) or exists(select 1 from public.project_members m where m.project_id=target_project_id and m.user_id=auth.uid() and m.active)$$;
do $$ declare table_name text;begin
 foreach table_name in array array['projects','project_members','project_milestones','tasks','work_logs','project_deliverables','deployments','project_endpoints','project_risks','change_requests','project_status_history','operations_events'] loop
  execute format('drop policy if exists operations_project_scope on public.%I',table_name);
  if table_name='projects' then execute 'create policy operations_project_scope on public.projects for all to authenticated using(private.can_access_project(id) or private.zyteron_role() in(''JEFE_VENTAS'',''COMERCIAL'',''EJECUTIVA_VENTAS'')) with check(private.can_manage_operations() or project_lead_id=auth.uid())';
  elsif table_name='operations_events' then execute 'create policy operations_project_scope on public.operations_events for select to authenticated using((project_id is not null and private.can_access_project(project_id)) or private.can_manage_operations())';
  else execute format('create policy operations_project_scope on public.%I for all to authenticated using(private.can_access_project(project_id)) with check(private.can_access_project(project_id))',table_name);end if;
 end loop;
 drop policy if exists operations_project_scope on public.task_dependencies;create policy operations_project_scope on public.task_dependencies for all to authenticated using(exists(select 1 from public.tasks t where t.id=task_id and private.can_access_project(t.project_id))) with check(exists(select 1 from public.tasks t where t.id=task_id and private.can_access_project(t.project_id)));
 drop policy if exists operations_work_order_scope on public.work_orders;create policy operations_work_order_scope on public.work_orders for select to authenticated using(private.can_manage_operations() or private.can_manage_sales() or commercial_owner_id=auth.uid() or development_manager_id=auth.uid() or assigned_to=auth.uid());
 drop policy if exists operations_work_order_history_scope on public.work_order_status_history;create policy operations_work_order_history_scope on public.work_order_status_history for select to authenticated using(exists(select 1 from public.work_orders w where w.id=work_order_id and (private.can_manage_operations() or private.can_manage_sales() or w.commercial_owner_id=auth.uid() or w.assigned_to=auth.uid())));
 drop policy if exists operations_work_order_assignment_scope on public.work_order_assignments;create policy operations_work_order_assignment_scope on public.work_order_assignments for select to authenticated using(private.can_manage_operations() or user_id=auth.uid());
 drop policy if exists operations_work_order_items_scope on public.work_order_items;create policy operations_work_order_items_scope on public.work_order_items for select to authenticated using(private.can_manage_operations() or exists(select 1 from public.work_orders w where w.id=work_order_id and w.assigned_to=auth.uid()));
 drop policy if exists operations_notifications_own on public.operations_notifications;create policy operations_notifications_own on public.operations_notifications for select to authenticated using(user_id=auth.uid() or audience_role=private.zyteron_role() or private.can_manage_operations());
end$$;

insert into public.app_permissions(code,description) values
('operations.dashboard.view','Ver Delivery Operations Center'),('work_order.view','Ver órdenes de trabajo'),('work_order.create','Crear órdenes de trabajo'),('work_order.plan','Planificar órdenes de trabajo'),('work_order.assign','Asignar órdenes de trabajo'),('work_order.status','Cambiar estado de órdenes de trabajo'),('project.view','Ver proyectos'),('project.create','Crear proyectos'),('project.edit','Editar proyectos'),('project.status','Cambiar estado de proyectos'),('project.members.manage','Gestionar equipo de proyecto'),('milestone.manage','Gestionar hitos'),('task.view','Ver tareas'),('task.manage','Gestionar tareas'),('worklog.view','Ver registro de trabajo'),('worklog.manage','Gestionar registro de trabajo'),('deliverable.view','Ver entregables'),('deliverable.manage','Gestionar entregables'),('deployment.view','Ver despliegues'),('deployment.manage','Gestionar despliegues'),('project.risk.manage','Gestionar riesgos'),('project.change.manage','Gestionar solicitudes de cambio') on conflict(code) do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('JEFE_DESARROLLO'),('OPERACIONES'))r(role) cross join public.app_permissions p where p.code like any(array['operations.%','work_order.%','project.%','milestone.%','task.%','worklog.%','deliverable.%','deployment.%']) on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('PROGRAMADOR'),('DESARROLLO'))r(role) cross join public.app_permissions p where p.code in('operations.dashboard.view','work_order.view','project.view','task.view','task.manage','worklog.view','worklog.manage','deliverable.view','deliverable.manage','deployment.view','deployment.manage','project.risk.manage','project.change.manage') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('JEFE_VENTAS'),('COMERCIAL'),('EJECUTIVA_VENTAS'))r(role) cross join public.app_permissions p where p.code in('operations.dashboard.view','work_order.view','project.view') on conflict do nothing;

do $$ declare table_name text;begin foreach table_name in array array['work_orders','projects','project_milestones','tasks','work_logs','project_deliverables','deployments'] loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then execute format('alter publication supabase_realtime add table public.%I',table_name);end if;end loop;end$$;
do $$ declare table_name text;begin foreach table_name in array array['projects','project_milestones','tasks','work_logs','project_deliverables','deployments','project_endpoints','change_requests'] loop execute format('drop trigger if exists %I on public.%I',table_name||'_touch_updated_at',table_name);execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',table_name||'_touch_updated_at',table_name);end loop;end$$;

revoke all on function public.operations_change_work_order_status(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.operations_change_project_status(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.operations_change_task_status(uuid,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.operations_complete_milestone(uuid,uuid) from public,anon,authenticated;
revoke all on function public.operations_create_project_from_work_order(uuid,jsonb,uuid,text) from public,anon,authenticated;
revoke all on function public.operations_dashboard_summary() from public,anon,authenticated;
revoke all on function public.operations_recalculate_project(uuid) from public,anon,authenticated;
revoke all on function public.next_work_order_number() from public,anon,authenticated;
revoke all on function public.next_project_number() from public,anon,authenticated;
grant execute on function public.operations_change_work_order_status(uuid,text,uuid,text) to service_role;
grant execute on function public.operations_change_project_status(uuid,text,uuid,text) to service_role;
grant execute on function public.operations_change_task_status(uuid,text,uuid,text,text) to service_role;
grant execute on function public.operations_complete_milestone(uuid,uuid) to service_role;
grant execute on function public.operations_create_project_from_work_order(uuid,jsonb,uuid,text) to service_role;
grant execute on function public.operations_dashboard_summary() to service_role;
grant execute on function public.operations_recalculate_project(uuid) to service_role;
grant execute on function public.next_work_order_number() to service_role;
grant execute on function public.next_project_number() to service_role;

commit;

begin;

-- Reconcile every column used by Commercial notification functions, policies
-- and API writes. CREATE TABLE IF NOT EXISTS cannot repair an older table.
alter table public.commercial_notifications add column if not exists owner_id uuid;
alter table public.commercial_notifications add column if not exists audience_role text;
alter table public.commercial_notifications add column if not exists event_key text;
alter table public.commercial_notifications add column if not exists type text;
alter table public.commercial_notifications add column if not exists title text;
alter table public.commercial_notifications add column if not exists body text;
alter table public.commercial_notifications add column if not exists entity_type text;
alter table public.commercial_notifications add column if not exists entity_id uuid;
alter table public.commercial_notifications add column if not exists read_at timestamptz;
alter table public.commercial_notifications add column if not exists created_at timestamptz default now();
do $$begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='commercial_notifications'
      and column_name='user_id'
  )then
    execute 'update public.commercial_notifications set owner_id=coalesce(owner_id,user_id) where owner_id is null';
  end if;
  if exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='commercial_notifications'
      and column_name='recipient_role'
  )then
    execute 'update public.commercial_notifications set audience_role=coalesce(audience_role,recipient_role::text) where audience_role is null';
  elsif exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='commercial_notifications'
      and column_name='role'
  )then
    execute 'update public.commercial_notifications set audience_role=coalesce(audience_role,role::text) where audience_role is null';
  end if;
end$$;
create unique index if not exists commercial_notifications_event_key_uidx
on public.commercial_notifications(event_key);

create or replace function private.can_manage_sales()
returns boolean language sql stable security definer set search_path=public
as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_VENTAS','COMERCIAL')$$;

create or replace function public.process_commercial_due_notifications(reference_time timestamptz default now())
returns integer language plpgsql security definer set search_path=public as $$
declare inserted_count integer;
begin
  insert into public.commercial_notifications(event_key,owner_id,type,title,body,entity_type,entity_id)
  select 'FOLLOW_UP_OVERDUE:'||f.id,f.assigned_to,'FOLLOW_UP_OVERDUE','Seguimiento vencido',f.title,'FOLLOW_UP',f.id
  from public.follow_ups f
  where f.status='PENDING' and f.scheduled_at<reference_time
  on conflict(event_key) do nothing;
  get diagnostics inserted_count=row_count;

  insert into public.commercial_notifications(event_key,owner_id,type,title,body,entity_type,entity_id)
  select 'QUOTE_EXPIRING:'||q.id||':'||d.days,q.owner_id,'QUOTE_EXPIRING','Cotización próxima a vencer',q.quote_number,'QUOTE',q.id
  from public.quotes q cross join(values(7),(3),(1))d(days)
  where q.status in('SENT','NEGOTIATING') and q.valid_until=current_date+d.days
  on conflict(event_key) do nothing;
  return inserted_count;
end$$;

create or replace function public.project_commercial_event_notification()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_user uuid;recipient_role text;
begin
  if new.event_type='LEAD_ASSIGNED' then
    insert into public.commercial_notifications(event_key,owner_id,type,title,body,entity_type,entity_id)
    values('LEAD_ASSIGNED:'||new.aggregate_id,nullif(new.payload->>'assignedTo','')::uuid,'LEAD_ASSIGNED','Nuevo lead asignado','Revisa el Lead Inbox','LEAD',new.aggregate_id)
    on conflict(event_key) do nothing;
  elsif new.event_type='QUOTE_APPROVAL_REQUIRED' then
    insert into public.commercial_notifications(event_key,audience_role,type,title,body,entity_type,entity_id)
    values('QUOTE_APPROVAL_REQUIRED:'||new.aggregate_id,'JEFE_VENTAS','QUOTE_APPROVAL_REQUIRED','Cotización requiere aprobación','El descuento excede la política del rol creador','QUOTE',new.aggregate_id)
    on conflict(event_key) do nothing;
  elsif new.event_type in('QUOTE_APPROVED','QUOTE_REJECTED') then
    select owner_id into owner_user from public.quotes where id=new.aggregate_id;
    insert into public.commercial_notifications(event_key,owner_id,type,title,body,entity_type,entity_id)
    values(new.event_type||':'||new.aggregate_id,owner_user,new.event_type,case when new.event_type='QUOTE_APPROVED' then 'Cotización aprobada' else 'Cotización rechazada' end,null,'QUOTE',new.aggregate_id)
    on conflict(event_key) do nothing;
  elsif new.event_type in('QUOTE_ACCEPTED','SALE_WON') then
    foreach recipient_role in array array['GERENTE_GENERAL','JEFE_DESARROLLO'] loop
      insert into public.commercial_notifications(event_key,audience_role,type,title,body,entity_type,entity_id)
      values(new.event_type||':'||new.aggregate_id||':'||recipient_role,recipient_role,new.event_type,case when new.event_type='QUOTE_ACCEPTED' then 'Cotización aceptada' else 'Venta ganada' end,null,new.aggregate_type,new.aggregate_id)
      on conflict(event_key) do nothing;
    end loop;
  elsif new.event_type='HANDOFF_READY' then
    foreach recipient_role in array array['GERENTE_GENERAL','JEFE_DESARROLLO'] loop
      insert into public.commercial_notifications(event_key,audience_role,type,title,body,entity_type,entity_id)
      values('HANDOFF_READY:'||new.aggregate_id||':'||recipient_role,recipient_role,'HANDOFF_READY','Handoff comercial listo',null,'HANDOFF',new.aggregate_id)
      on conflict(event_key) do nothing;
    end loop;
  end if;
  return new;
end$$;

alter table public.commercial_notifications enable row level security;
drop policy if exists commercial_notifications_own on public.commercial_notifications;
create policy commercial_notifications_own on public.commercial_notifications
for select to authenticated
using(owner_id=auth.uid() or audience_role=private.zyteron_role() or private.can_manage_sales());

revoke all on function public.process_commercial_due_notifications(timestamptz) from public,anon,authenticated;
grant execute on function public.process_commercial_due_notifications(timestamptz) to service_role;
revoke all on function public.project_commercial_event_notification() from public,anon,authenticated;

commit;

begin;

-- Una OT representa trabajo comercial confirmado. El proyecto operativo se crea
-- en la misma transacción y queda en PLANNING, sin simular que la ejecución ya comenzó.
create or replace function public.operations_ensure_project_for_work_order(
  target_work_order_id uuid,
  actor_user_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  work public.work_orders%rowtype;
  project_id uuid;
begin
  select * into work
  from public.work_orders
  where id=target_work_order_id
  for update;

  if not found then
    raise exception 'Orden de trabajo no encontrada';
  end if;

  select id into project_id
  from public.projects
  where work_order_id=work.id;

  if project_id is not null then
    return project_id;
  end if;

  insert into public.projects(
    client_id,work_order_id,quote_id,contract_id,name,description,scope,priority,
    development_manager_id,project_lead_id,planned_start_date,target_date,
    estimated_hours,budgeted_hours,client_visibility,created_by
  ) values (
    work.client_id,work.id,work.quote_id,work.contract_id,work.title,work.description,
    work.scope,work.priority,work.development_manager_id,work.assigned_to,
    work.planned_start_date,work.target_date,work.estimated_hours,work.estimated_hours,
    'INTERNAL',coalesce(actor_user_id,work.created_by)
  ) returning id into project_id;

  insert into public.operations_events(
    project_id,work_order_id,aggregate_type,aggregate_id,event_type,actor_id,payload
  ) values (
    project_id,work.id,'PROJECT',project_id,'PROJECT_CREATED',
    coalesce(actor_user_id,work.created_by),
    jsonb_build_object('workOrderId',work.id,'automatic',true)
  );

  insert into public.business_event_outbox(
    aggregate_type,aggregate_id,event_type,payload
  ) values (
    'PROJECT',project_id,'PROJECT_CREATED',
    jsonb_build_object('workOrderId',work.id,'clientId',work.client_id,'automatic',true)
  );

  return project_id;
end
$$;

create or replace function public.operations_auto_project_from_work_order()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.operations_ensure_project_for_work_order(new.id,new.created_by);
  return new;
end
$$;

drop trigger if exists work_orders_auto_project on public.work_orders;
create trigger work_orders_auto_project
after insert on public.work_orders
for each row execute function public.operations_auto_project_from_work_order();

create or replace function public.operations_sync_project_from_work_order()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.projects
  set client_id=new.client_id,
      quote_id=new.quote_id,
      contract_id=new.contract_id,
      development_manager_id=new.development_manager_id,
      project_lead_id=new.assigned_to,
      planned_start_date=new.planned_start_date,
      target_date=new.target_date,
      estimated_hours=new.estimated_hours,
      budgeted_hours=coalesce(budgeted_hours,new.estimated_hours),
      updated_at=now()
  where work_order_id=new.id;
  return new;
end
$$;

drop trigger if exists work_orders_sync_project on public.work_orders;
create trigger work_orders_sync_project
after update of client_id,quote_id,contract_id,development_manager_id,assigned_to,
  planned_start_date,target_date,estimated_hours
on public.work_orders
for each row execute function public.operations_sync_project_from_work_order();

-- Recupera las OT que ya existían (incluida la creada antes de esta corrección).
do $$
declare
  work record;
begin
  for work in
    select w.id,w.created_by
    from public.work_orders w
    where w.status not in ('CANCELLED','CLOSED')
      and not exists(select 1 from public.projects p where p.work_order_id=w.id)
  loop
    perform public.operations_ensure_project_for_work_order(work.id,work.created_by);
  end loop;
end
$$;

-- La conversión comercial ahora devuelve tanto la OT como el proyecto creado.
create or replace function public.convert_quote_to_work_order(
  target_quote_id uuid,
  actor_user_id uuid,
  idempotency_key text,
  override_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  q public.quotes%rowtype;
  s public.sales%rowtype;
  v public.quote_versions%rowtype;
  work_id uuid;
  project_id uuid;
  existing uuid;
  handoff uuid;
  scope_text text;
begin
  if nullif(trim(idempotency_key),'') is null then
    raise exception 'Idempotency-Key obligatorio';
  end if;

  select resource_id into existing
  from public.commercial_idempotency_keys
  where commercial_idempotency_keys.idempotency_key=$3
    and operation='QUOTE_TO_OT';

  if existing is not null then
    project_id:=public.operations_ensure_project_for_work_order(existing,actor_user_id);
    return jsonb_build_object('workOrderId',existing,'projectId',project_id,'created',false);
  end if;

  select * into q from public.quotes where id=target_quote_id for update;
  if not found then
    raise exception 'Cotización no encontrada';
  end if;

  select * into s from public.sales where quote_id=q.id for update;
  if not found then
    raise exception 'La cotización debe estar aceptada';
  end if;

  if s.work_order_id is not null then
    project_id:=public.operations_ensure_project_for_work_order(s.work_order_id,actor_user_id);
    return jsonb_build_object('workOrderId',s.work_order_id,'projectId',project_id,'created',false);
  end if;

  select * into v
  from public.quote_versions
  where quote_id=q.id and version_number=q.version
  order by created_at desc
  limit 1;

  select id into handoff from public.sales_handoffs where sale_id=s.id;
  select string_agg(description,E'\n') into scope_text from public.quote_items where quote_id=q.id;

  insert into public.work_orders(
    client_id,quote_id,quote_version,quote_version_id,sale_id,contract_id,handoff_id,
    title,scope,commercial_snapshot,target_date,commercial_owner_id,commercial_notes,
    created_by,status
  ) values (
    q.client_id,q.id,q.version,v.id,s.id,s.contract_id,handoff,
    q.company_name||' · '||q.quote_number,
    coalesce(scope_text,'Alcance comercial por confirmar'),
    coalesce(v.snapshot,jsonb_build_object('quoteNumber',q.quote_number,'amount',q.total_amount,'currency',q.currency)),
    q.valid_until,q.owner_id,q.notes,actor_user_id,'READY_FOR_HANDOFF'
  ) returning id into work_id;

  project_id:=public.operations_ensure_project_for_work_order(work_id,actor_user_id);

  update public.sales set work_order_id=work_id where id=s.id;
  update public.quotes set status='CONVERTED' where id=q.id;
  update public.sales_handoffs set work_order_id=work_id where id=handoff;

  insert into public.commercial_idempotency_keys(idempotency_key,operation,resource_id)
  values($3,'QUOTE_TO_OT',work_id)
  on conflict do nothing;

  insert into public.commercial_events(
    aggregate_type,aggregate_id,event_type,actor_id,payload
  ) values (
    'WORK_ORDER',work_id,'WORK_ORDER_CREATED',actor_user_id,
    jsonb_build_object('quoteId',q.id,'projectId',project_id,'overrideReason',override_reason)
  );

  insert into public.business_event_outbox(
    aggregate_type,aggregate_id,event_type,payload
  ) values (
    'WORK_ORDER',work_id,'WORK_ORDER_CREATED',
    jsonb_build_object('quoteId',q.id,'projectId',project_id,'clientId',q.client_id)
  );

  return jsonb_build_object('workOrderId',work_id,'projectId',project_id,'created',true);
end
$$;

revoke all on function public.operations_ensure_project_for_work_order(uuid,uuid) from public,anon,authenticated;
revoke all on function public.operations_auto_project_from_work_order() from public,anon,authenticated;
revoke all on function public.operations_sync_project_from_work_order() from public,anon,authenticated;
revoke all on function public.convert_quote_to_work_order(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.operations_ensure_project_for_work_order(uuid,uuid) to service_role;
grant execute on function public.convert_quote_to_work_order(uuid,uuid,text,text) to service_role;

commit;

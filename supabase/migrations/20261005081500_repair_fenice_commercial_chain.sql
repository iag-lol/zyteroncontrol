begin;

-- Reparación idempotente del flujo que quedó partido antes de automatizar OT -> Proyecto.
-- La cotización y la OT pertenecen al mismo cliente y fueron confirmadas por el usuario.
do $$
declare
  quote_row public.quotes%rowtype;
  work_row public.work_orders%rowtype;
  linked_sale_id uuid;
  version_id uuid;
begin
  select * into quote_row
  from public.quotes
  where id='b097ac66-1849-43fd-939b-c6fc5488879f'
  for update;

  select * into work_row
  from public.work_orders
  where id='8423191e-7dfe-48cf-81a7-2aa895068053'
  for update;

  if quote_row.id is null or work_row.id is null then
    raise exception 'No se encontraron la cotización y la OT de Fenice';
  end if;

  if quote_row.client_id is distinct from work_row.client_id then
    raise exception 'La cotización y la OT pertenecen a clientes distintos';
  end if;

  select id into version_id
  from public.quote_versions
  where quote_id=quote_row.id and version_number=quote_row.version
  order by created_at desc
  limit 1;

  select id into linked_sale_id from public.sales where quote_id=quote_row.id;

  if linked_sale_id is null then
    if quote_row.status='READY_TO_SEND' then
      update public.quotes set status='SENT' where id=quote_row.id;
    end if;
    linked_sale_id:=public.accept_sales_quote(
      quote_row.id,
      null,
      'repair:fenice:COT-2026-000001:accept'
    );
  end if;

  update public.sales
  set work_order_id=work_row.id,
      quote_version_id=coalesce(quote_version_id,version_id)
  where id=linked_sale_id;

  update public.work_orders
  set quote_id=quote_row.id,
      quote_version=quote_row.version,
      quote_version_id=version_id,
      sale_id=linked_sale_id,
      commercial_snapshot=coalesce(commercial_snapshot,'{}'::jsonb)||jsonb_build_object(
        'quoteNumber',quote_row.quote_number,
        'amount',quote_row.total_amount,
        'currency',quote_row.currency,
        'reconciled',true
      )
  where id=work_row.id;

  update public.quotes
  set status='CONVERTED',
      accepted_at=coalesce(accepted_at,now()),
      sale_id=linked_sale_id
  where id=quote_row.id;

  insert into public.commercial_events(
    aggregate_type,aggregate_id,event_type,actor_id,payload
  )
  select 'WORK_ORDER',work_row.id,'COMMERCIAL_CHAIN_RECONCILED',null,
    jsonb_build_object('quoteId',quote_row.id,'saleId',linked_sale_id,'clientId',quote_row.client_id)
  where not exists(
    select 1 from public.commercial_events
    where aggregate_type='WORK_ORDER'
      and aggregate_id=work_row.id
      and event_type='COMMERCIAL_CHAIN_RECONCILED'
  );
end
$$;

commit;

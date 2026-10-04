begin;

-- Correlativo anual: cada año comienza en 10000 y avanza de forma atómica.
-- Los folios históricos se conservan y se usan para calcular el siguiente disponible.
create table if not exists public.sales_quote_folio_counters (
  folio_year integer primary key check (folio_year between 2020 and 9999),
  next_number bigint not null check (next_number >= 10000),
  updated_at timestamptz not null default now()
);

insert into public.sales_quote_folio_counters(folio_year, next_number)
select
  (parts)[1]::integer,
  greatest(max((parts)[2]::bigint) + 1, 10000)
from public.quotes q
cross join lateral regexp_match(q.quote_number, '^COT-([0-9]{4})-([0-9]+)$') as parsed(parts)
group by (parts)[1]::integer
on conflict(folio_year) do update
set next_number = greatest(public.sales_quote_folio_counters.next_number, excluded.next_number),
    updated_at = now();

create or replace function public.next_sales_quote_number()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_year integer := extract(year from timezone('America/Santiago', now()))::integer;
  assigned_number bigint;
begin
  insert into public.sales_quote_folio_counters(folio_year, next_number)
  values(target_year, 10001)
  on conflict(folio_year) do update
  set next_number = greatest(public.sales_quote_folio_counters.next_number, 10000) + 1,
      updated_at = now()
  returning next_number - 1 into assigned_number;

  return format('COT-%s-%s', target_year, assigned_number);
end;
$$;

revoke all on function public.next_sales_quote_number() from public;
grant execute on function public.next_sales_quote_number() to authenticated, service_role;

alter table public.sales_quote_folio_counters enable row level security;

insert into public.document_templates(code, version, name, body_html)
values(
  'SALES_QUOTE',
  2,
  'Cotización Zyteron V2',
  'Plantilla PDF corporativa server-side administrada por QuoteDocumentService V2'
)
on conflict(code, version) do nothing;

commit;

-- Prevent duplicate support tickets when a browser retries or a user clicks twice.
-- The resource UUID is reserved before ticket creation, so concurrent API instances
-- converge on the same ticket. It intentionally has no FK because the reservation
-- must exist before the support_tickets row is inserted.

create table if not exists public.support_idempotency_keys (
  idempotency_key text not null,
  operation text not null,
  request_hash text not null,
  resource_id uuid not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint support_idempotency_keys_pkey primary key (idempotency_key, operation),
  constraint support_idempotency_key_length check (char_length(idempotency_key) between 8 and 200),
  constraint support_idempotency_request_hash check (request_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists support_idempotency_resource_idx
  on public.support_idempotency_keys(resource_id);

create index if not exists support_idempotency_created_idx
  on public.support_idempotency_keys(created_at desc);

alter table public.support_idempotency_keys enable row level security;
revoke all on public.support_idempotency_keys from anon, authenticated;
grant select, insert, update, delete on public.support_idempotency_keys to service_role;

comment on table public.support_idempotency_keys is
  'Server-only idempotency reservations for support write operations.';

-- Additive Flow integration. No existing migration is edited. Apply to isolated staging first.
-- No default deployment row: operator must bind the database to sandbox OR production explicitly.
create table public.finance_flow_deployment (
 id boolean primary key default true check(id), environment text not null check(environment in('sandbox','production')),
 account_fingerprint text not null check(length(account_fingerprint)=64), configured_at timestamptz not null default now()
);
alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check check(provider in('BANK_TRANSFER','MERCADOPAGO','FLOW','CASH','OTHER'));
create table public.finance_flow_intents (
 id uuid primary key default gen_random_uuid(), invoice_id uuid references public.invoices(id),
 client_id uuid not null references public.clients(id), link_id uuid not null references public.payment_links(id),
 environment text not null check(environment in('sandbox','production')), account_fingerprint text not null check(length(account_fingerprint)=64),
 commerce_order text not null unique, authorized_amount numeric(18,2) not null check(authorized_amount>0 and authorized_amount=trunc(authorized_amount)),
 currency char(3) not null check(currency='CLP'), idempotency_key text not null unique,
 state text not null check(state in('CREATING','CREATE_UNKNOWN','PENDING','CONFIRMED','REJECTED','CANCELLED')),
 flow_order text, token_hash text, token_ciphertext text, checkout_base_url text,
 payment_id uuid references public.payments(id), receipt_path text, receipt_sha256 text, receipt_delivery text not null default 'NOT_QUEUED',
 error_code text, verified_at timestamptz,ledger_processed_at timestamptz, created_at timestamptz not null default now(),
 unique(environment,account_fingerprint,flow_order),unique(token_hash)
);
create unique index finance_flow_one_active on public.finance_flow_intents(invoice_id,environment,account_fingerprint)
 where state in('CREATING','CREATE_UNKNOWN','PENDING');
create index finance_flow_intents_client on public.finance_flow_intents(client_id,created_at desc);
create index finance_flow_intents_link on public.finance_flow_intents(link_id);
create table public.finance_flow_subscriptions (
 id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id),
 schedule_id uuid not null references public.billing_schedules(id),service_id uuid references public.client_services(id),
 environment text not null check(environment in('sandbox','production')),account_fingerprint text not null check(length(account_fingerprint)=64),
 authorized_amount numeric(18,2) not null check(authorized_amount>0 and authorized_amount=trunc(authorized_amount)),currency char(3) not null check(currency='CLP'),
 subscription_start date not null,contract_end date not null,authorized_periods integer not null check(authorized_periods between 1 and 119),
 terms_version text not null,terms_sha256 text not null check(length(terms_sha256)=64),
 state text not null check(state in('OFFERED','ENROLLING','ENROLLMENT_UNKNOWN','ACTIVE','CANCEL_REQUESTED','CANCEL_SCHEDULED','CANCELLED')),
 flow_plan_id text,flow_customer_id text,flow_subscription_id text,registration_token_hash text,registration_token_ciphertext text,
 enrollment_key uuid,mandate_user_id uuid,mandate_accepted_at timestamptz,paid_through timestamptz,
 cancellation_requested_at timestamptz,cancel_effective_at timestamptz,cancelled_by uuid,
 maintenance_policy_version text,maintenance_resource_id text,maintenance_state text not null default 'NOT_REQUESTED' check(maintenance_state in('NOT_REQUESTED','SCHEDULED','REQUESTED','EFFECTIVE','ERROR')),
 created_at timestamptz not null default now(),unique(environment,account_fingerprint,flow_subscription_id),
 check((maintenance_policy_version is null)=(maintenance_resource_id is null))
);
create unique index finance_flow_subscription_active on public.finance_flow_subscriptions(schedule_id)
 where state<>'CANCELLED';
create index finance_flow_subscriptions_client on public.finance_flow_subscriptions(client_id);
create index finance_flow_subscriptions_service on public.finance_flow_subscriptions(service_id);
create table public.finance_flow_cycles (
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references public.finance_flow_subscriptions(id),
 flow_invoice_id text not null,invoice_id uuid references public.invoices(id),source text not null default 'FLOW/invoice/get',source_version text not null default '3.0.1',verified_at timestamptz not null default now(),
 created_at timestamptz not null default now(),period_start date not null,period_end date not null,flow_order text,payment_id uuid references public.payments(id),
 unique(subscription_id,flow_invoice_id),unique(subscription_id,period_start),check(period_end>=period_start)
);
create table public.finance_flow_jobs (
 id uuid primary key default gen_random_uuid(),event_key text not null unique,
 kind text not null check(kind in('ALLOCATION_CONFIRMED','PAYMENT_CONFIRMED','SUBSCRIPTION_CANCEL_NOTICE','MAINTENANCE','RECONCILE_SUBSCRIPTION')),
 entity_id uuid not null,state text not null default 'PENDING' check(state in('PENDING','RUNNING','DONE','RETRY','DEAD_LETTER')),
 attempts integer not null default 0,available_at timestamptz not null default now(),lease_until timestamptz,lease_id uuid,
 created_at timestamptz not null default now(),completed_at timestamptz,error_code text
);
create index finance_flow_jobs_due on public.finance_flow_jobs(available_at) where state in('PENDING','RETRY','RUNNING');
-- Populated only by the verified OTP/MFA session workflow, never by a browser or Flow callback.
create schema if not exists private;
create table private.finance_portal_session_grants (
 auth_session_id uuid primary key,user_id uuid not null,email_verified_at timestamptz not null,mfa_verified_at timestamptz not null,
 expires_at timestamptz not null,revoked_at timestamptz,
 check(expires_at>email_verified_at)
);
alter table private.finance_portal_session_grants enable row level security;
revoke all on private.finance_portal_session_grants from public,anon,authenticated;
grant all on private.finance_portal_session_grants to service_role;

do $$declare t text;begin
 foreach t in array array['finance_flow_deployment','finance_flow_intents','finance_flow_subscriptions','finance_flow_cycles','finance_flow_jobs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end$$;
create function public.finance_flow_assert_environment(p_environment text,p_account text) returns void
language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.finance_flow_deployment where id and environment=p_environment and account_fingerprint=p_account) then
  raise exception 'FLOW_ENVIRONMENT_MISMATCH';
 end if;
end$$;
create function public.finance_flow_reserve(p_link_hash text,p_key text,p_environment text,p_account text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.payment_links%rowtype;i public.invoices%rowtype;r public.finance_flow_intents%rowtype;new_id uuid;
begin
 perform public.finance_flow_assert_environment(p_environment,p_account);
 select * into l from public.payment_links where token_hash=p_link_hash and scope='PAY_INVOICE' and revoked_at is null and expires_at>now();
 if l.id is null then raise exception 'FLOW_LINK_UNAVAILABLE';end if;
 perform pg_advisory_xact_lock(hashtextextended(l.invoice_id::text,0));
 select * into r from public.finance_flow_intents where idempotency_key=p_key;
 if r.id is not null then
  if r.link_id<>l.id or r.environment<>p_environment or r.account_fingerprint<>p_account then raise exception 'FLOW_IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('created',false,'intent',to_jsonb(r));
 end if;
 select * into i from public.invoices where id=l.invoice_id for update;
 if i.client_id<>l.client_id or i.currency<>'CLP' or i.balance_due<=0 or i.status not in('ISSUED','PARTIALLY_PAID') or i.document_type_code=61 then raise exception 'FLOW_INVOICE_NOT_PAYABLE';end if;
 select * into r from public.finance_flow_intents where invoice_id=i.id and environment=p_environment and account_fingerprint=p_account and state in('CREATING','CREATE_UNKNOWN','PENDING');
 if r.id is not null then return jsonb_build_object('created',false,'intent',to_jsonb(r));end if;
 new_id:=gen_random_uuid();
 insert into public.finance_flow_intents(id,invoice_id,client_id,link_id,environment,account_fingerprint,commerce_order,authorized_amount,currency,idempotency_key,state)
 values(new_id,i.id,i.client_id,l.id,p_environment,p_account,'zyt_'||new_id::text,i.balance_due,'CLP',p_key,'CREATING') returning * into r;
 return jsonb_build_object('created',true,'intent',to_jsonb(r));
end$$;
create function public.finance_flow_capture(p_id uuid,p_order text,p_token_hash text,p_cipher text,p_checkout_base text) returns void
language plpgsql security definer set search_path='' as $$begin
 update public.finance_flow_intents set flow_order=p_order,token_hash=p_token_hash,token_ciphertext=p_cipher,checkout_base_url=p_checkout_base,state='PENDING'
 where id=p_id and state='CREATING';
 if not found then raise exception 'FLOW_INTENT_CHANGED';end if;
end$$;
create function public.finance_flow_apply(p_id uuid,p_remote jsonb,p_token_hash text,p_cipher text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.finance_flow_intents%rowtype;i public.invoices%rowtype;v_payment uuid;v_amount numeric;v_fee numeric;v_allocation numeric;v_state text;v_allocation_id uuid;
begin
 select * into r from public.finance_flow_intents where id=p_id for update;
 if r.id is null then raise exception 'FLOW_INTENT_NOT_FOUND';end if;
 perform public.finance_flow_assert_environment(r.environment,r.account_fingerprint);
 if p_remote->>'environment' is distinct from r.environment or p_remote->>'accountFingerprint' is distinct from r.account_fingerprint or p_remote->>'commerceOrder' is distinct from r.commerce_order
  or p_remote->>'currency' is distinct from 'CLP' or (p_remote->>'amount')::numeric is distinct from r.authorized_amount
  or (r.flow_order is not null and p_remote->>'order' is distinct from r.flow_order)
  or (r.token_hash is not null and p_token_hash is not null and r.token_hash is distinct from p_token_hash) then raise exception 'FLOW_PAYMENT_MISMATCH';end if;
 v_state:=p_remote->>'state';if v_state is null or v_state not in('PENDING','CONFIRMED','REJECTED','CANCELLED') then raise exception 'FLOW_INVALID_STATUS';end if;
 -- Once credited, an out-of-order pending/rejection callback cannot erase a payment.
 if r.state='CONFIRMED' then return jsonb_build_object('state',r.state,'payment_id',r.payment_id,'duplicate',true);end if;
 if v_state<>'CONFIRMED' then
  update public.finance_flow_intents set state=v_state,error_code=p_remote->>'errorCode',verified_at=now() where id=r.id;
  return jsonb_build_object('state',v_state,'payment_id',null,'duplicate',false);
 end if;
 if p_remote->>'fee' is null or p_remote->>'paidAt' is null then raise exception 'FLOW_PAYMENT_NO_EVIDENCE';end if;
 v_amount:=(p_remote->>'amount')::numeric;v_fee:=(p_remote->>'fee')::numeric;
 if v_fee<0 or v_fee>v_amount or (p_remote->>'paidAt')::timestamptz>now()+interval '5 minutes' then raise exception 'FLOW_PAYMENT_NO_EVIDENCE';end if;
 if r.invoice_id is not null then
  select * into i from public.invoices where id=r.invoice_id;
  if i.client_id is distinct from r.client_id or i.currency is distinct from r.currency then raise exception 'FLOW_PAYMENT_MISMATCH';end if;
 end if;
 insert into public.payments(client_id,provider,method,currency,gross_amount,fee_amount,received_at,status,external_id,external_status,confirmed_at,settlement_status,notes)
 values(r.client_id,'FLOW','OTHER',r.currency,v_amount,v_fee,(p_remote->>'paidAt')::timestamptz,'CONFIRMED',r.environment||':'||(p_remote->>'order'),'2',now(),'PENDING','Confirmación Flow verificada') returning id into v_payment;
 -- Use the existing canonical allocator; it locks payment then invoice in the standard order.
 if r.invoice_id is not null then
  select * into i from public.invoices where id=r.invoice_id for update;
  v_allocation:=least(greatest(i.balance_due,0),v_amount);
  if v_allocation>0 and i.status in('ISSUED','PARTIALLY_PAID') then
   v_allocation_id:=public.finance_allocate_payment(v_payment,i.id,v_allocation,null);
   insert into public.finance_flow_jobs(event_key,kind,entity_id) values('flow-allocation:'||v_allocation_id::text,'ALLOCATION_CONFIRMED',v_allocation_id) on conflict(event_key) do nothing;
  end if;
 end if;
 update public.finance_flow_intents set state='CONFIRMED',payment_id=v_payment,flow_order=p_remote->>'order',token_hash=p_token_hash,
 token_ciphertext=p_cipher,verified_at=now(),receipt_delivery='QUEUED',error_code=null where id=r.id;
 insert into public.finance_flow_jobs(event_key,kind,entity_id) values('flow-confirmed:'||r.id::text,'PAYMENT_CONFIRMED',r.id) on conflict(event_key) do nothing;
 return jsonb_build_object('state','CONFIRMED','payment_id',v_payment,'duplicate',false);
end$$;
create function public.finance_flow_claim_job() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.finance_flow_jobs%rowtype;
begin
 select * into j from public.finance_flow_jobs where available_at<=now() and (state in('PENDING','RETRY') or state='RUNNING' and lease_until<now())
 order by available_at,id for update skip locked limit 1;
 if j.id is null then return null;end if;
 update public.finance_flow_jobs set state='RUNNING',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_id=gen_random_uuid() where id=j.id returning * into j;
 return to_jsonb(j);
end$$;
create function public.finance_flow_finish_job(p_id uuid,p_lease uuid,p_error text) returns void language plpgsql security definer set search_path='' as $$begin
 update public.finance_flow_jobs set state=case when p_error is null then 'DONE' when attempts>=10 then 'DEAD_LETTER' else 'RETRY' end,
 error_code=p_error,completed_at=case when p_error is null then now() else null end,
 available_at=now()+make_interval(secs=>least(3600,power(2,least(attempts,10))::integer*30)),lease_until=null
 where id=p_id and lease_id=p_lease and state='RUNNING';
 if not found then raise exception 'FLOW_JOB_LEASE_LOST';end if;
end$$;
create function public.finance_flow_billing_session(p_user uuid,p_session uuid,p_client uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.finance_portal_session_grants g
 join auth.sessions s on s.id=g.auth_session_id and s.user_id=g.user_id
 join public.client_portal_users m on m.auth_user_id=g.user_id and m.client_id=p_client
 join public.client_contacts c on c.id=m.contact_id and c.client_id=m.client_id
 join public.client_portal_settings settings on settings.client_id=m.client_id
 where g.user_id=p_user and g.auth_session_id=p_session and g.revoked_at is null and g.expires_at>now()
 and g.email_verified_at>now()-interval '12 hours' and g.mfa_verified_at>now()-interval '10 minutes'
 and (s.not_after is null or s.not_after>now()) and m.status='ACTIVE' and c.status='ACTIVE' and c.billing_contact and settings.enabled and settings.invoices_visible)
$$;
create table public.finance_flow_access_grants (
 id uuid primary key default gen_random_uuid(),grant_hash text not null unique check(length(grant_hash)=64),
 link_id uuid not null references public.payment_links(id),intent_id uuid references public.finance_flow_intents(id),
 scope text not null check(scope in('PAY_INVOICE','PAYMENT_RESULT')),expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now()
);
alter table public.finance_flow_access_grants enable row level security;
revoke all on public.finance_flow_access_grants from public,anon,authenticated;
grant all on public.finance_flow_access_grants to service_role;
alter table public.finance_flow_intents add column mail_first_attempt_at timestamptz;
alter table public.finance_flow_intents add column mail_provider_id text;
alter table public.finance_flow_subscriptions add column notice_recorded boolean not null default false;
alter table public.finance_flow_subscriptions add column next_reconcile_at timestamptz not null default now();
create index finance_flow_access_grants_link on public.finance_flow_access_grants(link_id);
create function public.finance_flow_enqueue_reconciliation() returns integer language plpgsql security definer set search_path='' as $$
declare s public.finance_flow_subscriptions%rowtype;n integer:=0;
begin
 for s in select * from public.finance_flow_subscriptions where next_reconcile_at<=now() and state in('ACTIVE','CANCEL_REQUESTED','CANCEL_SCHEDULED') order by next_reconcile_at,id for update skip locked limit 100 loop
  insert into public.finance_flow_jobs(event_key,kind,entity_id) values('flow-sync:'||s.id||':'||floor(extract(epoch from now())/300)::text,'RECONCILE_SUBSCRIPTION',s.id) on conflict(event_key) do nothing;
  update public.finance_flow_subscriptions set next_reconcile_at=now()+interval '5 minutes' where id=s.id;n:=n+1;
 end loop;
 return n;
end$$;
-- Cancellation is a request, not proof of provider cancellation nor of technical suspension.
create function public.finance_flow_request_cancel(p_id uuid,p_user uuid,p_session uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.finance_flow_subscriptions%rowtype;
begin
 select * into s from public.finance_flow_subscriptions where id=p_id for update;
 if s.id is null or not public.finance_flow_billing_session(p_user,p_session,s.client_id) then raise exception 'FLOW_ACCESS_DENIED';end if;
 if s.state in('CANCEL_REQUESTED','CANCEL_SCHEDULED','CANCELLED') then return jsonb_build_object('created',false,'subscription',to_jsonb(s));end if;
 if s.state<>'ACTIVE' then raise exception 'FLOW_SUBSCRIPTION_NOT_ACTIVE';end if;
 update public.finance_flow_subscriptions set state='CANCEL_REQUESTED',cancellation_requested_at=now(),cancelled_by=p_user where id=p_id returning * into s;
 insert into public.finance_flow_jobs(event_key,kind,entity_id) values('flow-cancel-notice:'||s.id,'SUBSCRIPTION_CANCEL_NOTICE',s.id) on conflict(event_key) do nothing;
 return jsonb_build_object('created',true,'subscription',to_jsonb(s));
end$$;
create function public.finance_flow_schedule_cancel(p_id uuid,p_remote jsonb) returns void language plpgsql security definer set search_path='' as $$
declare s public.finance_flow_subscriptions%rowtype;v_end timestamptz;
begin
 select * into s from public.finance_flow_subscriptions where id=p_id for update;
 if s.id is null then raise exception 'FLOW_SUBSCRIPTION_NOT_FOUND';end if;
 perform public.finance_flow_assert_environment(s.environment,s.account_fingerprint);
 if p_remote->>'id' is distinct from s.flow_subscription_id or p_remote->>'customerId' is distinct from s.flow_customer_id or p_remote->>'planId' is distinct from s.flow_plan_id then raise exception 'FLOW_SUBSCRIPTION_MISMATCH';end if;
 if s.state not in('CANCEL_REQUESTED','CANCEL_SCHEDULED') then raise exception 'FLOW_SUBSCRIPTION_STATE';end if;
 if coalesce((p_remote->>'cancelAtPeriodEnd')::boolean,false)=false and p_remote->>'state'<>'CANCELLED' then raise exception 'FLOW_CANCELLATION_NOT_VERIFIED';end if;
 -- Refuse to schedule infrastructure changes without verified paid coverage and provider dates.
 if s.paid_through is null or p_remote->>'periodEnd' is null then raise exception 'FLOW_PAID_PERIOD_NOT_VERIFIED';end if;
 v_end:=case when (p_remote->>'cancelAtPeriodEnd')::boolean then greatest(s.paid_through,(p_remote->>'periodEnd')::timestamptz) else greatest(s.paid_through,now()) end;
 update public.finance_flow_subscriptions set state='CANCEL_SCHEDULED',cancel_effective_at=v_end,
 maintenance_state=case when maintenance_resource_id is null then 'NOT_REQUESTED' else 'SCHEDULED' end where id=p_id;
 -- Stop future canonical billing after provider cancellation is verified; preserve existing receivables.
 update public.billing_schedules set active=false where id=s.schedule_id;
 if s.maintenance_resource_id is null and p_remote->>'state'='CANCELLED' and v_end<=now() then
  update public.finance_flow_subscriptions set state='CANCELLED' where id=p_id;
  update public.billing_schedules set active=false where id=s.schedule_id;
 end if;
 if s.maintenance_resource_id is not null then
  insert into public.finance_flow_jobs(event_key,kind,entity_id,available_at) values('flow-maintenance:'||s.id,'MAINTENANCE',s.id,v_end)
  on conflict(event_key) do update set available_at=greatest(public.finance_flow_jobs.available_at,excluded.available_at);
 end if;
end$$;
-- Recurring cycles are linked to canonical Finance invoices, never to a duplicate portal ledger.
alter table public.finance_flow_subscriptions add column mandate_session_id uuid;
create function public.finance_flow_claim_enrollment(p_id uuid,p_user uuid,p_session uuid,p_terms text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.finance_flow_subscriptions%rowtype;
begin
 select * into s from public.finance_flow_subscriptions where id=p_id for update;
 if s.id is null or not public.finance_flow_billing_session(p_user,p_session,s.client_id) then raise exception 'FLOW_ACCESS_DENIED';end if;
 if s.terms_sha256 is distinct from p_terms then raise exception 'FLOW_TERMS_CHANGED';end if;
 if s.state<>'OFFERED' then return jsonb_build_object('created',false,'subscription',to_jsonb(s));end if;
 perform public.finance_flow_assert_environment(s.environment,s.account_fingerprint);
 update public.finance_flow_subscriptions set state='ENROLLING',enrollment_key=gen_random_uuid(),mandate_user_id=p_user,mandate_session_id=p_session,mandate_accepted_at=now() where id=p_id returning * into s;
 return jsonb_build_object('created',true,'subscription',to_jsonb(s));
end$$;
create function public.finance_flow_claim_activation(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.finance_flow_subscriptions%rowtype;
begin
 select * into s from public.finance_flow_subscriptions where id=p_id for update;
 if s.id is null or s.state<>'ENROLLING' then return false;end if;
 if not public.finance_flow_billing_session(s.mandate_user_id,s.mandate_session_id,s.client_id) or s.mandate_accepted_at<now()-interval '10 minutes' then raise exception 'FLOW_REAUTHENTICATION_REQUIRED';end if;
 update public.finance_flow_subscriptions set state='ENROLLMENT_UNKNOWN' where id=p_id;
 return true;
end$$;
-- A recurring invoice is linked by staff/Finance, with the exact period and verified customer.
-- Do not create a second invoice from a provider payload.
alter table public.finance_flow_intents alter column link_id drop not null;
alter table public.finance_flow_intents add column cycle_id uuid references public.finance_flow_cycles(id);
alter table public.finance_flow_intents add constraint finance_flow_intent_origin check((link_id is null)<>(cycle_id is null) and (link_id is null or invoice_id is not null));
create index finance_flow_intents_cycle on public.finance_flow_intents(cycle_id);
create function public.finance_flow_apply_cycle(p_cycle uuid,p_remote jsonb,p_period_end timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.finance_flow_cycles%rowtype;s public.finance_flow_subscriptions%rowtype;i public.invoices%rowtype;r public.finance_flow_intents%rowtype;result jsonb;v_id uuid;v_allocation_id uuid;
begin
 select * into c from public.finance_flow_cycles where id=p_cycle for update;
 if c.id is null then raise exception 'FLOW_CYCLE_NOT_FOUND';end if;
 select * into s from public.finance_flow_subscriptions where id=c.subscription_id for update;
 perform public.finance_flow_assert_environment(s.environment,s.account_fingerprint);
 if s.mandate_accepted_at is null or s.flow_subscription_id is null or s.flow_customer_id is null or s.flow_plan_id is null or p_remote->>'state' is distinct from 'CONFIRMED' or p_period_end is null
  or (p_period_end at time zone 'America/Santiago')::date is distinct from c.period_end then raise exception 'FLOW_CYCLE_MISMATCH';end if;
 if c.invoice_id is not null then
  select * into i from public.invoices where id=c.invoice_id;
  if i.client_id is distinct from s.client_id or i.billing_schedule_id is distinct from s.schedule_id or i.currency<>'CLP' or i.total_amount is distinct from s.authorized_amount then raise exception 'FLOW_CYCLE_MISMATCH';end if;
 end if;
 select * into r from public.finance_flow_intents where cycle_id=c.id;
 if r.id is null then
  v_id:=gen_random_uuid();
  insert into public.finance_flow_intents(id,invoice_id,client_id,cycle_id,environment,account_fingerprint,commerce_order,authorized_amount,currency,idempotency_key,state,flow_order)
  values(v_id,c.invoice_id,s.client_id,c.id,s.environment,s.account_fingerprint,p_remote->>'commerceOrder',s.authorized_amount,'CLP','cycle:'||c.id::text,'CREATING',p_remote->>'order') returning * into r;
 end if;
 result:=public.finance_flow_apply(r.id,p_remote,null,null);
 if c.invoice_id is not null then
  select * into i from public.invoices where id=c.invoice_id;
  if i.status in('ISSUED','PARTIALLY_PAID') and i.balance_due>0 and (select unapplied_amount from public.payments where id=(result->>'payment_id')::uuid)>0 then
   v_allocation_id:=public.finance_allocate_payment((result->>'payment_id')::uuid,i.id,least(i.balance_due,(select unapplied_amount from public.payments where id=(result->>'payment_id')::uuid)),null);
   insert into public.finance_flow_jobs(event_key,kind,entity_id) values('flow-allocation:'||v_allocation_id::text,'ALLOCATION_CONFIRMED',v_allocation_id) on conflict(event_key) do nothing;
  end if;
 end if;
 update public.finance_flow_cycles set payment_id=(result->>'payment_id')::uuid,flow_order=p_remote->>'order' where id=c.id;
 update public.finance_flow_subscriptions set paid_through=greatest(paid_through,p_period_end),
 cancel_effective_at=case when state='CANCEL_SCHEDULED' then greatest(cancel_effective_at,p_period_end) else cancel_effective_at end,
 maintenance_state=case when state='CANCEL_SCHEDULED' and p_period_end>now() and maintenance_state in('REQUESTED','EFFECTIVE') then 'SCHEDULED' else maintenance_state end where id=s.id;
 if p_period_end>now() and s.state='CANCEL_SCHEDULED' then
  update public.finance_flow_site_modes set desired_mode='ACTIVE',observed_mode=null,generation=generation+1,updated_at=now()
   where subscription_id=s.id and desired_mode='MAINTENANCE';
 end if;
 return result;
end$$;
create table public.finance_flow_callback_inbox (
 id uuid primary key,token_hash text not null unique check(length(token_hash)=64),token_ciphertext text not null,created_at timestamptz not null default now(),received_at timestamptz not null default now()
);
alter table public.finance_flow_callback_inbox enable row level security;
revoke all on public.finance_flow_callback_inbox from public,anon,authenticated;
grant all on public.finance_flow_callback_inbox to service_role;
alter table public.finance_flow_jobs drop constraint finance_flow_jobs_kind_check;
alter table public.finance_flow_jobs add constraint finance_flow_jobs_kind_check check(kind in('VERIFY_FLOW_TOKEN','ALLOCATION_CONFIRMED','PAYMENT_CONFIRMED','SUBSCRIPTION_CANCEL_NOTICE','MAINTENANCE','RECONCILE_SUBSCRIPTION'));
create function public.finance_flow_enqueue_callback(p_id uuid,p_hash text,p_cipher text) returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 insert into public.finance_flow_callback_inbox(id,token_hash,token_ciphertext) values(p_id,p_hash,p_cipher) on conflict(token_hash) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.finance_flow_callback_inbox where token_hash=p_hash;end if;
 insert into public.finance_flow_jobs(event_key,kind,entity_id) values('flow-callback:'||p_hash,'VERIFY_FLOW_TOKEN',v_id) on conflict(event_key) do update
  set state=case when public.finance_flow_jobs.state='RUNNING' then 'RUNNING' else 'PENDING' end,available_at=now();
end$$;
create table public.finance_flow_site_modes (
 resource_id text primary key,service_id uuid not null unique references public.client_services(id),client_id uuid not null references public.clients(id),subscription_id uuid not null references public.finance_flow_subscriptions(id),
 created_at timestamptz not null default now(),policy_version text not null,desired_mode text not null check(desired_mode in('ACTIVE','MAINTENANCE')),observed_mode text check(observed_mode in('ACTIVE','MAINTENANCE')),
 generation integer not null default 1,paid_coverage_version timestamptz not null,acknowledged_at timestamptz,updated_at timestamptz not null default now()
);
alter table public.finance_flow_site_modes enable row level security;
revoke all on public.finance_flow_site_modes from public,anon,authenticated;
grant all on public.finance_flow_site_modes to service_role;
create index finance_flow_site_modes_client on public.finance_flow_site_modes(client_id);
create function public.finance_flow_prepare_site(p_id uuid,p_resource text,p_service uuid,p_client uuid,p_policy text) returns void language plpgsql security definer set search_path='' as $$
declare s public.finance_flow_subscriptions%rowtype;m public.finance_flow_site_modes%rowtype;
begin
 select * into s from public.finance_flow_subscriptions where id=p_id for update;
 if s.id is null or s.client_id is distinct from p_client or s.service_id is distinct from p_service or s.maintenance_resource_id is distinct from p_resource or s.maintenance_policy_version is distinct from p_policy
  or s.state<>'CANCEL_SCHEDULED' or s.cancel_effective_at is null or s.cancel_effective_at>now() or s.paid_through is null or s.paid_through>now()
  or not exists(select 1 from public.client_services where id=p_service and client_id=p_client and status='ACTIVE') then raise exception 'FLOW_SITE_NOT_ELIGIBLE';end if;
 select * into m from public.finance_flow_site_modes where resource_id=p_resource for update;
 if m.resource_id is not null and (m.service_id is distinct from p_service or m.client_id is distinct from p_client) then raise exception 'FLOW_SITE_BINDING_MISMATCH';end if;
 insert into public.finance_flow_site_modes(resource_id,service_id,client_id,subscription_id,policy_version,desired_mode,paid_coverage_version)
 values(p_resource,p_service,p_client,p_id,p_policy,'MAINTENANCE',s.paid_through)
 on conflict(resource_id) do update set desired_mode='MAINTENANCE',generation=case when public.finance_flow_site_modes.desired_mode='MAINTENANCE' then public.finance_flow_site_modes.generation else public.finance_flow_site_modes.generation+1 end,
 subscription_id=p_id,policy_version=p_policy,paid_coverage_version=s.paid_through,updated_at=now();
 update public.finance_flow_subscriptions set maintenance_state='REQUESTED' where id=p_id;
end$$;
create function public.finance_flow_ack_site(p_resource text,p_service uuid,p_client uuid,p_generation integer) returns void language plpgsql security definer set search_path='' as $$
declare m public.finance_flow_site_modes%rowtype;s public.finance_flow_subscriptions%rowtype;
begin
 select * into m from public.finance_flow_site_modes where resource_id=p_resource;
 if m.resource_id is null then raise exception 'FLOW_SITE_ACK_MISMATCH';end if;
 select * into s from public.finance_flow_subscriptions where id=m.subscription_id for update;
 select * into m from public.finance_flow_site_modes where resource_id=p_resource for update;
 if m.subscription_id is distinct from s.id then raise exception 'FLOW_SITE_ACK_MISMATCH';end if;
 if m.resource_id is null or m.service_id is distinct from p_service or m.client_id is distinct from p_client or m.generation is distinct from p_generation or m.desired_mode<>'MAINTENANCE' then raise exception 'FLOW_SITE_ACK_MISMATCH';end if;
 if s.state not in('CANCEL_SCHEDULED','CANCELLED') or s.paid_through is distinct from m.paid_coverage_version or s.paid_through>now() or s.cancel_effective_at>now() then raise exception 'FLOW_SITE_COVERAGE_CHANGED';end if;
 update public.finance_flow_site_modes set observed_mode='MAINTENANCE',acknowledged_at=now() where resource_id=p_resource;
 update public.finance_flow_subscriptions set maintenance_state='EFFECTIVE',state='CANCELLED' where id=s.id;
 update public.billing_schedules set active=false where id=s.schedule_id;
 update public.client_services set status='SUSPENDED',updated_at=now() where id=p_service and client_id=p_client and status='ACTIVE';
end$$;
-- All mutations execute only through audited server operations; no caller may invoke these RPCs directly.
do $$declare f regprocedure;begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'finance_flow_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f);
  execute format('grant execute on function %s to service_role',f);
 end loop;
end$$;

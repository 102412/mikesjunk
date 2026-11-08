-- Kernova account data model
-- Run this once in Supabase Dashboard -> SQL Editor -> New query.
-- It is safe to re-run. This project uses only the authenticated user's JWT,
-- never a service-role key in the browser.

create extension if not exists pgcrypto;

do $$ begin
  create type public.account_tier as enum ('free', 'build_pass', 'pro', 'smb', 'enterprise');
exception when duplicate_object then null;
end $$;

create table if not exists public.plan_catalog (
  tier public.account_tier primary key,
  label text not null,
  price_cents integer not null check (price_cents >= 0),
  billing_interval text not null check (billing_interval in ('one_time', 'month')),
  dashboard_limit integer check (dashboard_limit is null or dashboard_limit >= 0),
  monthly_build_limit integer check (monthly_build_limit is null or monthly_build_limit >= 0),
  monthly_edit_limit integer check (monthly_edit_limit is null or monthly_edit_limit >= 0),
  per_dashboard_edit_limit integer check (per_dashboard_edit_limit is null or per_dashboard_edit_limit >= 0),
  hosted_dashboard_limit integer not null check (hosted_dashboard_limit >= 0),
  seats_limit integer not null check (seats_limit > 0),
  integration_limit integer not null check (integration_limit >= 0),
  model_access jsonb not null default '[]'::jsonb,
  export_formats jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plan_catalog (tier, label, price_cents, billing_interval, dashboard_limit, monthly_build_limit, monthly_edit_limit, per_dashboard_edit_limit, hosted_dashboard_limit, seats_limit, integration_limit, model_access, export_formats)
values
  ('free', 'Free', 0, 'month', 1, null, null, 5, 0, 1, 0, '["gpt-5.6-luna"]', '["html"]'),
  ('build_pass', 'One-time build + export', 500, 'one_time', 1, null, null, 15, 0, 1, 5, '["gpt-6.1-sol"]', '["html", "css", "js"]'),
  ('pro', 'Pro', 1297, 'month', null, 4, null, 25, 3, 1, 0, '["gpt-5.6-luna", "gpt-6.1-sol"]', '["html", "css", "js"]'),
  ('smb', 'SMB', 3497, 'month', 1, null, 250, null, 1, 5, 50, '["gpt-5.6-luna", "gpt-6.1-sol"]', '["html", "css", "js"]'),
  ('enterprise', 'Enterprise', 9997, 'month', 1, null, 500, null, 1, 10, 75, '["gpt-5.6-luna", "gpt-6.1-sol", "gpt-astra-6"]', '["html", "css", "js"]')
on conflict (tier) do update set
  label = excluded.label,
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  dashboard_limit = excluded.dashboard_limit,
  monthly_build_limit = excluded.monthly_build_limit,
  monthly_edit_limit = excluded.monthly_edit_limit,
  per_dashboard_edit_limit = excluded.per_dashboard_edit_limit,
  hosted_dashboard_limit = excluded.hosted_dashboard_limit,
  seats_limit = excluded.seats_limit,
  integration_limit = excluded.integration_limit,
  model_access = excluded.model_access,
  export_formats = excluded.export_formats,
  updated_at = now();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  account_tier public.account_tier not null default 'free',
  billing_status text not null default 'active' check (billing_status in ('active', 'trialing', 'past_due', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_entitlements (
  account_id uuid primary key references public.profiles(id) on delete cascade,
  dashboard_limit integer check (dashboard_limit is null or dashboard_limit >= 0),
  monthly_build_limit integer check (monthly_build_limit is null or monthly_build_limit >= 0),
  monthly_edit_limit integer check (monthly_edit_limit is null or monthly_edit_limit >= 0),
  per_dashboard_edit_limit integer check (per_dashboard_edit_limit is null or per_dashboard_edit_limit >= 0),
  hosted_dashboard_limit integer not null default 0 check (hosted_dashboard_limit >= 0),
  seats_limit integer not null default 1 check (seats_limit > 0),
  integration_limit integer not null default 0 check (integration_limit >= 0),
  model_access jsonb not null default '[]'::jsonb,
  export_formats jsonb not null default '[]'::jsonb,
  period_started_at timestamptz not null default date_trunc('month', now()),
  period_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_wallets (
  account_id uuid primary key references public.profiles(id) on delete cascade,
  build_credits integer not null default 0 check (build_credits >= 0),
  edit_credits integer not null default 0 check (edit_credits >= 0),
  export_credits integer not null default 0 check (export_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  build_prompt text not null check (char_length(build_prompt) between 1 and 10000),
  workspace_config jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dashboards_account_created_idx on public.dashboards (account_id, created_at desc);

create table if not exists public.dashboard_revisions (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  operation text not null check (operation in ('build', 'edit', 'rebuild')),
  request text not null check (char_length(request) between 1 and 10000),
  workspace_config jsonb not null,
  created_at timestamptz not null default now(),
  unique (dashboard_id, revision_number)
);
create index if not exists revisions_dashboard_created_idx on public.dashboard_revisions (dashboard_id, created_at desc);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  dashboard_id uuid references public.dashboards(id) on delete set null,
  event_type text not null check (event_type in ('dashboard_build', 'dashboard_edit', 'export', 'hosting_slot', 'integration_connection')),
  quantity integer not null default 1 check (quantity > 0),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists usage_events_account_type_time_idx on public.usage_events (account_id, event_type, occurred_at desc);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  dashboard_id uuid references public.dashboards(id) on delete set null,
  credit_type text not null check (credit_type in ('build', 'edit', 'export')),
  amount integer not null check (amount <> 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dashboard_members (
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (dashboard_id, account_id)
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  provider text not null,
  status text not null default 'draft' check (status in ('draft', 'connected', 'error', 'disabled')),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_id, provider)
);

create table if not exists public.hosting_sites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  dashboard_id uuid not null unique references public.dashboards(id) on delete cascade,
  subdomain text unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists plan_catalog_updated_at on public.plan_catalog;
create trigger plan_catalog_updated_at before update on public.plan_catalog for each row execute function public.set_updated_at();
drop trigger if exists entitlements_updated_at on public.account_entitlements;
create trigger entitlements_updated_at before update on public.account_entitlements for each row execute function public.set_updated_at();
drop trigger if exists wallets_updated_at on public.credit_wallets;
create trigger wallets_updated_at before update on public.credit_wallets for each row execute function public.set_updated_at();
drop trigger if exists dashboards_updated_at on public.dashboards;
create trigger dashboards_updated_at before update on public.dashboards for each row execute function public.set_updated_at();
drop trigger if exists integration_connections_updated_at on public.integration_connections;
create trigger integration_connections_updated_at before update on public.integration_connections for each row execute function public.set_updated_at();
drop trigger if exists hosting_sites_updated_at on public.hosting_sites;
create trigger hosting_sites_updated_at before update on public.hosting_sites for each row execute function public.set_updated_at();

create or replace function public.provision_account(p_account_id uuid, p_email text, p_display_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare plan public.plan_catalog%rowtype;
begin
  select * into plan from public.plan_catalog where tier = 'free';
  insert into public.profiles (id, email, display_name) values (p_account_id, p_email, p_display_name)
  on conflict (id) do update set email = excluded.email, display_name = coalesce(excluded.display_name, public.profiles.display_name);
  insert into public.account_entitlements (account_id, dashboard_limit, monthly_build_limit, monthly_edit_limit, per_dashboard_edit_limit, hosted_dashboard_limit, seats_limit, integration_limit, model_access, export_formats)
  values (p_account_id, plan.dashboard_limit, plan.monthly_build_limit, plan.monthly_edit_limit, plan.per_dashboard_edit_limit, plan.hosted_dashboard_limit, plan.seats_limit, plan.integration_limit, plan.model_access, plan.export_formats)
  on conflict (account_id) do nothing;
  insert into public.credit_wallets (account_id, build_credits, edit_credits, export_credits) values (p_account_id, 1, 5, 0)
  on conflict (account_id) do nothing;
  insert into public.credit_ledger (account_id, credit_type, amount, reason)
  select p_account_id, 'build', 1, 'Free plan welcome build' where not exists (select 1 from public.credit_ledger where account_id = p_account_id and reason = 'Free plan welcome build');
  insert into public.credit_ledger (account_id, credit_type, amount, reason)
  select p_account_id, 'edit', 5, 'Free plan welcome edits' where not exists (select 1 from public.credit_ledger where account_id = p_account_id and reason = 'Free plan welcome edits');
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.provision_account(new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Provision people who signed in before this SQL was installed.
select public.provision_account(id, email, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')) from auth.users;

alter table public.plan_catalog enable row level security;
alter table public.profiles enable row level security;
alter table public.account_entitlements enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.dashboards enable row level security;
alter table public.dashboard_revisions enable row level security;
alter table public.usage_events enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.dashboard_members enable row level security;
alter table public.integration_connections enable row level security;
alter table public.hosting_sites enable row level security;

drop policy if exists "plans are readable" on public.plan_catalog;
create policy "plans are readable" on public.plan_catalog for select using (true);
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "users read own entitlements" on public.account_entitlements;
create policy "users read own entitlements" on public.account_entitlements for select using (auth.uid() = account_id);
drop policy if exists "users read own credits" on public.credit_wallets;
create policy "users read own credits" on public.credit_wallets for select using (auth.uid() = account_id);
drop policy if exists "users read own dashboards" on public.dashboards;
create policy "users read own dashboards" on public.dashboards for select using (auth.uid() = account_id);
drop policy if exists "users read own revisions" on public.dashboard_revisions;
create policy "users read own revisions" on public.dashboard_revisions for select using (auth.uid() = account_id);
drop policy if exists "users read own usage" on public.usage_events;
create policy "users read own usage" on public.usage_events for select using (auth.uid() = account_id);
drop policy if exists "users read own ledger" on public.credit_ledger;
create policy "users read own ledger" on public.credit_ledger for select using (auth.uid() = account_id);
drop policy if exists "users read own memberships" on public.dashboard_members;
create policy "users read own memberships" on public.dashboard_members for select using (auth.uid() = account_id);
drop policy if exists "users read own integrations" on public.integration_connections;
create policy "users read own integrations" on public.integration_connections for select using (auth.uid() = account_id);
drop policy if exists "users read own hosting" on public.hosting_sites;
create policy "users read own hosting" on public.hosting_sites for select using (auth.uid() = account_id);

create or replace function public.get_account_summary()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'profile', jsonb_build_object('tier', p.account_tier, 'billing_status', p.billing_status),
    'entitlements', jsonb_build_object('dashboard_limit', e.dashboard_limit, 'monthly_build_limit', e.monthly_build_limit, 'monthly_edit_limit', e.monthly_edit_limit, 'per_dashboard_edit_limit', e.per_dashboard_edit_limit, 'hosted_dashboard_limit', e.hosted_dashboard_limit, 'seats_limit', e.seats_limit, 'integration_limit', e.integration_limit),
    'credits', jsonb_build_object('build_credits', w.build_credits, 'edit_credits', w.edit_credits, 'export_credits', w.export_credits)
  ) from public.profiles p join public.account_entitlements e on e.account_id = p.id join public.credit_wallets w on w.account_id = p.id where p.id = auth.uid();
$$;

create or replace function public.create_dashboard_from_build(p_title text, p_prompt text, p_workspace_config jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare account_id uuid := auth.uid(); entitlement public.account_entitlements%rowtype; wallet public.credit_wallets%rowtype; dashboard_id uuid; month_builds integer; total_dashboards integer;
begin
  if account_id is null then raise exception 'Sign in is required.'; end if;
  select * into entitlement from public.account_entitlements where account_id = create_dashboard_from_build.account_id for update;
  select * into wallet from public.credit_wallets where account_id = create_dashboard_from_build.account_id for update;
  if not found then raise exception 'Account setup is incomplete.'; end if;
  select count(*) into total_dashboards from public.dashboards where account_id = create_dashboard_from_build.account_id;
  if entitlement.dashboard_limit is not null and total_dashboards >= entitlement.dashboard_limit then raise exception 'Your plan has reached its dashboard limit.'; end if;
  select count(*) into month_builds from public.usage_events where account_id = create_dashboard_from_build.account_id and event_type = 'dashboard_build' and occurred_at >= date_trunc('month', now());
  if entitlement.monthly_build_limit is not null and month_builds >= entitlement.monthly_build_limit then raise exception 'Your monthly build limit has been reached.'; end if;
  if wallet.build_credits = 0 and entitlement.monthly_build_limit is null then raise exception 'You do not have a build credit available.'; end if;
  insert into public.dashboards (account_id, title, build_prompt, workspace_config, status) values (account_id, p_title, p_prompt, p_workspace_config, 'ready') returning id into dashboard_id;
  insert into public.dashboard_revisions (dashboard_id, account_id, revision_number, operation, request, workspace_config) values (dashboard_id, account_id, 1, 'build', p_prompt, p_workspace_config);
  insert into public.dashboard_members (dashboard_id, account_id, role) values (dashboard_id, account_id, 'owner');
  insert into public.usage_events (account_id, dashboard_id, event_type) values (account_id, dashboard_id, 'dashboard_build');
  if wallet.build_credits > 0 then update public.credit_wallets set build_credits = build_credits - 1 where account_id = create_dashboard_from_build.account_id; insert into public.credit_ledger (account_id, dashboard_id, credit_type, amount, reason) values (account_id, dashboard_id, 'build', -1, 'Dashboard build'); end if;
  return jsonb_build_object('dashboard_id', dashboard_id);
end;
$$;

create or replace function public.record_dashboard_edit(p_dashboard_id uuid, p_request text, p_workspace_config jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare account_id uuid := auth.uid(); entitlement public.account_entitlements%rowtype; wallet public.credit_wallets%rowtype; edits_this_month integer; edits_for_dashboard integer; revision_no integer;
begin
  if account_id is null then raise exception 'Sign in is required.'; end if;
  if not exists (select 1 from public.dashboards where id = p_dashboard_id and account_id = record_dashboard_edit.account_id) then raise exception 'Dashboard not found.'; end if;
  select * into entitlement from public.account_entitlements where account_id = record_dashboard_edit.account_id for update;
  select * into wallet from public.credit_wallets where account_id = record_dashboard_edit.account_id for update;
  select count(*) into edits_this_month from public.usage_events where account_id = record_dashboard_edit.account_id and event_type = 'dashboard_edit' and occurred_at >= date_trunc('month', now());
  select count(*) into edits_for_dashboard from public.dashboard_revisions where dashboard_id = p_dashboard_id and operation = 'edit';
  if entitlement.monthly_edit_limit is not null and edits_this_month >= entitlement.monthly_edit_limit then raise exception 'Your monthly edit limit has been reached.'; end if;
  if entitlement.per_dashboard_edit_limit is not null and edits_for_dashboard >= entitlement.per_dashboard_edit_limit then raise exception 'This dashboard has reached its included edit limit.'; end if;
  if wallet.edit_credits = 0 and entitlement.monthly_edit_limit is null and entitlement.per_dashboard_edit_limit is null then raise exception 'You do not have an edit credit available.'; end if;
  select coalesce(max(revision_number), 0) + 1 into revision_no from public.dashboard_revisions where dashboard_id = p_dashboard_id;
  insert into public.dashboard_revisions (dashboard_id, account_id, revision_number, operation, request, workspace_config) values (p_dashboard_id, account_id, revision_no, 'edit', p_request, p_workspace_config);
  update public.dashboards set workspace_config = p_workspace_config, status = 'ready' where id = p_dashboard_id;
  insert into public.usage_events (account_id, dashboard_id, event_type) values (account_id, p_dashboard_id, 'dashboard_edit');
  if wallet.edit_credits > 0 then update public.credit_wallets set edit_credits = edit_credits - 1 where account_id = record_dashboard_edit.account_id; insert into public.credit_ledger (account_id, dashboard_id, credit_type, amount, reason) values (account_id, p_dashboard_id, 'edit', -1, 'Dashboard edit'); end if;
  return jsonb_build_object('dashboard_id', p_dashboard_id, 'revision_number', revision_no);
end;
$$;

revoke all on function public.provision_account(uuid, text, text) from public;
revoke all on function public.handle_new_user() from public;
grant execute on function public.get_account_summary() to authenticated;
grant execute on function public.create_dashboard_from_build(text, text, jsonb) to authenticated;
grant execute on function public.record_dashboard_edit(uuid, text, jsonb) to authenticated;

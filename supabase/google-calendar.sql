-- Run after schema.sql. OAuth tokens are encrypted by the Kernova server before storage.
-- No browser-facing policy grants access to this table.
create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, provider)
);

alter table public.integration_credentials enable row level security;
drop trigger if exists integration_credentials_updated_at on public.integration_credentials;
create trigger integration_credentials_updated_at before update on public.integration_credentials for each row execute function public.set_updated_at();

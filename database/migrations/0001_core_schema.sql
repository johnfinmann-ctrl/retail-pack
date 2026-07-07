-- ============================================================================
-- 0001_core_schema.sql
-- Retail Platform Core — kerneskema (PRS §35/§17 Database-standarder)
--
-- Indeholder KUN platform-niveau: companies, users, teams, app_registry,
-- audit_log. Ingen RetailPackPro-specifikke tabeller (pack_profiles m.fl.)
-- hører hjemme her — de tilføjes i det sprint, hvor RetailPackPro bygges.
-- ============================================================================

create extension if not exists "pgcrypto"; -- til gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Fælles trigger-funktion: opdaterer updated_at automatisk ved enhver ændring
-- (PRS §17 punkt 3). Genbruges af alle fremtidige tabeller på platformen.
-- ----------------------------------------------------------------------------
create or replace function platform_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Enums (PRS §17 punkt 6 — statusfelter er enums, ikke frie strenge)
-- ----------------------------------------------------------------------------
create type platform_role as enum ('superadmin', 'admin', 'teamleder', 'medarbejder');
create type company_status as enum ('trial', 'active', 'suspended');

-- ----------------------------------------------------------------------------
-- companies — én række pr. tenant (PRS §2.1/§3 Multi-Tenant)
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text,
  secondary_color text,
  locale_default text not null default 'da',
  status company_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at
  before update on companies
  for each row execute function platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- app_registry — hvilke apps en tenant har adgang til (PRS §4/§42)
-- ----------------------------------------------------------------------------
create table app_registry (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  app_key text not null, -- 'retailpackpro' | 'safetyscan' | 'freshscan' | 'notescan' | 'layoutscan'
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, app_key)
);

create trigger set_updated_at
  before update on app_registry
  for each row execute function platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- teams — teamleder-gruppering inden for en virksomhed
-- ----------------------------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  leader_user_id uuid, -- sat efter users-tabellen er oprettet (se nedenfor)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at
  before update on teams
  for each row execute function platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- users — spejler auth.users, tilføjer platform-felter (company, rolle, team)
-- ----------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id),
  full_name text not null,
  email text not null,
  phone text,
  role platform_role not null,
  team_id uuid references teams(id),
  status text not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at
  before update on users
  for each row execute function platform_set_updated_at();

alter table teams
  add constraint teams_leader_user_id_fkey
  foreign key (leader_user_id) references users(id);

-- ----------------------------------------------------------------------------
-- user_invites — onboarding-flow (PRS §2)
-- ----------------------------------------------------------------------------
create table user_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  email text not null,
  role platform_role not null,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- audit_log — append-only forretningslogning (PRS §19/§29)
-- ----------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  app_key text,
  user_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- Indekser (PRS §26 Skalering — company_id først i alle sammensatte indekser)
create index idx_users_company_id on users (company_id);
create index idx_teams_company_id on teams (company_id);
create index idx_app_registry_company_id on app_registry (company_id);
create index idx_audit_log_company_id_created_at on audit_log (company_id, created_at desc);

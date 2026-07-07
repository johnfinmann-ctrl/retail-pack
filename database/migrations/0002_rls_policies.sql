-- ============================================================================
-- 0002_rls_policies.sql
-- Row Level Security — den reelle håndhævelse af tenant-isolation (PRS §3/§24).
--
-- Princip: company_id sættes i JWT'et ved login (via en Postgres-funktion,
-- IKKE af klienten). Enhver policy sammenligner altid mod dette JWT-claim,
-- aldrig mod en værdi klienten selv sender med i forespørgslen.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Hjælpefunktioner til at læse platform-claims fra det aktive JWT
-- ----------------------------------------------------------------------------
create or replace function platform_jwt_company_id()
returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'company_id', '')::uuid;
$$ language sql stable;

create or replace function platform_jwt_role()
returns text as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'role';
$$ language sql stable;

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------
alter table companies enable row level security;

create policy companies_select_own_tenant on companies
  for select
  using (id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin');

create policy companies_update_own_tenant_admin on companies
  for update
  using (id = platform_jwt_company_id() and platform_jwt_role() in ('admin', 'superadmin'));

-- Kun SuperAdmin kan oprette nye virksomheder (PRS §1.1 Onboarding).
create policy companies_insert_superadmin_only on companies
  for insert
  with check (platform_jwt_role() = 'superadmin');

-- ----------------------------------------------------------------------------
-- app_registry
-- ----------------------------------------------------------------------------
alter table app_registry enable row level security;

create policy app_registry_tenant_isolation on app_registry
  for all
  using (company_id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin')
  with check (company_id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin');

-- ----------------------------------------------------------------------------
-- teams
-- ----------------------------------------------------------------------------
alter table teams enable row level security;

create policy teams_tenant_isolation on teams
  for all
  using (company_id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin')
  with check (company_id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin');

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
alter table users enable row level security;

create policy users_tenant_isolation_select on users
  for select
  using (company_id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin');

-- Kun Admin/SuperAdmin må oprette/redigere brugere (Teamleder inviterer ikke selv, PRS §9).
create policy users_admin_write on users
  for all
  using (
    (company_id = platform_jwt_company_id() and platform_jwt_role() in ('admin', 'superadmin'))
    or platform_jwt_role() = 'superadmin'
  )
  with check (
    (company_id = platform_jwt_company_id() and platform_jwt_role() in ('admin', 'superadmin'))
    or platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- user_invites
-- ----------------------------------------------------------------------------
alter table user_invites enable row level security;

create policy user_invites_admin_only on user_invites
  for all
  using (company_id = platform_jwt_company_id() and platform_jwt_role() in ('admin', 'superadmin'))
  with check (company_id = platform_jwt_company_id() and platform_jwt_role() in ('admin', 'superadmin'));

-- ----------------------------------------------------------------------------
-- audit_log — append-only: INGEN update/delete-policy findes overhovedet,
-- så selv SuperAdmin kan ikke ændre eller slette historik (PRS §19).
-- ----------------------------------------------------------------------------
alter table audit_log enable row level security;

create policy audit_log_select_own_tenant on audit_log
  for select
  using (company_id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin');

create policy audit_log_insert_own_tenant on audit_log
  for insert
  with check (company_id = platform_jwt_company_id() or platform_jwt_role() = 'superadmin');

-- Bemærk: ingen "for update"/"for delete"-policy defineret for audit_log.
-- Uden en tilladende policy afviser RLS automatisk alle UPDATE/DELETE-forsøg.

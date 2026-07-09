-- ============================================================================
-- supabase-stub.sql
-- KUN til lokal test mod en almindelig Postgres-instans (ikke en del af
-- leverancen til et rigtigt Supabase-projekt, som allerede har alt dette).
-- Emulerer det nødvendige minimum: auth.users, auth.uid(), authenticated/
-- anon-roller — så vi kan verificere RLS lokalt, uden Supabase-adgang.
-- ============================================================================
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);
create or replace function auth.uid()
returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$ language sql stable;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nosuperuser noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nosuperuser noinherit;
  end if;
end $$;

create extension if not exists "pgcrypto";

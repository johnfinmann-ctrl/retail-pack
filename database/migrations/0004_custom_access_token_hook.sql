-- ============================================================================
-- 0004_custom_access_token_hook.sql
--
-- KRITISK RETTELSE (fundet under uafhængig QA før v0.1.0-udgivelse):
-- RLS-policies i 0002 antager at company_id/role findes som FLADE claims i
-- JWT'et. Supabase's standard-JWT lægger custom data under et nested
-- `app_metadata`-objekt — det bliver kun til flade top-level claims, hvis
-- man registrerer en "Custom Access Token Hook". Denne migration opretter
-- funktionen; selve REGISTRERINGEN er et manuelt étgangs-skridt i Supabase-
-- dashboardet (kan ikke gøres via SQL alene) — se database/README.md.
-- ============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  found_company_id uuid;
  found_role platform_role;
  found_team_id uuid;
begin
  select company_id, role, team_id
    into found_company_id, found_role, found_team_id
    from public.users
    where id = (event ->> 'user_id')::uuid
    and deleted_at is null;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if found_company_id is not null then
    claims := jsonb_set(claims, '{company_id}', to_jsonb(found_company_id::text));
    claims := jsonb_set(claims, '{role}', to_jsonb(found_role::text));
    claims := jsonb_set(
      claims,
      '{team_id}',
      case when found_team_id is null then 'null'::jsonb else to_jsonb(found_team_id::text) end
    );
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Kun Supabase Auth-tjenesten (supabase_auth_admin) må kalde denne funktion —
-- ALDRIG almindelige klientroller. Dette er Supabases egen anbefalede praksis
-- for Auth Hooks, så en kompromitteret klient-session ikke kan kalde
-- funktionen direkte og forsøge at manipulere claims.
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

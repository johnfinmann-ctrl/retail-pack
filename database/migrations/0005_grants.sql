-- ============================================================================
-- 0005_grants.sql
--
-- KRITISK RETTELSE (fundet under uafhængig QA før v0.1.0-udgivelse):
-- Uden disse GRANT-statements afviser PostgREST (Supabase's API-lag) alle
-- forespørgsler med "permission denied" — HELT uafhængigt af RLS. RLS
-- begrænser HVILKE rækker en rolle ser; disse grants afgør om rollen
-- overhovedet må forsøge kommandoen. Begge dele er nødvendige.
--
-- Bemærk: `anon` (ikke-indloggede besøgende) får INGEN adgang til
-- tenant-tabellerne i Platform Core. Fremtidige offentlige flows (fx
-- validering af et invite-token før login) bør bygges som en SECURITY
-- DEFINER-funktion/Edge Function, ikke som direkte anon-grants på tabeller.
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on companies, app_registry, teams, users, user_invites, audit_log
  to authenticated;

-- Sikrer at fremtidige tabeller (fx RetailPackPro's i Sprint 2) automatisk
-- får samme grant uden at det skal huskes manuelt hver gang — det var
-- netop fraværet af den slags automatik, der forårsagede denne fejl.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

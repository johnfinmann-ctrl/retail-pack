-- ============================================================================
-- 0003_retailpackpro_grants.sql
-- Uden disse afviser PostgREST alt i retailpackpro-skemaet, uanset RLS
-- (samme lektion som Core's 0005_grants.sql).
-- ============================================================================

grant usage on schema retailpackpro to authenticated;

grant select, insert, update, delete
  on all tables in schema retailpackpro
  to authenticated;

alter default privileges in schema retailpackpro
  grant select, insert, update, delete on tables to authenticated;

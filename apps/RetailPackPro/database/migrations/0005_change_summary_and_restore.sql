-- ============================================================================
-- 0005_change_summary_and_restore.sql
-- Ændringsbeskrivelse ved publicering + rettelse af en historik-fejl fundet
-- under denne gennemgang (se nedenfor).
-- ============================================================================

alter table retailpackpro.pack_profiles add column change_summary text;

-- ----------------------------------------------------------------------------
-- Genskab publicerings-funktionen med to ændringer:
-- 1) Ny valgfri change_summary-parameter, med fast standardtekst hvis tom.
-- 2) RETTELSE af en fejl fra 0004: den gamle funktion satte updated_by på
--    den ARKIVEREDE række til den nye udgivers id — det overskrev dermed
--    "hvem publicerede DENNE version" med "hvem archiverede den", hver
--    gang en ny version blev publiceret. Historikken var derfor IKKE
--    komplet, som krævet. Nu rører vi slet ikke updated_by på den
--    arkiverede række — kun dens status ændres.
-- ----------------------------------------------------------------------------
drop function if exists retailpackpro.publish_pack_profile_draft(uuid, uuid);

create or replace function retailpackpro.publish_pack_profile_draft(
  draft_id uuid,
  publisher_id uuid,
  change_summary text default null
)
returns retailpackpro.pack_profiles
language plpgsql
security invoker
as $$
declare
  v_lineage_id uuid;
  v_result retailpackpro.pack_profiles;
  v_summary text;
begin
  select lineage_id into v_lineage_id
  from retailpackpro.pack_profiles
  where id = draft_id and status = 'draft';

  if v_lineage_id is null then
    raise exception 'Kladde findes ikke, eller er ikke længere en kladde';
  end if;

  v_summary := coalesce(nullif(trim(change_summary), ''), 'Opdateret pakkemetode');

  -- Arkivér den tidligere version — UDEN at røre dens egen historik.
  update retailpackpro.pack_profiles
  set status = 'archived'
  where lineage_id = v_lineage_id and status = 'published';

  -- Publicér kladden, gem hvem/hvornår/hvad, frigiv låsen.
  update retailpackpro.pack_profiles
  set status = 'published',
      published_at = now(),
      updated_by = publisher_id,
      locked_by = null,
      locked_at = null,
      change_summary = v_summary
  where id = draft_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function retailpackpro.publish_pack_profile_draft(uuid, uuid, text) to authenticated;

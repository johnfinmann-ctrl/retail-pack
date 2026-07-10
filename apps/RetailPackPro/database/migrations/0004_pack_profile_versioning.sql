-- ============================================================================
-- 0004_pack_profile_versioning.sql
-- Redigering af publicerede pakkemetoder: ny kladde-version, låsning,
-- atomisk publicering (kladde -> aktiv, gammel -> arkiveret), historik via
-- de arkiverede versioner selv (ingen separat historik-tabel nødvendig).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) lineage_id — binder alle versioner af SAMME logiske pakkemetode sammen.
-- Eksisterende rækker får deres eget id som lineage_id (de er hver deres
-- egen "version 1" indtil nogen redigerer dem).
-- ----------------------------------------------------------------------------
alter table retailpackpro.pack_profiles add column lineage_id uuid;
update retailpackpro.pack_profiles set lineage_id = id where lineage_id is null;
alter table retailpackpro.pack_profiles alter column lineage_id set not null;

create index idx_rpp_pack_profiles_lineage_id on retailpackpro.pack_profiles (lineage_id);

-- KUN ÉN aktiv kladde pr. pakkemetode ad gangen — forhindrer at to admins
-- ved en race condition begge når at oprette en kladde samtidig.
create unique index idx_rpp_pack_profiles_one_draft_per_lineage
  on retailpackpro.pack_profiles (lineage_id)
  where status = 'draft';

-- ----------------------------------------------------------------------------
-- 2) ON DELETE CASCADE — en kladde, der annulleres, slettes (ikke arkiveres,
-- jf. designbeslutning: en kladde der aldrig blev publiceret har ingen
-- historisk værdi). Uden CASCADE ville en tilknyttet reference_images/
-- pack_profile_products-række blokere sletningen med en fremmednøgle-fejl.
-- ----------------------------------------------------------------------------
alter table retailpackpro.pack_profile_products
  drop constraint pack_profile_products_pack_profile_id_fkey,
  add constraint pack_profile_products_pack_profile_id_fkey
    foreign key (pack_profile_id) references retailpackpro.pack_profiles(id) on delete cascade;

alter table retailpackpro.reference_images
  drop constraint reference_images_pack_profile_id_fkey,
  add constraint reference_images_pack_profile_id_fkey
    foreign key (pack_profile_id) references retailpackpro.pack_profiles(id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 3) Atomisk publicering. SECURITY INVOKER (standard) — funktionen kører
-- med den kaldende admins egne rettigheder, så RLS's eksisterende
-- update-policy for pack_profiles håndhæves uændret, ikke omgået.
-- ----------------------------------------------------------------------------
create or replace function retailpackpro.publish_pack_profile_draft(draft_id uuid, publisher_id uuid)
returns retailpackpro.pack_profiles
language plpgsql
security invoker
as $$
declare
  v_lineage_id uuid;
  v_result retailpackpro.pack_profiles;
begin
  select lineage_id into v_lineage_id
  from retailpackpro.pack_profiles
  where id = draft_id and status = 'draft';

  if v_lineage_id is null then
    raise exception 'Kladde findes ikke, eller er ikke længere en kladde';
  end if;

  -- Arkivér den tidligere publicerede version i samme "familie" af versioner
  update retailpackpro.pack_profiles
  set status = 'archived', updated_by = publisher_id
  where lineage_id = v_lineage_id and status = 'published';

  -- Gør kladden til den nye aktive version, og frigiv låsen
  update retailpackpro.pack_profiles
  set status = 'published',
      published_at = now(),
      updated_by = publisher_id,
      locked_by = null,
      locked_at = null
  where id = draft_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function retailpackpro.publish_pack_profile_draft(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4) DELETE-policy — manglede helt før (kun SELECT/INSERT/UPDATE fandtes).
-- Bevidst begrænset til KUN kladder — en publiceret eller arkiveret version
-- må ALDRIG kunne slettes, det ville ødelægge historikken.
-- ----------------------------------------------------------------------------
create policy rpp_pack_profiles_delete_draft_only on retailpackpro.pack_profiles
  for delete
  using (
    status = 'draft'
    and (
      (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
      or public.platform_jwt_role() = 'superadmin'
    )
  );

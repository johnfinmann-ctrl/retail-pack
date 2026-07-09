-- ============================================================================
-- 0002_retailpackpro_rls.sql
-- RLS for retailpackpro.*-skemaet.
--
-- Lektion fra Sprint 1's kritiske QA anvendt fra start denne gang:
-- - RLS aktiveres EKSPLICIT på hver eneste tabel (blev glemt for storage.objects sidst)
-- - Skrivehandlinger kræver EKSPLICIT rolletjek — ikke kun tenant-match
--   (blev glemt for teams/app_registry sidst)
-- - pack_sessions kræver user_id = auth.uid() ved insert — samme lektion som
--   audit_log-fundet: en session må aldrig kunne skrive i en anden brugers navn.
-- Genbruger Core's public.platform_jwt_company_id()/platform_jwt_role().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customers — læsning: tenant-bred. Skrivning: kun admin/superadmin.
-- ----------------------------------------------------------------------------
alter table retailpackpro.customers enable row level security;

create policy rpp_customers_select on retailpackpro.customers
  for select
  using (company_id = public.platform_jwt_company_id() or public.platform_jwt_role() = 'superadmin');

create policy rpp_customers_insert on retailpackpro.customers
  for insert
  with check (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_customers_update on retailpackpro.customers
  for update
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_customers_delete on retailpackpro.customers
  for delete
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- products — samme mønster som customers
-- ----------------------------------------------------------------------------
alter table retailpackpro.products enable row level security;

create policy rpp_products_select on retailpackpro.products
  for select
  using (company_id = public.platform_jwt_company_id() or public.platform_jwt_role() = 'superadmin');

create policy rpp_products_insert on retailpackpro.products
  for insert
  with check (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_products_update on retailpackpro.products
  for update
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_products_delete on retailpackpro.products
  for delete
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- packaging_items — samme mønster
-- ----------------------------------------------------------------------------
alter table retailpackpro.packaging_items enable row level security;

create policy rpp_packaging_items_select on retailpackpro.packaging_items
  for select
  using (company_id = public.platform_jwt_company_id() or public.platform_jwt_role() = 'superadmin');

create policy rpp_packaging_items_insert on retailpackpro.packaging_items
  for insert
  with check (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_packaging_items_update on retailpackpro.packaging_items
  for update
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_packaging_items_delete on retailpackpro.packaging_items
  for delete
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- pack_profiles
-- Læsning: Admin/superadmin ser ALLE statusser. Alle andre (teamleder/
-- medarbejder) ser KUN publicerede profiler — en draft må aldrig lække
-- til medarbejderflowet.
-- Skrivning: kun admin/superadmin.
-- ----------------------------------------------------------------------------
alter table retailpackpro.pack_profiles enable row level security;

create policy rpp_pack_profiles_select_admin on retailpackpro.pack_profiles
  for select
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_pack_profiles_select_published on retailpackpro.pack_profiles
  for select
  using (company_id = public.platform_jwt_company_id() and status = 'published');

create policy rpp_pack_profiles_insert on retailpackpro.pack_profiles
  for insert
  with check (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_pack_profiles_update on retailpackpro.pack_profiles
  for update
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- pack_profile_products — ingen egen company_id, tjekker via pack_profiles
-- ----------------------------------------------------------------------------
alter table retailpackpro.pack_profile_products enable row level security;

create policy rpp_pack_profile_products_select on retailpackpro.pack_profile_products
  for select
  using (
    exists (
      select 1 from retailpackpro.pack_profiles pp
      where pp.id = pack_profile_id
      and (
        pp.company_id = public.platform_jwt_company_id()
        or public.platform_jwt_role() = 'superadmin'
      )
    )
  );

create policy rpp_pack_profile_products_write on retailpackpro.pack_profile_products
  for all
  using (
    exists (
      select 1 from retailpackpro.pack_profiles pp
      where pp.id = pack_profile_id
      and pp.company_id = public.platform_jwt_company_id()
      and public.platform_jwt_role() in ('admin', 'superadmin')
    )
    or public.platform_jwt_role() = 'superadmin'
  )
  with check (
    exists (
      select 1 from retailpackpro.pack_profiles pp
      where pp.id = pack_profile_id
      and pp.company_id = public.platform_jwt_company_id()
      and public.platform_jwt_role() in ('admin', 'superadmin')
    )
    or public.platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- pack_flow_steps — læsning tenant-bred, skrivning kun admin/superadmin
-- ----------------------------------------------------------------------------
alter table retailpackpro.pack_flow_steps enable row level security;

create policy rpp_pack_flow_steps_select on retailpackpro.pack_flow_steps
  for select
  using (company_id = public.platform_jwt_company_id() or public.platform_jwt_role() = 'superadmin');

create policy rpp_pack_flow_steps_insert on retailpackpro.pack_flow_steps
  for insert
  with check (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_pack_flow_steps_update on retailpackpro.pack_flow_steps
  for update
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- reference_images — samme EXISTS-mønster som pack_profile_products
-- ----------------------------------------------------------------------------
alter table retailpackpro.reference_images enable row level security;

create policy rpp_reference_images_select on retailpackpro.reference_images
  for select
  using (
    exists (
      select 1 from retailpackpro.pack_profiles pp
      where pp.id = pack_profile_id
      and (
        pp.company_id = public.platform_jwt_company_id()
        or public.platform_jwt_role() = 'superadmin'
      )
    )
  );

create policy rpp_reference_images_write on retailpackpro.reference_images
  for all
  using (
    exists (
      select 1 from retailpackpro.pack_profiles pp
      where pp.id = pack_profile_id
      and pp.company_id = public.platform_jwt_company_id()
      and public.platform_jwt_role() in ('admin', 'superadmin')
    )
    or public.platform_jwt_role() = 'superadmin'
  )
  with check (
    exists (
      select 1 from retailpackpro.pack_profiles pp
      where pp.id = pack_profile_id
      and pp.company_id = public.platform_jwt_company_id()
      and public.platform_jwt_role() in ('admin', 'superadmin')
    )
    or public.platform_jwt_role() = 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- pack_sessions — append-only. Enhver tenant-bruger kan se SIN EGEN historik;
-- admin/superadmin ser hele virksomhedens. Insert kræver user_id = auth.uid()
-- (samme lektion som audit_log — en session skal aldrig kunne forfalskes).
-- INGEN update/delete-policy => strukturelt append-only.
-- ----------------------------------------------------------------------------
alter table retailpackpro.pack_sessions enable row level security;

create policy rpp_pack_sessions_select_own on retailpackpro.pack_sessions
  for select
  using (company_id = public.platform_jwt_company_id() and user_id = auth.uid());

create policy rpp_pack_sessions_select_admin on retailpackpro.pack_sessions
  for select
  using (
    (company_id = public.platform_jwt_company_id() and public.platform_jwt_role() in ('admin', 'superadmin'))
    or public.platform_jwt_role() = 'superadmin'
  );

create policy rpp_pack_sessions_insert on retailpackpro.pack_sessions
  for insert
  with check (
    (company_id = public.platform_jwt_company_id() and user_id = auth.uid())
    or public.platform_jwt_role() = 'superadmin'
  );

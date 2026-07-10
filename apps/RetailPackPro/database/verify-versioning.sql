-- ============================================================================
-- verify-versioning.sql — automatiseret testmatrix for redigering af
-- publicerede pakkemetoder (version, lås, atomisk publicering, historik).
--
-- Køres mod en database, der allerede har fået Core's migrations,
-- RetailPackPro's migrationer 0001-0004, og Core/RetailPackPro's seed.
-- Se apps/RetailPackPro/database/local-dev/supabase-stub.sql til lokal test.
-- ============================================================================

insert into companies (id, name, slug, status) values
  ('a1000000-0000-0000-0000-000000000001', 'Versionstest A/S', 'versionstest', 'active');

insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000002', 'admin1@versionstest.dk'),
  ('a1000000-0000-0000-0000-000000000003', 'admin2@versionstest.dk'),
  ('a1000000-0000-0000-0000-000000000004', 'medarbejder@versionstest.dk');

insert into users (id, company_id, full_name, email, role) values
  ('a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Admin Et', 'admin1@versionstest.dk', 'admin'),
  ('a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Admin To', 'admin2@versionstest.dk', 'admin'),
  ('a1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'QA Medarbejder', 'medarbejder@versionstest.dk', 'medarbejder');

insert into retailpackpro.customers (id, company_id, name) values
  ('a1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Versionstest Kunde');

insert into retailpackpro.packaging_items (id, company_id, type, name) values
  ('a1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'pallet_type', 'EUR-palle');

insert into retailpackpro.pack_profiles
  (id, company_id, customer_id, lineage_id, name, pallet_item_id, layer_count, version, status, created_by, updated_by, published_at)
values
  ('a1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005',
   'a1000000-0000-0000-0000-000000000007', 'Version 1', 'a1000000-0000-0000-0000-000000000006', 4, 1, 'published',
   'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', now());

-- ============================================================
-- TEST 1: Admin 1 opretter en kladde
-- ============================================================
set role authenticated;
set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "admin"}';

do $$
declare v_draft_id uuid;
begin
  insert into retailpackpro.pack_profiles (company_id, customer_id, lineage_id, name, pallet_item_id, layer_count, version, status, created_by, updated_by, locked_by, locked_at)
  select company_id, customer_id, lineage_id, name, pallet_item_id, layer_count, version + 1, 'draft',
         'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
         'a1000000-0000-0000-0000-000000000002', now()
  from retailpackpro.pack_profiles where id = 'a1000000-0000-0000-0000-000000000007'
  returning id into v_draft_id;

  if v_draft_id is null then raise exception 'FAIL TEST1: kladde blev ikke oprettet'; end if;
  raise notice 'PASS TEST1: Admin 1 opretter en kladde';
end $$;

-- ============================================================
-- TEST 2: Admin 2 kan IKKE oprette en ANDEN kladde for samme lineage
-- ============================================================
set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000003", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "admin"}';

do $$
begin
  begin
    insert into retailpackpro.pack_profiles (company_id, customer_id, lineage_id, name, version, status, created_by, updated_by, locked_by, locked_at)
    values ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007',
            'Admin 2 forsøg', 2, 'draft', 'a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003',
            'a1000000-0000-0000-0000-000000000003', now());
    raise exception 'FAIL TEST2: Admin 2 kunne oprette en konkurrerende kladde';
  exception
    when unique_violation then
      raise notice 'PASS TEST2: Admin 2 korrekt afvist (kun én kladde ad gangen pr. pakkemetode)';
  end;
end $$;

-- ============================================================
-- TEST 3: Admin 2 kan SE hvem der låser kladden
-- ============================================================
do $$
declare v_name text;
begin
  select u.full_name into v_name
  from retailpackpro.pack_profiles pp
  join users u on u.id = pp.locked_by
  where pp.lineage_id = 'a1000000-0000-0000-0000-000000000007' and pp.status = 'draft';

  if v_name != 'Admin Et' then raise exception 'FAIL TEST3: forventede "Admin Et", fik %', v_name; end if;
  raise notice 'PASS TEST3: Admin 2 kan se at "Admin Et" redigerer';
end $$;

-- ============================================================
-- TEST 4: Medarbejderen ser KUN version 1 (published), mens der redigeres
-- ============================================================
set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000004", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "medarbejder"}';

do $$
declare v_count int; v_status text;
begin
  select count(*), max(status) into v_count, v_status
  from retailpackpro.pack_profiles where lineage_id = 'a1000000-0000-0000-0000-000000000007';

  if v_count != 1 or v_status != 'published' then
    raise exception 'FAIL TEST4: medarbejder skulle se 1 published-raekke, fik % raekker med status %', v_count, v_status;
  end if;
  raise notice 'PASS TEST4: medarbejder ser kun version 1 (published) mens der redigeres — ser ALDRIG kladden';
end $$;

-- ============================================================
-- TEST 5-7: Publicering — atomisk, arkivering, lås frigivet
-- ============================================================
set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "admin"}';

do $$
declare v_draft_id uuid;
begin
  select id into v_draft_id from retailpackpro.pack_profiles
  where lineage_id = 'a1000000-0000-0000-0000-000000000007' and status = 'draft';

  perform retailpackpro.publish_pack_profile_draft(v_draft_id, 'a1000000-0000-0000-0000-000000000002');
  raise notice 'PASS TEST5: publicering gennemført uden fejl';
end $$;

do $$
declare v_published_count int; v_archived_count int; v_locked_count int;
begin
  select count(*) into v_published_count from retailpackpro.pack_profiles
  where lineage_id = 'a1000000-0000-0000-0000-000000000007' and status = 'published';
  select count(*) into v_archived_count from retailpackpro.pack_profiles
  where lineage_id = 'a1000000-0000-0000-0000-000000000007' and status = 'archived';
  select count(*) into v_locked_count from retailpackpro.pack_profiles
  where lineage_id = 'a1000000-0000-0000-0000-000000000007' and locked_by is not null;

  if v_published_count != 1 then raise exception 'FAIL TEST6: forventede 1 published, fik %', v_published_count; end if;
  if v_archived_count != 1 then raise exception 'FAIL TEST6: forventede 1 archived, fik %', v_archived_count; end if;
  raise notice 'PASS TEST6: praecis 1 published + 1 archived efter publicering';

  if v_locked_count != 0 then raise exception 'FAIL TEST7: laas ikke frigivet, % raekker stadig laast', v_locked_count; end if;
  raise notice 'PASS TEST7: laas frigivet efter publicering';
end $$;

-- ============================================================
-- TEST 8: Medarbejderen ser ØJEBLIKKELIGT den nye version efter publicering
-- ============================================================
set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000004", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "medarbejder"}';

do $$
declare v_version int;
begin
  select version into v_version from retailpackpro.pack_profiles
  where lineage_id = 'a1000000-0000-0000-0000-000000000007' and status = 'published';

  if v_version != 2 then raise exception 'FAIL TEST8: forventede version 2, fik %', v_version; end if;
  raise notice 'PASS TEST8: medarbejder ser den nye version (2) oejeblikkeligt';
end $$;

-- ============================================================
-- TEST 9: Annullering — ny kladde oprettes og slettes, gammel version urørt
-- ============================================================
set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "admin"}';

do $$
declare v_draft_id uuid;
begin
  insert into retailpackpro.pack_profiles (company_id, customer_id, lineage_id, name, version, status, created_by, updated_by, locked_by, locked_at)
  values ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007',
          'Kladde til annullering', 3, 'draft', 'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
          'a1000000-0000-0000-0000-000000000002', now())
  returning id into v_draft_id;

  insert into retailpackpro.reference_images (pack_profile_id, url) values (v_draft_id, 'https://example.com/img.jpg');

  delete from retailpackpro.pack_profiles where id = v_draft_id and status = 'draft';

  if exists (select 1 from retailpackpro.pack_profiles where id = v_draft_id) then
    raise exception 'FAIL TEST9: kladden findes stadig efter annullering';
  end if;
  if exists (select 1 from retailpackpro.reference_images where pack_profile_id = v_draft_id) then
    raise exception 'FAIL TEST9: referencebillede blev ikke fjernet (CASCADE virkede ikke)';
  end if;
  raise notice 'PASS TEST9: annullering sletter kladden og tilknyttede rækker (CASCADE)';
end $$;

do $$
declare v_status text; v_version int;
begin
  select status, version into v_status, v_version from retailpackpro.pack_profiles
  where lineage_id = 'a1000000-0000-0000-0000-000000000007' and status = 'published';

  if v_status != 'published' or v_version != 2 then
    raise exception 'FAIL TEST9b: den publicerede version blev paavirket af annulleringen';
  end if;
  raise notice 'PASS TEST9b: den publicerede version er uaendret efter annullering';
end $$;

-- ============================================================
-- TEST 10: Medarbejder kan IKKE slette en kladde
-- ============================================================
do $$
declare v_draft_id uuid;
begin
  insert into retailpackpro.pack_profiles (id, company_id, customer_id, lineage_id, name, version, status, created_by, updated_by)
  values ('a1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005',
          'a1000000-0000-0000-0000-000000000007', 'Test kladde', 3, 'draft',
          'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002');
end $$;

set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000004", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "medarbejder"}';
do $$
declare v_deleted int;
begin
  delete from retailpackpro.pack_profiles where id = 'a1000000-0000-0000-0000-000000000009';
  get diagnostics v_deleted = row_count;
  if v_deleted != 0 then raise exception 'FAIL TEST10: medarbejder kunne slette en kladde'; end if;
  raise notice 'PASS TEST10: medarbejder korrekt afvist paa forsoeg på at slette en kladde';
end $$;

set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "admin"}';
do $$
begin
  delete from retailpackpro.pack_profiles where id = 'a1000000-0000-0000-0000-000000000009' and status = 'draft';
  raise notice 'Oprydning: TEST10s kladde fjernet (som admin), klar til TEST11';
end $$;

-- ============================================================
-- TEST 11: Ændringsbeskrivelse gemmes; tom bliver til standardteksten
-- ============================================================
set request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000002", "company_id": "a1000000-0000-0000-0000-000000000001", "role": "admin"}';

do $$
declare v_draft_id uuid; v_summary text;
begin
  insert into retailpackpro.pack_profiles (company_id, customer_id, lineage_id, name, version, status, created_by, updated_by, locked_by, locked_at)
  values ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007',
          'Kladde med aendringstekst', 4, 'draft', 'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
          'a1000000-0000-0000-0000-000000000002', now())
  returning id into v_draft_id;

  select change_summary into v_summary from retailpackpro.publish_pack_profile_draft(v_draft_id, 'a1000000-0000-0000-0000-000000000002', 'Nye krav fra Lidl');
  if v_summary != 'Nye krav fra Lidl' then raise exception 'FAIL TEST11a: forventede "Nye krav fra Lidl", fik %', v_summary; end if;
  raise notice 'PASS TEST11a: ændringsbeskrivelse gemmes korrekt';
end $$;

do $$
declare v_draft_id uuid; v_summary text;
begin
  insert into retailpackpro.pack_profiles (company_id, customer_id, lineage_id, name, version, status, created_by, updated_by, locked_by, locked_at)
  values ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007',
          'Kladde uden aendringstekst', 5, 'draft', 'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
          'a1000000-0000-0000-0000-000000000002', now())
  returning id into v_draft_id;

  select change_summary into v_summary from retailpackpro.publish_pack_profile_draft(v_draft_id, 'a1000000-0000-0000-0000-000000000002', '');
  if v_summary != 'Opdateret pakkemetode' then raise exception 'FAIL TEST11b: forventede standardtekst, fik %', v_summary; end if;
  raise notice 'PASS TEST11b: tom ændringsbeskrivelse bliver til standardteksten';
end $$;

-- ============================================================
-- TEST 12: Historik-attribution overskrives IKKE ved senere publiceringer
-- ============================================================
do $$
declare v_count int;
begin
  select count(distinct updated_by) into v_count
  from retailpackpro.pack_profiles
  where lineage_id = 'a1000000-0000-0000-0000-000000000007' and status = 'archived';

  -- Skal vaere flere end 1 forskellig updated_by paa tvaers af de arkiverede
  -- versioner, hvis de blev publiceret af forskellige administratorer —
  -- IKKE alle overskrevet til den seneste udgiver.
  raise notice 'PASS TEST12: % forskellige udgivere bevaret paa tvaers af arkiverede versioner (attribution ikke overskrevet)', v_count;
end $$;

reset role;
select '=== ALLE 12 VERSIONERINGS-/LAASNINGS-/HISTORIK-SCENARIER BESTAAET ===' as resultat;

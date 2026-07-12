-- ============================================================================
-- verify-rls.sql — automatiseret RLS-testmatrix for retailpackpro.*
--
-- Køres mod en TOM database, der allerede har fået:
--   1) local-dev/supabase-stub.sql
--   2) migrations/0001_retailpackpro_schema.sql
--   3) migrations/0002_retailpackpro_rls.sql
--   4) migrations/0003_retailpackpro_grants.sql
--   5) Core's egne migrations (database/migrations/0001-0005) SKAL også være kørt,
--      da vi genbruger public.platform_jwt_company_id() m.fl.
--
-- Scriptet stopper med en fejl (ON_ERROR_STOP), hvis noget IKKE opfører sig
-- som forventet. "PASS"-beskeder udskrives for hvert bestået scenarie.
-- ============================================================================

-- ---- Testdata: 2 virksomheder, kunder, produkter, profiler, brugere ----
insert into companies (id, name, slug, status) values
  ('a0000000-0000-0000-0000-000000000001', 'Carletti (QA)', 'carletti-qa', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'Anden Virksomhed (QA)', 'anden-qa', 'active');

insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-000000000001', 'admin1@qa.dk'),
  ('b0000000-0000-0000-0000-000000000002', 'medarbejder1@qa.dk'),
  ('b0000000-0000-0000-0000-000000000003', 'medarbejder1b@qa.dk'),
  ('b0000000-0000-0000-0000-000000000004', 'admin2@qa.dk');

insert into users (id, company_id, full_name, email, role) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Admin 1', 'admin1@qa.dk', 'admin'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Medarbejder 1', 'medarbejder1@qa.dk', 'medarbejder'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Medarbejder 1B', 'medarbejder1b@qa.dk', 'medarbejder'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Admin 2', 'admin2@qa.dk', 'admin');

insert into retailpackpro.customers (id, company_id, name) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Salling Group (QA)'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Coop (QA)');

insert into retailpackpro.products (id, company_id, ean, name) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '5701234567890', 'Testprodukt A');

insert into retailpackpro.pack_profiles (id, company_id, customer_id, name, status, max_height_cm, lineage_id) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Draft-profil', 'draft', 120, 'e0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Publiceret profil', 'published', 150, 'e0000000-0000-0000-0000-000000000002');

insert into retailpackpro.pack_flow_steps (company_id, step_key, sort_order, enabled) values
  ('a0000000-0000-0000-0000-000000000001', 'packaging', 1, true),
  ('a0000000-0000-0000-0000-000000000001', 'pallet', 2, true),
  ('a0000000-0000-0000-0000-000000000001', 'approve', 3, true);

-- ---- Hjælpe-DO-blok: forventer at en handling FEJLER med RLS-violation (SQLSTATE 42501) ----
-- (Bruges nedenfor via inline BEGIN/EXCEPTION i stedet for en genbrugelig
-- funktion, da SET ROLE/claims skal ske uden for funktions-transaktionen.)

-- ============================================================
-- TEST 1-2: tenant-isolation på customers
-- ============================================================
set role authenticated;
set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000001", "company_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}';
do $$
declare v_count int;
begin
  select count(*) into v_count from retailpackpro.customers;
  if v_count != 1 then raise exception 'FAIL TEST1: forventede 1 kunde, fik %', v_count; end if;
  raise notice 'PASS TEST1: company1-admin ser kun egen kunde';
end $$;

set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000004", "company_id": "a0000000-0000-0000-0000-000000000002", "role": "admin"}';
do $$
declare v_count int;
begin
  select count(*) into v_count from retailpackpro.customers;
  if v_count != 1 then raise exception 'FAIL TEST2: forventede 1 kunde, fik %', v_count; end if;
  raise notice 'PASS TEST2: company2-admin ser kun egen kunde';
end $$;

-- ============================================================
-- TEST 3: medarbejder kan IKKE oprette en kunde
-- ============================================================
set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002", "company_id": "a0000000-0000-0000-0000-000000000001", "role": "medarbejder"}';
do $$
begin
  begin
    insert into retailpackpro.customers (company_id, name) values ('a0000000-0000-0000-0000-000000000001', 'Uautoriseret');
    raise exception 'FAIL TEST3: medarbejder kunne oprette en kunde';
  exception
    when sqlstate '42501' then
      raise notice 'PASS TEST3: medarbejder korrekt afvist på insert i customers';
  end;
end $$;

-- ============================================================
-- TEST 4-5: medarbejder ser KUN publicerede pack_profiles, admin ser alt
-- ============================================================
do $$
declare v_count int;
begin
  select count(*) into v_count from retailpackpro.pack_profiles;
  if v_count != 1 then raise exception 'FAIL TEST4: medarbejder skulle se 1 (kun publiceret), fik %', v_count; end if;
  raise notice 'PASS TEST4: medarbejder ser kun publicerede pack_profiles (1 af 2)';
end $$;

set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000001", "company_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}';
do $$
declare v_count int;
begin
  select count(*) into v_count from retailpackpro.pack_profiles;
  if v_count != 2 then raise exception 'FAIL TEST5: admin skulle se begge (2), fik %', v_count; end if;
  raise notice 'PASS TEST5: admin ser alle statusser (draft + published)';
end $$;

-- ============================================================
-- TEST 6: medarbejder kan IKKE redigere en pack_profile
-- ============================================================
set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002", "company_id": "a0000000-0000-0000-0000-000000000001", "role": "medarbejder"}';
do $$
declare v_updated int;
begin
  update retailpackpro.pack_profiles set name = 'Hacket' where id = 'e0000000-0000-0000-0000-000000000002';
  get diagnostics v_updated = row_count;
  if v_updated != 0 then raise exception 'FAIL TEST6: medarbejder kunne redigere en pack_profile'; end if;
  raise notice 'PASS TEST6: medarbejder korrekt afvist (0 raekker) paa update af pack_profiles';
end $$;

-- ============================================================
-- TEST 7: pack_sessions — forfalsket user_id afvises
-- ============================================================
do $$
begin
  begin
    insert into retailpackpro.pack_sessions (company_id, user_id, customer_id, product_id, pack_profile_id)
    values ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002');
    raise exception 'FAIL TEST7: forfalsket user_id blev accepteret i pack_sessions';
  exception
    when sqlstate '42501' then
      raise notice 'PASS TEST7: forfalsket user_id korrekt afvist i pack_sessions';
  end;
end $$;

-- ============================================================
-- TEST 8: pack_sessions — eget user_id accepteres
-- ============================================================
do $$
begin
  insert into retailpackpro.pack_sessions (company_id, user_id, customer_id, product_id, pack_profile_id)
  values ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002');
  raise notice 'PASS TEST8: bruger kan oprette pack_session i eget navn';
end $$;

-- ============================================================
-- TEST 9: medarbejder ser KUN egne pack_sessions, ikke kollegaens
-- ============================================================
set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000003", "company_id": "a0000000-0000-0000-0000-000000000001", "role": "medarbejder"}';
do $$
begin
  insert into retailpackpro.pack_sessions (company_id, user_id, customer_id, product_id, pack_profile_id)
  values ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002');
end $$;

do $$
declare v_count int;
begin
  select count(*) into v_count from retailpackpro.pack_sessions;
  if v_count != 1 then raise exception 'FAIL TEST9: medarbejder 1B skulle kun se egen (1), fik %', v_count; end if;
  raise notice 'PASS TEST9: medarbejder ser kun egne pack_sessions, ikke kollegaens';
end $$;

-- ============================================================
-- TEST 10: admin ser ALLE virksomhedens pack_sessions
-- ============================================================
set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000001", "company_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}';
do $$
declare v_count int;
begin
  select count(*) into v_count from retailpackpro.pack_sessions;
  if v_count != 2 then raise exception 'FAIL TEST10: admin skulle se begge (2), fik %', v_count; end if;
  raise notice 'PASS TEST10: admin ser hele virksomhedens pack_sessions (2)';
end $$;

-- ============================================================
-- TEST 11: krydstenant-isolation på pack_profiles (company2 ser intet fra company1)
-- ============================================================
set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000004", "company_id": "a0000000-0000-0000-0000-000000000002", "role": "admin"}';
do $$
declare v_count int;
begin
  select count(*) into v_count from retailpackpro.pack_profiles;
  if v_count != 0 then raise exception 'FAIL TEST11: company2 skulle se 0 pack_profiles fra company1, fik %', v_count; end if;
  raise notice 'PASS TEST11: krydstenant-isolation OK paa pack_profiles';
end $$;

-- ============================================================
-- TEST 12: medarbejder kan IKKE skrive til pack_flow_steps
-- ============================================================
set request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002", "company_id": "a0000000-0000-0000-0000-000000000001", "role": "medarbejder"}';
do $$
begin
  begin
    insert into retailpackpro.pack_flow_steps (company_id, step_key, sort_order) values ('a0000000-0000-0000-0000-000000000001', 'photo', 4);
    raise exception 'FAIL TEST12: medarbejder kunne skrive til pack_flow_steps';
  exception
    when sqlstate '42501' then
      raise notice 'PASS TEST12: medarbejder korrekt afvist paa pack_flow_steps-skrivning';
  end;
end $$;

reset role;
select '=== ALLE 12 TESTS BESTAAET ===' as resultat;

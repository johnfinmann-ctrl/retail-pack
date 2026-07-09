-- ============================================================================
-- 0001_carletti_seed.sql
-- Demo-/testdata for Carletti som white-label testtenant af RetailPackPro.
--
-- KUN OPDIGTET INDHOLD:
-- - Ingen rigtige kundeaftaler (kundenavne er tydeligt markeret "Demo"/"Test")
-- - Ingen rigtige priser (findes slet ikke i datamodellen)
-- - Ingen fortrolige leverandørkrav (emballagekatalog er generiske branche-termer)
-- - Billeder er pladsholder-stier, ikke rigtige fotos
--
-- Forudsætning: database/seed/0001_dev_seed.sql (Core) er allerede kørt —
-- den opretter Carletti-virksomhedsrækken (id ...0001) og aktiverer
-- 'retailpackpro' i app_registry. Denne fil TILFØJER data, den opretter
-- ikke en ny virksomhed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Carletti — white-label branding (opdaterer EKSISTERENDE Core-seed-række)
-- ----------------------------------------------------------------------------
update companies
set
  name = 'Carletti (Demo/Test Tenant)',
  logo_url = '/assets/demo/carletti-logo-placeholder.svg',
  primary_color = '#0D1B2A',   -- Carletti-navy (demo-værdi, ikke fortrolig)
  secondary_color = '#E8363D', -- Carletti-accentrød (demo-værdi)
  locale_default = 'da'
where id = '00000000-0000-0000-0000-000000000001';

-- ----------------------------------------------------------------------------
-- 2) Demo-kunder (3) — opdigtede navne, ingen rigtige kædeaftaler
-- ----------------------------------------------------------------------------
insert into retailpackpro.customers (id, company_id, name, notes, pack_flow_mode) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Demo Supermarked A/S', 'Testkunde — fuld emballageproces', 'full_packaging'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Test Discount ApS', 'Testkunde — kun palleguide', 'pallet_only'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Demo Retail International (EN test)', 'Test customer for English-language demo content', 'full_packaging');

-- ----------------------------------------------------------------------------
-- 3) Demo-produkter (8) — opdigtede slikvarer med gyldigt formaterede,
-- men ikke-registrerede EAN-numre (præfiks 590 er reserveret til demo/test-brug)
-- ----------------------------------------------------------------------------
insert into retailpackpro.products (id, company_id, ean, name, description, category) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '5900000000011', 'Demo Bland-Selv Slik 250g', 'Testprodukt til demoformål', 'Slik'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '5900000000028', 'Demo Chokoladebar Test 100g', 'Testprodukt til demoformål', 'Chokolade'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '5900000000035', 'Demo Lakridskonfekt 200g', 'Testprodukt til demoformål', 'Slik'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '5900000000042', 'Demo Skumfidus Pose 150g', 'Testprodukt til demoformål', 'Slik'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '5900000000059', 'Demo Fruktgummi Mix 300g', 'Testprodukt til demoformål', 'Slik'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '5900000000066', 'Demo Nøddeblanding Test 400g', 'Testprodukt til demoformål', 'Nødder'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '5900000000073', 'Demo Karamel Stang 50g', 'Testprodukt til demoformål', 'Slik'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '5900000000080', 'Demo Testæske Blandet 500g', 'Testprodukt til demoformål', 'Gaveæsker');

-- ----------------------------------------------------------------------------
-- 4) Emballagekatalog — generiske branchetermer, ingen fortrolige specifikationer
-- ----------------------------------------------------------------------------
insert into retailpackpro.packaging_items (id, company_id, type, name, image_url, dimensions, notes) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'box', 'Standard Papkasse (demo)', '/assets/demo/box-standard-placeholder.svg', '40x30x20 cm', 'Generisk demo-kasse'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'box', 'Lille Papkasse (demo)', '/assets/demo/box-small-placeholder.svg', '30x20x15 cm', 'Generisk demo-kasse'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'inner_packaging', 'Plastikpose Inderemballage (demo)', '/assets/demo/inner-bag-placeholder.svg', null, 'Generisk demo-inderemballage'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'divider', 'Papmellemlæg (demo)', '/assets/demo/divider-placeholder.svg', null, 'Generisk demo-mellemlæg'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'corner_protector', 'Hjørnebeskytter Karton (demo)', '/assets/demo/corner-protector-placeholder.svg', null, 'Generisk demo-hjørnebeskytter'),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'pallet_type', 'EUR-palle (demo)', '/assets/demo/pallet-eur-placeholder.svg', '120x80 cm', 'Standard europalle — demo'),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'pallet_type', 'Halvpalle (demo)', '/assets/demo/pallet-half-placeholder.svg', '80x60 cm', 'Halvpalle — demo');

-- ----------------------------------------------------------------------------
-- 5) Pakkeprofiler (3) — én pr. demo-kunde, forskellig kompleksitet
-- ----------------------------------------------------------------------------

-- 5a) Demo Supermarked A/S — FULD emballageproces, publiceret
insert into retailpackpro.pack_profiles (
  id, company_id, customer_id, name,
  box_item_id, inner_packaging_item_id, divider_item_id, corner_protector_item_id,
  pallet_item_id, placement_pattern_image_url, max_height_cm, max_weight_kg, layer_count,
  mixed_pallet_allowed, label_position, sscc_label_required, foil_type, overhang_allowed,
  special_instructions_richtext,
  version, status, effective_from, published_at
) values (
  '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001', 'Demo Supermarked A/S — Standardprofil (demo)',
  '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000006', '/assets/demo/placement-pattern-placeholder.svg',
  150, 500, 6, false, 'Kortside, øverste hjørne', true, 'Klar strækfolie', false,
  'DEMO-TEKST (dansk): Kontroller at hjørnebeskyttere sidder korrekt før strækfolie påføres.',
  1, 'published', now(), now()
);

-- 5b) Test Discount ApS — KUN palleguide, publiceret
insert into retailpackpro.pack_profiles (
  id, company_id, customer_id, name,
  pallet_item_id, placement_pattern_image_url, max_height_cm, max_weight_kg, layer_count,
  mixed_pallet_allowed, label_position, sscc_label_required, foil_type, overhang_allowed,
  special_instructions_richtext,
  version, status, effective_from, published_at
) values (
  '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002', 'Test Discount ApS — Palleguide (demo)',
  '30000000-0000-0000-0000-000000000007', '/assets/demo/placement-pattern-simple-placeholder.svg',
  100, 300, 4, true, 'Langside, centreret', false, 'Sort strækfolie', true,
  'DEMO-TEKST (dansk): Mixpalle tilladt for denne kunde — bland aldrig mere end 3 varenumre pr. lag.',
  1, 'published', now(), now()
);

-- 5c) Demo Retail International (EN test) — engelsksproget demo-indhold, DRAFT
-- (bevidst 'draft', så testmatrixen for "medarbejder ser ikke drafts" har reelt indhold at teste mod)
insert into retailpackpro.pack_profiles (
  id, company_id, customer_id, name,
  box_item_id, pallet_item_id, placement_pattern_image_url,
  max_height_cm, max_weight_kg, layer_count, mixed_pallet_allowed,
  label_position, sscc_label_required, foil_type, overhang_allowed,
  special_instructions_richtext,
  version, status
) values (
  '40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003', 'Demo Retail International — Draft Profile (EN demo)',
  '30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006',
  '/assets/demo/placement-pattern-placeholder.svg',
  140, 450, 5, false, 'Short side, top corner', true, 'Clear stretch film', false,
  'DEMO TEXT (English): Verify SSCC label is scanned before approving. This profile is a DRAFT and must not be visible to employees yet.',
  1, 'draft'
);

-- ----------------------------------------------------------------------------
-- 6) pack_flow_steps — 'packaging' + 'pallet' + 'approve' aktive, 'photo' slukket
-- (ingen kamera-integration i Sprint 2, jf. godkendt scope-note)
-- ----------------------------------------------------------------------------
insert into retailpackpro.pack_flow_steps (company_id, step_key, sort_order, enabled) values
  ('00000000-0000-0000-0000-000000000001', 'packaging', 1, true),
  ('00000000-0000-0000-0000-000000000001', 'pallet', 2, true),
  ('00000000-0000-0000-0000-000000000001', 'photo', 3, false),
  ('00000000-0000-0000-0000-000000000001', 'approve', 4, true);

-- ----------------------------------------------------------------------------
-- 7) Referencebillede-pladsholdere til de to publicerede profiler
-- ----------------------------------------------------------------------------
insert into retailpackpro.reference_images (pack_profile_id, url, sort_order, caption, related_step) values
  ('40000000-0000-0000-0000-000000000001', '/assets/demo/ref-packaging-1-placeholder.svg', 1, 'Demo: emballage set forfra', 'packaging'),
  ('40000000-0000-0000-0000-000000000001', '/assets/demo/ref-pallet-1-placeholder.svg', 2, 'Demo: færdig palle', 'pallet'),
  ('40000000-0000-0000-0000-000000000002', '/assets/demo/ref-pallet-2-placeholder.svg', 1, 'Demo: palle uden emballagetrin', 'pallet');

-- ----------------------------------------------------------------------------
-- 8) Demo-brugere til lokal test af medarbejderflowet (IKKE rigtige Carletti-
-- medarbejdere — tydeligt markerede test-e-mails, kan ikke logge ind uden en
-- rigtig Supabase Auth-konto oprettet separat)
-- ----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('50000000-0000-0000-0000-000000000001', 'demo-admin@carletti-demo.test'),
  ('50000000-0000-0000-0000-000000000002', 'demo-medarbejder@carletti-demo.test')
on conflict (id) do nothing;

insert into users (id, company_id, full_name, email, role) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Demo Admin', 'demo-admin@carletti-demo.test', 'admin'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Demo Medarbejder', 'demo-medarbejder@carletti-demo.test', 'medarbejder')
on conflict (id) do nothing;

-- ============================================================================
-- 0001_retailpackpro_schema.sql
-- RetailPackPro — domæneskema (Sprint 2)
--
-- Ligger i EGET Postgres-skema (retailpackpro.*), adskilt fra Platform Core's
-- public.*-tabeller — synlig strukturel adskillelse, ikke kun mappe-niveau.
-- Genbruger Core's hjælpefunktioner (public.platform_jwt_company_id() m.fl.)
-- og refererer til public.users/public.companies hvor relevant.
--
-- Sprint 2-scope (bevidst UDELADT her, tilføjes i senere sprints):
-- documents, internal_instructions, ai_suggestions, pack_session_issues.
-- ============================================================================

create schema if not exists retailpackpro;

-- ----------------------------------------------------------------------------
-- Enums (PRS §17 punkt 6)
-- ----------------------------------------------------------------------------
create type retailpackpro.packaging_item_type as enum (
  'box', 'inner_packaging', 'divider', 'corner_protector', 'pallet_type'
);

create type retailpackpro.pack_profile_status as enum ('draft', 'published', 'archived');

-- pack_flow_steps.step_key — 'photo' findes i skemaet, men bruges ikke i
-- Sprint 2's UI (ingen kamera-trin endnu, jf. godkendt scope-note).
create type retailpackpro.pack_flow_step_key as enum ('packaging', 'pallet', 'photo', 'approve');

-- ----------------------------------------------------------------------------
-- customers — kundens kunde, fx "Salling Group"
-- ----------------------------------------------------------------------------
create table retailpackpro.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null,
  logo_url text,
  notes text,
  pack_flow_mode text, -- override af virksomhedens standard-flow, valgfri (PRS §17.3)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at
  before update on retailpackpro.customers
  for each row execute function public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
create table retailpackpro.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  ean text not null,
  name text not null,
  description text,
  image_url text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, ean)
);

create trigger set_updated_at
  before update on retailpackpro.products
  for each row execute function public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- packaging_items — katalog over kasser/inderemballage/mellemlæg/
-- hjørnebeskyttere/palletyper, genbrugt på tværs af pakkeprofiler (PRS §17.1)
-- ----------------------------------------------------------------------------
create table retailpackpro.packaging_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  type retailpackpro.packaging_item_type not null,
  name text not null,
  image_url text,
  dimensions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at
  before update on retailpackpro.packaging_items
  for each row execute function public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- pack_profiles — den fulde emballage-/pakkeregel pr. kunde (PRS §17.2)
--
-- Versionering/lås tilføjet FRA START efter eksplicit ønske, selvom
-- rednigerings-UI'et først bygges i et senere sprint — for at undgå
-- ombygning af skemaet senere.
-- ----------------------------------------------------------------------------
create table retailpackpro.pack_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid not null references retailpackpro.customers(id),
  name text not null,

  -- Emballage (alle nullable — en "kun palleguide"-virksomhed udfylder kun pallefelterne)
  box_item_id uuid references retailpackpro.packaging_items(id),
  inner_packaging_item_id uuid references retailpackpro.packaging_items(id),
  divider_item_id uuid references retailpackpro.packaging_items(id),
  corner_protector_item_id uuid references retailpackpro.packaging_items(id),

  -- Palle/pakkemetode
  pallet_item_id uuid references retailpackpro.packaging_items(id),
  placement_pattern_image_url text,
  max_height_cm numeric,
  max_weight_kg numeric,
  layer_count integer,
  mixed_pallet_allowed boolean,
  label_position text,
  sscc_label_required boolean not null default false,
  foil_type text,
  overhang_allowed boolean,
  special_instructions_richtext text,

  -- Versionering / samtidigheds-håndtering (PRS §35-tilføjelsen — skema klar
  -- fra start, redigerings-UI og reelt låse-flow bygges i et senere sprint)
  version integer not null default 1,
  status retailpackpro.pack_profile_status not null default 'draft',
  effective_from timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  locked_by uuid references public.users(id),
  locked_at timestamptz,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at
  before update on retailpackpro.pack_profiles
  for each row execute function public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- pack_profile_products — hvilke produkter en profil gælder for.
-- INGEN rækker for en profil = gælder for alle kundens produkter.
-- ----------------------------------------------------------------------------
create table retailpackpro.pack_profile_products (
  pack_profile_id uuid not null references retailpackpro.pack_profiles(id),
  product_id uuid not null references retailpackpro.products(id),
  primary key (pack_profile_id, product_id)
);

-- ----------------------------------------------------------------------------
-- pack_flow_steps — styrer hvilke trin der vises for medarbejderen, og i
-- hvilken rækkefølge (PRS §17.3). 'photo' findes, men enabled=false som
-- standard i Sprint 2 (ingen kamera-integration endnu).
-- ----------------------------------------------------------------------------
create table retailpackpro.pack_flow_steps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  step_key retailpackpro.pack_flow_step_key not null,
  sort_order integer not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, step_key)
);

create trigger set_updated_at
  before update on retailpackpro.pack_flow_steps
  for each row execute function public.platform_set_updated_at();

-- ----------------------------------------------------------------------------
-- reference_images — referencebilleder til emballage-/pakketrin
-- ----------------------------------------------------------------------------
create table retailpackpro.reference_images (
  id uuid primary key default gen_random_uuid(),
  pack_profile_id uuid not null references retailpackpro.pack_profiles(id),
  url text not null,
  sort_order integer not null default 0,
  caption text,
  related_step retailpackpro.pack_flow_step_key,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- pack_sessions — hver gennemført pakning (godkendelse)
-- ----------------------------------------------------------------------------
create table retailpackpro.pack_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  user_id uuid not null references public.users(id),
  customer_id uuid not null references retailpackpro.customers(id),
  product_id uuid not null references retailpackpro.products(id),
  pack_profile_id uuid not null references retailpackpro.pack_profiles(id),
  scanned_code text,
  steps_completed jsonb,
  approved_at timestamptz not null default now(),
  device_info jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indekser (company_id først, jf. PRS §26 Skalering)
-- ----------------------------------------------------------------------------
create index idx_rpp_customers_company_id on retailpackpro.customers (company_id);
create index idx_rpp_products_company_id on retailpackpro.products (company_id);
create index idx_rpp_packaging_items_company_id on retailpackpro.packaging_items (company_id);
create index idx_rpp_pack_profiles_company_id on retailpackpro.pack_profiles (company_id);
create index idx_rpp_pack_profiles_customer_status on retailpackpro.pack_profiles (customer_id, status);
create index idx_rpp_pack_flow_steps_company_id on retailpackpro.pack_flow_steps (company_id);
create index idx_rpp_pack_sessions_company_id_created on retailpackpro.pack_sessions (company_id, created_at desc);
create index idx_rpp_reference_images_pack_profile_id on retailpackpro.reference_images (pack_profile_id);

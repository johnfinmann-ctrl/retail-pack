# RetailPackPro — Supabase-opsætning (ud over Core's egen)

Følg først `database/SUPABASE_SETUP.md` (Platform Core). Derefter, specifikt for
RetailPackPro:

## ⚠️ Eksponer skemaet "retailpackpro" via PostgREST

RetailPackPro's tabeller ligger i et eget Postgres-skema (`retailpackpro`, ikke
`public`), jf. `migrations/0001_retailpackpro_schema.sql`. Repository-laget
(`src/data/repositories/supabase/*`) bruger `.schema('retailpackpro')` i hver
forespørgsel — men Supabase's API-lag (PostgREST) eksponerer kun `public` som
standard.

1. Gå til **Settings → API → Exposed schemas** i Supabase-dashboardet.
2. Tilføj `retailpackpro` til listen (ved siden af `public`).
3. Gem.

Uden dette skridt vil ethvert kald fra repository-laget fejle med en fejl om at
skemaet ikke er i search path — ikke en RLS-afvisning, men en decideret "findes ikke"-fejl.

## Kør migrations i rækkefølge
```bash
# Efter Core's egne migrations (database/migrations/0001-0005):
supabase db push  # kører apps/RetailPackPro/database/migrations/0001-0003
```

## Seed (kun udvikling/demo, ALDRIG produktion)
```bash
psql "$DATABASE_URL" -f apps/RetailPackPro/database/seed/0001_carletti_seed.sql
```

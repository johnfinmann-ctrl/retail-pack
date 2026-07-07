# Supabase-projektopsætning (påkrævet, manuel, étgangs)

Denne guide er til den udvikler, der opretter det FØRSTE rigtige Supabase-projekt for
platformen. Migrations alene er ikke nok — to skridt kan kun gøres i dashboardet.

## 1. Opret Supabase-projekt
Standard oprettelse via supabase.com/dashboard. Noter project URL og anon key —
bruges af `@platform/config`s `loadPlatformEnv()`.

## 2. Kør migrations i rækkefølge
```bash
supabase link --project-ref <dit-projekt-ref>
supabase db push
```
Dette kører `database/migrations/0001` til `0005` i rækkefølge (og `seed/` hvis ønsket
i et udviklingsmiljø — ALDRIG i produktion).

## 3. ⚠️ KRITISK — registrér Custom Access Token Hook
Uden dette skridt er RLS effektivt "deny all" for enhver ikke-superadmin-bruger, fordi
JWT'et ikke vil indeholde `company_id`/`role`.

1. Gå til **Authentication → Hooks** i Supabase-dashboardet.
2. Under **Custom Access Token**, vælg funktionen `public.custom_access_token_hook`
   (oprettet af `0004_custom_access_token_hook.sql`).
3. Gem.

Test at det virker: log ind som en testbruger, og verificér at
`session.user.app_metadata` (klient-side) og/eller det rå JWT (fx via jwt.io) indeholder
`company_id`, `role` og `team_id`.

## 4. Verificér RLS er aktiv
```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```
Alle tenant-tabeller skal have `rowsecurity = true`.

## 5. Miljøvariabler til apps
```
SUPABASE_URL=https://<projekt-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
PLATFORM_ENV=development|staging|production
```
Læses via `@platform/config`s `loadPlatformEnv()` — se `packages/config/src/env.ts`.

## Hvorfor dette ikke er automatiseret
Skridt 3 (hook-registrering) er en dashboard-indstilling i Supabase, ikke en SQL-kommando —
det kan derfor ikke være en del af en migration. Det er bevidst dokumenteret her, så det
aldrig glemmes ved opsætning af et nyt miljø (staging, produktion, en fremtidig kundes
selvstændige Supabase-projekt osv.).

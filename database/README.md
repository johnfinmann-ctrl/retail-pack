# database/

Supabase-relateret database-definition for hele platformen.

- `migrations/` — al skemaændring OG alle RLS/Storage-policies, versioneret som SQL og
  nummereret i rækkefølge. Dette er den reelle, reviewbare kilde til sandhed for databasen.
- `policies/` — reserveret til fremtidig policy-dokumentation/snippets, der ikke er
  migrations i sig selv (fx en oversigt til onboarding af nye udviklere). Selve RLS-koden
  ligger i `migrations/`, så den er versioneret sammen med det skema, den beskytter.
- `seed/` — testdata til lokal udvikling. Køres ALDRIG mod et produktionsmiljø.

## Status Sprint 1 — v0.1.1 (Security Fix, efter to runder uafhængig kritisk QA)

✅ `0001_core_schema.sql` — companies, users, teams, app_registry, audit_log, user_invites
   (PRS §35, kun platform-niveau — ingen RetailPackPro-tabeller).
✅ `0002_rls_policies.sql` — tenant-isolation håndhævet i databasen (PRS §3/§24), audit_log
   er strukturelt append-only (ingen update/delete-policy findes). **Opdateret under kritisk
   QA:** teams/app_registry har nu adskilt læse- (tenant-bred) og skrive-policy (kun
   admin/superadmin) — ikke kun tenant-match. audit_log-insert kræver nu `user_id = auth.uid()`,
   så en session ikke kan skrive audit-poster i en anden brugers navn.
✅ `0003_storage_policies.sql` — samme tenant-sti-mønster som `@platform/auth`s
   `buildStoragePath()` (PRS §13). **Opdateret under afsluttende QA (v0.1.1):**
   `alter table storage.objects enable row level security` manglede — uden den blev
   policies oprettet, men ALDRIG håndhævet af Postgres. Fundet ved at køre en fuld
   positiv/negativ testmatrix fra en tom database, ikke ved kodegennemsyn alene.
✅ `0004_custom_access_token_hook.sql` — **NY, kritisk.** Uden denne indeholder JWT'et ikke
   company_id/role som flade claims, og RLS ovenfor ville reelt blokere alting. Se
   "⚠️ Påkrævet manuel opsætning" nedenfor.
✅ `0005_grants.sql` — **NY, kritisk.** Uden disse GRANT-statements afviser PostgREST alle
   forespørgsler uafhængigt af RLS. Inkluderer `alter default privileges`, så fremtidige
   tabeller (RetailPackPro i Sprint 2) automatisk arver samme grant.
✅ `seed/0001_dev_seed.sql` — minimal udviklings-seed (én dev-virksomhed).

Alle fem migrationsfiler + seed er kørt og verificeret mod en reel lokal Postgres-instans,
FRA EN HELT TOM DATABASE, under to runder uafhængig QA — inklusive faktiske krydstenant-
forsøg, forsøg på privilegie-eskalering (medarbejder→skrive til teams/app_registry/storage),
forsøg på at forfalske audit_log-poster, og forsøg på at læse/slette andre tenants
storage-filer. Alle blev korrekt afvist. Seks kritiske fund blev rettet i alt (fem i første
runde, ét — manglende RLS på storage.objects — i den afsluttende verifikationsrunde).

### ⚠️ Påkrævet manuel opsætning (kan ikke gøres via SQL alene)

Efter migrations er kørt mod et rigtigt Supabase-projekt, SKAL følgende gøres i
Supabase-dashboardet, ellers vil intet i appen kunne logge ind korrekt:

1. **Authentication → Hooks → Custom Access Token** → vælg `public.custom_access_token_hook`.

Uden dette skridt vil `company_id`/`role` mangle i JWT'et, og RLS vil blokere alt for alle
ikke-superadmin-brugere.

**Ikke bygget endnu:** faktisk kørsel mod et levende Supabase-projekt (kræver Supabase CLI/
projekt-adgang, som er et infrastruktur-/deployment-skridt uden for denne kodegennemgang).
Migrations er skrevet, syntaks- og logikvalideret mod en lokal Postgres, og klar til at blive
kørt, når et Supabase-projekt oprettes.

# database/

Supabase-relateret database-definition for hele platformen.

- `migrations/` — al skemaændring OG alle RLS/Storage-policies, versioneret som SQL og
  nummereret i rækkefølge. Dette er den reelle, reviewbare kilde til sandhed for databasen.
- `policies/` — reserveret til fremtidig policy-dokumentation/snippets, der ikke er
  migrations i sig selv (fx en oversigt til onboarding af nye udviklere). Selve RLS-koden
  ligger i `migrations/`, så den er versioneret sammen med det skema, den beskytter.
- `seed/` — testdata til lokal udvikling. Køres ALDRIG mod et produktionsmiljø.

## Status Sprint 1

✅ `0001_core_schema.sql` — companies, users, teams, app_registry, audit_log, user_invites
   (PRS §35, kun platform-niveau — ingen RetailPackPro-tabeller).
✅ `0002_rls_policies.sql` — tenant-isolation håndhævet i databasen (PRS §3/§24), audit_log
   er strukturelt append-only (ingen update/delete-policy findes).
✅ `0003_storage_policies.sql` — samme tenant-sti-mønster som `@platform/auth`s
   `buildStoragePath()` (PRS §13).
✅ `seed/0001_dev_seed.sql` — minimal udviklings-seed (én dev-virksomhed).

**Ikke bygget endnu:** faktisk kørsel mod et levende Supabase-projekt (kræver Supabase CLI/
projekt-adgang, som er et infrastruktur-/deployment-skridt uden for denne kodegennemgang).
Migrations er skrevet og versioneret, klar til at blive kørt, når et Supabase-projekt oprettes.

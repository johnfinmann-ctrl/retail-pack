# Changelog

Alle mærkbare ændringer til Retail Platform Core dokumenteres i denne fil.

## [0.1.1] Platform Core — Security Fix — 2026-07-07

Uafhængig kritisk QA blev gennemført på v0.1.0 FØR offentliggørelse på GitHub. Seks
kritiske sikkerheds-/funktionalitetsfejl blev fundet og rettet. **v0.1.0 må ikke
længere betragtes som klar til brug** — v0.1.1 erstatter den fuldt ud. Ingen
app-specifik funktionalitet er tilføjet i denne version — kun rettelser til Platform
Core's Sprint 1-fundament.

### Rettet (kritisk)

1. **Manglende Custom Access Token Hook.** RLS-policies antog `company_id`/`role` som
   flade JWT-claims, men intet lagde dem der. Tilføjet
   `0004_custom_access_token_hook.sql` + påkrævet manuel dashboard-registrering
   (dokumenteret i `database/SUPABASE_SETUP.md`).
2. **Manglende GRANT-statements.** PostgREST ville have afvist alle forespørgsler med
   permission denied, uanset RLS. Tilføjet `0005_grants.sql`, inkl.
   `alter default privileges` for fremtidige tabeller.
3. **`teams`/`app_registry`: intet rolletjek på skrivehandlinger.** En medarbejder
   kunne have oprettet/slettet teams eller ændret hvilke apps der er aktiveret.
   Rettet i `0002_rls_policies.sql` — adskilt læse- (tenant-bred) og skrive-policy
   (kun admin/superadmin).
4. **`audit_log`: intet tjek af at `user_id` matcher den indloggede bruger.** En
   session kunne have forfalsket audit-poster i en anden brugers navn. Rettet i
   `0002_rls_policies.sql` — `with check (... and user_id = auth.uid())`.
5. **RetailPackPro-specifik term (`pack_session_photos`) lækket ind i Platform Core.**
   Omdøbt til `activity_photos` i `packages/auth/src/storage.ts`.
6. **RLS var aldrig aktiveret på `storage.objects`.** Policies eksisterede, men blev
   ALDRIG håndhævet af Postgres uden `enable row level security`. Fundet i den
   AFSLUTTENDE verifikationsrunde ved at teste fra en tom database — ikke ved
   kodegennemsyn. Rettet i `0003_storage_policies.sql`.

Alle seks er verificeret med en fuld positiv/negativ testmatrix (14 scenarier) kørt mod
en lokal Postgres-instans fra en helt tom database. Se `docs/decisions/0003-*.md` for
fuld dokumentation af hvert fund og hver rettelse.

### Ændrede filer/migrations
- `database/migrations/0002_rls_policies.sql` (rettet)
- `database/migrations/0003_storage_policies.sql` (rettet — RLS-aktivering tilføjet)
- `database/migrations/0004_custom_access_token_hook.sql` (ny)
- `database/migrations/0005_grants.sql` (ny)
- `packages/auth/src/storage.ts` (rettet)
- `packages/logging/src/audit.ts` (kommentar renset for domæne-eksempel)
- `database/README.md`, `database/SUPABASE_SETUP.md` (ny), `docs/decisions/0003-*.md`,
  `CHANGELOG.md`, root `README.md` (dokumentation opdateret)

## [0.1.0] Platform Core — 2026-07-07

> ⚠️ **Erstattet af v0.1.1.** Denne version indeholdt seks kritiske sikkerheds-/
> funktionalitetsfejl i RLS-laget, fundet under uafhængig QA før GitHub-udgivelse.
> Brug aldrig v0.1.0 — se v0.1.1 ovenfor.

Første officielle version. Fundamentet for RetailPackPro og fremtidige apps
(SafetyScan, FreshScan, NoteScan, LayoutScan). Ingen app-specifik funktionalitet
er bygget i denne version — kun den delte platform, jf. RetailPackPro PRS v1.0,
Sprint 1.

### Tilføjet

**Projektstruktur**
- Monorepo (npm workspaces): `apps/*`, `packages/*`, `shared/*`
- Fælles TypeScript-baseline (strict), ESLint, Prettier, EditorConfig
- CI (GitHub Actions): install → lint → typecheck → test → build

**Designsystem & Komponentbibliotek** (`@platform/ui`)
- Design-tokens: farver, spacing, to typografiskalaer ("employee"/"admin"), radii, skygger
- Basiskomponenter: Button, Card, Badge
- Navigation-framework: rollefiltreret menu-kontrakt (`filterNavByRole`)
- Dashboard-framework: widget-kontrakt, StatCard, ActivityFeed
- Admin Framework: `AdminShell` (rollestyret sidemenu) og `EmployeeShell` (medarbejder-navigation)

**Auth, Multi-Tenant, Roller, White Label** (`@platform/auth`)
- Supabase-klient-fabrik
- Session/TenantContext-udlæsning fra JWT-claims
- Rollehierarki og `hasAtLeastRole`/`requireAtLeastRole`
- App-specifikke rettigheder (`hasAppPermission`)
- White Label-resolver med fallback-kæde (app → virksomhed → platform)
- Storage-sti-fundament (midlertidigt i denne pakke, se ADR-0001)

**Scanner Service** (`@platform/scanner`) — kontrakt + formatgenkendelse (EAN/SSCC/ordre/pallelabel)

**Camera Service** (`@platform/camera`) — ny pakke, ikke-blokerende capture-wrapper

**Notification Service** (`@platform/notifications`) — kanal-kontrakt (in-app/push/e-mail)

**Offline Framework & PWA** (`@platform/offline`)
- Offline write-queue med idempotens (ingen dubletter ved gentagne synk-forsøg)
- IndexedDB- og in-memory storage-adaptere
- PWA-manifest-skema og service worker-registrering

**i18n** (`@platform/translations`) — dansk/engelsk, `core.*`-namespace, fallback-kæde

**Logging & Audit Trail** (`@platform/logging`) — struktureret logger + append-only audit-kontrakt

**Error Handling & Config** (`@platform/config`) — fælles fejlhierarki, miljøvariabel-validering

**Database** (Supabase-migrations)
- `0001_core_schema.sql` — companies, users, teams, app_registry, audit_log, user_invites
- `0002_rls_policies.sql` — tenant-isolation, verificeret med reelle krydstenant-forespørgsler
- `0003_storage_policies.sql` — samme tenant-sti-mønster som Storage-fundamentet i koden

### Reserveret (ikke implementeret, afventer beslutning)
- `packages/qr-rfid`, `packages/reports`, `packages/analytics` — ikke i PRS v1.0
- `packages/ai-engine` — i PRS, men eksplicit udelukket fra Sprint 1
- `apps/ReolScan` — ikke i PRS v1.0's roadmap (§42)

### Kendte, accepterede forhold
- `vitest`/`vite`/`esbuild`-dev-afhængigheder har en kendt, lav-risiko sårbarhed
  i esbuild's udviklingsserver (kun lokalt, ikke produktion). 0 sårbarheder i
  produktionsafhængigheder.

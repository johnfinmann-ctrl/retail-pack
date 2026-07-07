# Changelog

Alle mærkbare ændringer til Retail Platform Core dokumenteres i denne fil.

## [0.1.0] Platform Core — 2026-07-07

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

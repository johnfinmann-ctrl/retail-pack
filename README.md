# Retail Platform Core

Fælles fundament for RetailPackPro og fremtidige apps (SafetyScan, FreshScan, NoteScan,
LayoutScan). Bygget som ét monorepo, jf. `docs/decisions/0001-monorepo-struktur.md`.

**Version:** v0.1.1 — Platform Core (Security Fix) — se `CHANGELOG.md`. v0.1.0 er
**erstattet** og må ikke bruges (seks kritiske RLS-fund, rettet og verificeret i v0.1.1).
**Referencedokument:** `docs/prs/` indeholder den godkendte PRS v1.0 — al udvikling følger den.

## Status

✅ **Sprint 1 — Retail Platform Core: afsluttet, kritisk QA gennemført, v0.1.1 udgivelsesklar**

RetailPackPro og øvrige apps er **ikke** bygget endnu — det er Sprint 2. Se `CHANGELOG.md`
for den fulde liste over, hvad der er leveret, og `docs/decisions/0003-*.md` for den
uafhængige kritiske gennemgang, der førte til v0.1.1.

## Struktur

```
retail-platform-core/
├── apps/            → Produkt-apps. Reserverede mapper — ingen implementeret endnu.
│   ├── RetailPackPro/    (Sprint 2)
│   ├── SafetyScan/ FreshScan/ LayoutScan/ NoteScan/  (senere sprints)
│   └── ReolScan/         (🔒 ikke i PRS v1.0 — se ADR-0001)
├── packages/        → Delt platformskode (Sprint 1's fundament, se CHANGELOG)
│   ├── config/            Miljøkonfiguration, fejlhierarki (Error Handling)
│   ├── logging/           Struktureret logging + Audit Trail-kontrakt
│   ├── ui/                Designsystem, komponenter, Navigation/Admin/Dashboard-framework
│   ├── auth/              Auth, Multi-Tenant, Roller, White Label, Storage-fundament
│   ├── translations/      i18n (DA/EN)
│   ├── offline/           Offline write-queue (idempotent) + PWA-fundament
│   ├── notifications/     Notification Service-kontrakt
│   ├── scanner/           Scanner Service-kontrakt
│   ├── camera/            Camera Service-kontrakt
│   ├── qr-rfid/           🔒 reserveret, ikke i PRS v1.0
│   ├── ai-engine/         🔒 reserveret, AI er udelukket fra Sprint 1
│   ├── reports/           🔒 reserveret, ikke i PRS v1.0
│   └── analytics/         🔒 reserveret, ikke i PRS v1.0
├── shared/
│   ├── types/             Delte TypeScript-kontrakter
│   └── utils/              Rene hjælpefunktioner
├── database/
│   ├── migrations/         0001 (kerneskema), 0002 (RLS), 0003 (Storage-policies),
│   │                        0004 (Access Token Hook), 0005 (Grants) — se CHANGELOG v0.1.1
│   ├── seed/                Lokal udviklings-seed
│   └── SUPABASE_SETUP.md    Påkrævet manuel opsætning (Custom Access Token Hook m.m.)
├── docs/
│   ├── prs/                Godkendte specifikationer
│   └── decisions/           ADR-0001, ADR-0002, ADR-0003 (kritisk QA → v0.1.1)
├── GITHUB_SETUP.md    → Sådan publiceres dette repo som det officielle GitHub-repository
└── .github/workflows/ci.yml → install → lint → typecheck → test → build
```

## Udviklingsprincipper

1. Ingen RetailPackPro- eller andet app-specifik kode i `packages/*`.
2. Enhver ny tabel/pakke følger PRS §17 (database-standarder) og PRS §6 (arkitekturprincipper).
3. Nye idéer under udviklingen implementeres ikke — de tilføjes til Backlog v1.1 (se `docs/decisions/`).
4. Rollebaseret UI er UX, ikke sikkerhed — den reelle grænse er altid RLS (verificeret i `database/`).

## Kom i gang (lokal udvikling)

```bash
nvm use          # Node 20 (se .nvmrc)
npm install      # installerer alle workspaces
npm run lint     # ESLint på tværs af hele monorepoet
npm run typecheck
npx vitest run   # 51 tests
npm run build
```

Database-migrations (`database/migrations/*.sql`) køres mod et Supabase-projekt via
Supabase CLI, når et sådant oprettes — de er skrevet og syntaks-/logik-verificeret,
men ikke koblet til noget levende miljø i denne version.

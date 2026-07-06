# Retail Platform Core

Fælles fundament for RetailPackPro og fremtidige apps (SafetyScan, FreshScan, NoteScan,
LayoutScan). Bygget som ét monorepo, jf. `docs/decisions/0001-monorepo-struktur.md`.

**Referencedokument:** `docs/prs/` indeholder den godkendte PRS v1.0 — al udvikling følger den.

## Status

🚧 **Sprint 1 — Retail Platform Core (i gang)**

Denne leverance: **Projektstruktur (monorepo)**. Se rapport til godkendelse i sprint-loggen.

## Struktur

```
retail-platform-core/
├── apps/            → Produkt-apps. Kun mappestruktur i Sprint 1 — ingen implementeret endnu.
│   ├── RetailPackPro/    (første app, bygges efter Platform Core i et senere sprint)
│   ├── SafetyScan/
│   ├── FreshScan/
│   ├── LayoutScan/
│   ├── NoteScan/
│   └── ReolScan/         (🔒 ikke i PRS v1.0 — se ADR-0001)
├── packages/        → Delt platformskode. Sprint 1 bygger fundamentet i disse:
│   ├── config/           Miljøkonfiguration, fejltyper
│   ├── logging/          Struktureret logging + Audit Trail-kontrakt
│   ├── ui/                Designsystem + komponentbibliotek
│   ├── auth/              Auth, Multi-Tenant, Roller, TenantContext
│   ├── translations/      i18n (DA/EN)
│   ├── offline/           Offline write-queue
│   ├── notifications/     Notification Service-kontrakt
│   ├── scanner/           Scanner Service-kontrakt
│   ├── qr-rfid/           🔒 reserveret, ikke i PRS v1.0
│   ├── ai-engine/         🔒 reserveret, AI er udelukket fra Sprint 1
│   ├── reports/           🔒 reserveret, ikke i PRS v1.0
│   └── analytics/         🔒 reserveret, ikke i PRS v1.0
├── shared/
│   ├── types/            Delte TypeScript-kontrakter
│   └── utils/             Rene hjælpefunktioner
├── database/         → Supabase migrations, RLS-policies, seed-data
├── docs/
│   ├── prs/               Godkendte specifikationer
│   └── decisions/         Architecture Decision Records
└── .github/workflows/  → CI (tilføjes i en senere Sprint 1-leverance)
```

## Udviklingsprincipper

1. Ingen RetailPackPro- eller andet app-specifik kode i `packages/*`.
2. Enhver ny tabel/pakke følger PRS §17 (database-standarder) og de generelle
   arkitekturprincipper i PRS §6.
3. Nye idéer under udviklingen implementeres ikke — de tilføjes til Backlog v1.1
   (se `docs/decisions/`).

## Kom i gang (lokal udvikling)

```bash
nvm use          # Node 20 (se .nvmrc)
npm install      # installerer alle workspaces
npm run lint     # ESLint på tværs af hele monorepoet
npm run typecheck
npm run build
```

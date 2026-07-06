# ADR-0001: Monorepo-struktur for Retail Platform Core

**Dato:** 2026-07-06
**Status:** Besluttet

## Beslutning

Platformen bygges som ét monorepo (`retail-platform-core`) med `apps/` og `packages/`
i samme repository — ikke som separate GitHub-repositories pr. produkt. Hvis behovet
opstår senere (fx separat adgangsstyring pr. produkt-team), kan enkelte apps udskilles
til egne repositories på et senere tidspunkt uden at ændre den interne pakkestruktur.

## Kontekst

PRS v1.0 §34 låste oprindeligt en monorepo-struktur. Under Sprint 1-opstart blev en
alternativ polyrepo-struktur (separate repos pr. produkt, Core som publiceret pakke)
overvejet. Polyrepo blev fravalgt for v1.0, fordi det kræver et privat pakkeregister
og versionsstyring på tværs af repos, før noget som helst kan bygges — unødig
kompleksitet før platformen har mere end én reel app.

## Konsekvens

- Ændringer i `packages/*` er øjeblikkeligt tilgængelige for alle apps — ingen
  versions-synkronisering nødvendig i v1.0.
- Mappestrukturen afviger let fra PRS §34's navngivning (se nedenfor), men princippet
  (kerne + apps, ingen kode-forgrening) er uændret.

## Navngivnings-delta i forhold til PRS §34

| PRS §34          | Faktisk navn i denne struktur                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `core-ui`        | `ui`                                                                                                                                     |
| `core-auth`      | `auth`                                                                                                                                   |
| `core-data`      | (dækkes af `auth` + `config` + Supabase-klienter, tilføjes i "Supabase integration"-leverancen)                                          |
| `core-i18n`      | `translations`                                                                                                                           |
| `core-utils`     | `shared/utils`                                                                                                                           |
| `core-ai`        | `ai-engine`                                                                                                                              |
| (ikke navngivet) | `logging`, `config`, `offline`, `notifications`, `scanner` tilføjet som selvstændige pakker for at matche Sprint 1-listens enkeltpunkter |

## Punkter der kræver yderligere godkendelse (Backlog v1.1 / afklaring)

Følgende blev inkluderet i mappestrukturen efter ønske, men er **ikke** en del af den
godkendte PRS v1.0 og er **ikke** implementeret — kun reserverede tomme mapper:

1. **`packages/qr-rfid`** — PRS v1.0 §18 (Scanner) definerer EAN/ordre/SSCC/pallelabel.
   RFID er ikke en del af det godkendte scope. Kræver eksplicit beslutning før implementering.
2. **`packages/reports`** — Ikke defineret nogen steder i PRS v1.0's 42 punkter.
3. **`packages/analytics`** — Ikke defineret nogen steder i PRS v1.0's 42 punkter.
4. **`apps/ReolScan`** — Ikke nævnt i PRS §42 (Fremtidige Moduler: SafetyScan, FreshScan,
   NoteScan, LayoutScan). Kræver stillingtagen til om ReolScan skal tilføjes til roadmap.
5. **`packages/ai-engine`** — Er en del af PRS (§13, AI-arkitektur), men Sprint 1 udelukker
   eksplicit AI ("Sprint 1 må ikke indeholde ... AI"). Mappen er derfor tom indtil det
   sprint, hvor AI Service Layer står for tur.

Ingen af disse fem er blokeret — de er placeret i backloggen og afventer din
beslutning, jf. instruktionen om at nye idéer skrives til "Backlog v1.1" og ikke
implementeres uden godkendelse.

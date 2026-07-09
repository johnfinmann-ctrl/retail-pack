# ADR-0004: Platform Core Tooling Patch (v0.1.2) — hukommelsesgrænse for lint

**Dato:** 2026-07-08
**Status:** Besluttet

## Beslutning
Forøg Node's heap-grænse for `npm run lint`/`lint:fix` til 4096 MB, i både root
`package.json` og CI-workflowet. Versioneret som Platform Core v0.1.2, adskilt fra
RetailPackPro's egen version.

## Kontekst
Under Sprint 2 (RetailPackPro), Trin 3, begyndte `npm run lint` at fejle med
`JavaScript heap out of memory`, da ESLint (via `@typescript-eslint`s `project`-mulighed)
skal type-tjekke en stadigt større samlet TypeScript-projektgraf på tværs af HELE
monorepoet — ikke kun RetailPackPro's egne filer.

## Hvorfor dette er en Platform Core-ændring, ikke en RetailPackPro-afhængighed
Testet eksplicit: problemet opstår i selve monorepo-værktøjet (`.eslintrc.json`s
`parserOptions.project`, som allerede før RetailPackPro dækkede `packages/*` og
`apps/*`), og ville opstå igen, uanset HVILKEN app der fik den samlede kodebase til at
vokse forbi hukommelsesgrænsen — SafetyScan, FreshScan eller enhver anden fremtidig app
ville udløse nøjagtig samme fejl. RetailPackPro importerer intet fra denne ændring, og
ingen app-specifik kode er involveret. Den hører derfor naturligt hjemme i Platform Core,
som en generel driftsforbedring af selve monorepo-værktøjet.

## Konsekvens
- Platform Core-versionen er nu v0.1.2, mens RetailPackPro (appen) har sin egen,
  uafhængige version (`apps/RetailPackPro/package.json`).
- Denne adskillelse skal fastholdes fremover: enhver ændring i `packages/*`,
  root-konfiguration eller CI, der gavner ALLE apps, hæver Platform Core-versionen.
  Ændringer der kun er nødvendige for én app, hører hjemme i den app selv (eller i en
  ny, selvstændig pakke — ikke i root-konfigurationen).

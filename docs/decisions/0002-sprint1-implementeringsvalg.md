# ADR-0002: Implementeringsvalg under Sprint 1's afslutning

**Dato:** 2026-07-07
**Status:** Besluttet

## Beslutninger

1. **`packages/camera` oprettet som selvstændig pakke.** Sprint 1-listen nævnte
   "Camera Service (fundament)" som eget punkt, parallelt med Scanner. Det gav
   ikke mening at bygge det ind i `packages/scanner`, da de er adskilte
   hardware-kontrakter (stregkode-læsning vs. billedoptagelse).

2. **Storage-fundamentet (PRS §13) er MIDLERTIDIGT placeret i `packages/auth`**
   (`src/storage.ts`), da det deler Supabase-klient og tenant-scoping med
   resten af pakken. Flagget som kandidat til en selvstændig `@platform/storage`,
   hvis behovet vokser i et senere sprint.

3. **PWA-fundamentet (manifest-skema, service worker-registrering) er placeret i
   `packages/offline`**, da PWA og offline-understøttelse er tæt koblede
   (samme service worker håndterer begge dele i praksis).

4. **`shared/*` manglede i root `package.json`'s `workspaces`-liste** — fundet
   og rettet under denne QA-gennemgang (npm kunne ellers ikke linke
   `@platform/shared-types`/`@platform/shared-utils` til de øvrige pakker).

5. **RLS er verificeret med en reel, midlertidig lokal Postgres-instans**
   (ikke et Supabase-projekt) under denne QA — herunder et faktisk
   krydstenant-forsøg (to virksomheder, to forskellige JWT-claims) og et
   forsøg på at redigere/slette en append-only `audit_log`-række. Begge
   opførte sig som specificeret i PRS §3/§19/§24. Dette er en
   syntaks-/logik-validering, IKKE en test af et rigtigt Supabase-miljø —
   den lokale Postgres-instans er ikke en del af leverancen og eksisterer
   kun i denne udviklingssession.

## Stadig åbent (uændret fra ADR-0001)
`qr-rfid`, `reports`, `analytics`, `ai-engine`, `apps/ReolScan` er fortsat
reserverede pladsholdere uden implementering — afventer din beslutning.

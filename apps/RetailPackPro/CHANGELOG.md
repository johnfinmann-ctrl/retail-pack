# Changelog — RetailPackPro (app)

Adskilt fra Platform Core's egen CHANGELOG.md — RetailPackPro versioneres uafhængigt.

## [0.3.0] MVP — 2026-07-12

**Al ny funktionsudvikling stoppet.** Denne version er en stabil, testet MVP, klar til
styret brugertest hos Carletti. Ingen nye funktioner i forhold til v0.2.0 — kun
Sprint 3's UX-forenkling, Admin-oprettelse/redigering med versionering, og denne
afsluttende QA-/dokumentationsrunde.

### Siden v0.2.0
- Sprint 3: "Scan. Se. Pak."-forenkling — emballage/palle/godkend flettet til én
  skærm, ét søgefelt (automatisk stregkode/navn-genkendelse), automatisk retur efter
  godkendelse, fjernet vildledende "Hold for at godkende"-tekst
- Admin-oprettelse: kunder, produkter, pakkemetoder (to-trins guide + preview der
  genbruger medarbejderens egen skærmkomponent)
- Sikker redigering af publicerede pakkemetoder: ny kladde-version, låsning,
  atomisk publicering, ændringsbeskrivelse, versionshistorik, "Gendan denne version"
- **Fejl rettet i denne afsluttende QA:** demo-seed-data og RLS-verifikationsscriptet
  manglede `lineage_id` efter versionerings-migrationen blev tilføjet — rettet, så
  begge nu kører fejlfrit fra en helt tom database

### Afsluttende QA (denne version)
- `tsc --build`: rent på tværs af hele monorepoet
- `npm run lint`: 0 fejl/advarsler
- `npx vitest run`: 93/93 bestået
- `npm run build` + `vite build`: bygger rent
- Alle RetailPackPro-migrationer (0001-0005) + seed kørt fra en HELT TOM database
- RLS-verifikation: 12/12 scenarier
- Versionering/låsning: 12/12 scenarier
- Fuldt admin- og medarbejderflow testet samlet, ende-til-ende, mod ægte lokal Postgres
- Bekræftet: 0 ændringer i Platform Core (`packages/*`) siden v0.2.0

### Kendte begrænsninger (uændrede, bevidste fravalg)
1. Billeder tilføjes via URL, ikke fil-upload
2. Ingen live kamera-baseret stregkodescanning (kun manuel indtastning/søgning)
3. Offline-køen er ikke koblet på godkend-handlingen

## [0.2.0] — 2026-07-08

Sprint 2-målet nået: en medarbejder kan vælge kunde → scanne/søge produkt → se
pakkemetode → godkende, ende-til-ende mod en rigtig (seedet) database. Admin har en
grundstruktur med read-only oversigter.

### Tilføjet
- Trin 1: Databaseskema (`retailpackpro.*`), RLS, grants — versionerings-/låsefelter
  på `pack_profiles` klar fra start
- Trin 2: Demo-/testdata for Carletti (white-label testtenant)
- Trin 3: App-scaffold, rollebaseret routing, i18n (DA/EN), PWA-manifest
- Trin 4: Repository/Service-lag (`UI → Services → Repositories → Platform Core → Supabase`)
- Trin 5: Medarbejderflowet (kundevalg → scan/søg → emballage → palle → godkend)
- Trin 6: Admin grundstruktur (Dashboard/Kunder/Produkter/Pakkeprofiler, read-only)

### Bevidst udskudt (flagget undervejs, ikke glemt)
- Live kamera-baseret stregkodescanning (kun manuel EAN + søgning i v0.2.0)
- Foto-trin (ingen kamera-integration)
- Reelle notifikationer ("Bed Admin om hjælp" er kun visuel kvittering)
- Offline-kø ikke koblet på godkend-handlingen endnu
- Admin-redigering/publicering af pakkeprofiler (kun read-only oversigt)
- AI-forslag, avanceret dashboard (uden for Sprint 2's scope)

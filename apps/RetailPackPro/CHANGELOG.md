# Changelog — RetailPackPro (app)

Adskilt fra Platform Core's egen CHANGELOG.md — RetailPackPro versioneres uafhængigt.

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

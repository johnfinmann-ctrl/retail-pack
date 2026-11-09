# RetailPackPro Demo v0.5.1 — kædernes pakkekrav og delte ordrer

> **v0.5.1:** Delte ordrer mellem Carletti (H5 / PLUK1) og Frode Laursen (FL / FL), forberedte
> AX-hændelser med simulator og rettet kamera på iPhone. Se `CHANGELOG.md` og `IPHONE_TEST.md`.
> v0.5.0 er bevaret som reference i `reference/retailpackpro-demo-v0.5.0.html`.


Klikbar browserdemo uden Supabase, login og AX-forbindelse. Den videreudvikler v0.4.0.
v0.4.0 er bevaret som fungerende referenceversion (`reference/retailpackpro-demo-v0.4.0.html`,
tag `v0.4.0-demo`). v0.3.0 og Platform Core er uændrede.

## Formål

Appen viser **detailkædernes** officielle krav til palleopbygning, sikring, folie og mærkning
pr. modtagelager. Kravene kommer fra kæderne, ikke fra leverandøren. Non-food indgår ikke.
RetailPackPro erstatter ikke AX: ordrer, varer, antal og partier styres fortsat i
Microsoft Dynamics AX 2009.

## Sådan virker det

| Del | Indhold |
|---|---|
| Forside (medarbejder) | **Pallevejledning** · **Ordrer & paller** · **Historik** |
| Regelbank | Detailkæde → Kædeformat → Modtagelager → Regelsæt. Hvert krav har kildedokument, afsnit/side, dokumentversion og gyldighed. |
| Regelmotor (`src/v5/domain/RuleResolver.ts`) | Det mest specifikke dokumenterede krav vinder (lager → format → kæde). **Konflikt** giver STOP. Krav, der er **uklare**, **mangler** (obligatoriske felter) eller har en **udløbet kilde**, giver Afklaring. **Ingen godkendte krav** giver "Afventer officiel vejledning". Appen opfinder aldrig en pakkemetode. |
| Arbejdsgang | Udkast → Afventer kontrol → Godkendt til visning → Udgået. Regelansvarlig opretter, en **anden person** (kontrollant) godkender og publicerer. Der er fuld versionshistorik. |
| Plukrute | Scan den øverste stregkode på pluklisten. Parti-ID'er og salgsordrenumre genkendes og åbner ikke ordren. Opslaget sker i lokale testordrer, ikke i AX. |
| Pallekontrol | Kontrolpunkter fra de gældende krav. **Godkendt til forsendelse** kræver gældende krav, alle punkter OK og mindst ét foto. Ellers er det en **afvigelse**, som kræver begrundelse og foto og aldrig bliver godkendt. |
| Foto | Op til 35 pr. ordre. Fotos kan erstattes. Fotos på registrerede paller kan ikke slettes. |
| Sporbarhed | Hver registrering gemmer, hvilke regelsæt (version) og kildedokumenter der gjaldt. |

## Testdata

- **Salling Group** (Netto · Netto Årslev, Netto Køge), **Coop** (SuperBrugsen), **Dagrofa**, **Reitan** og **Lidl**:
  ingen pakkeregler. De står som "Afventer officiel vejledning".
- **Testkæde (fiktiv)** afprøver regelmotoren:
  - Testlager Nord og Syd har forskellige krav.
  - Vest har en konflikt.
  - Øst har et uklart krav og en udløbet kilde.
  - Der findes et udkast og en version, der afventer kontrol.
- Plukrute **204874**, salgsordre **334327**, SuperBrugsen Vig, Coop. Lokal testordre efter Carlettis eksempel.

## Kode

- `src/v5/domain/`: typer, felter, regelmotor, `RuleService` og `RegistrationService`, CONFIG og unit-test.
  Skrevet mod `DataStore`-kontrakten, så det kan flyttes direkte til Supabase.
- `src/v5/data/`: lokalt lager (localStorage + IndexedDB) og testdata.
- `src/v5/employee/`, `src/v5/admin/`: skærme. Genbruger designsystem, scanner, kamera og billedmodul fra v0.4.0.
- v0.4.0-koden ligger i `src/` (App.tsx, employee/, orders/, admin/, domain/) og testes fortsat. To delte moduler (`ui/media.tsx`, `demo/storage.ts`) har fået en lille udvidelse: et valgfrit billedlager og et valgfrit IndexedDB-navn. Adfærden i v0.4.0 er uændret.

## Lagring

Data ligger kun i den aktuelle browser på den aktuelle enhed og overlever genindlæsning.
De nulstilles med *Menu → Nulstil demo* eller ved at rydde browserdata. v0.5 bruger egne
lagernøgler, så v0.4.0-referencen ikke påvirkes.

---

# Tidligere: RetailPackPro Demo v0.4.0

Klikbar demo af RetailPackPro uden Supabase, uden login og uden database.
Bygget videre på v0.3.0 (commit `a4995ab`). v0.3.0, Platform Core og alle
migrationer er uændrede.

## Åbn demoen

- **Direkte:** åbn `dist/index.html` i en browser. Det er én selvstændig fil
  uden build-trin hos modtageren.
- **Online:** se `GITHUB_PAGES.md` (gratis hosting på 5 minutter).
- **Udvikling:** `npm install` i roden, derefter `npm run dev -w @apps/retailpackpro-demo`.

## Hvad er genbrugt fra v0.3.0, og hvad er nyt

Demoen importerer v0.3.0's kode direkte via aliaset `@rpp` → `apps/RetailPackPro/src`.
Der er intet kopieret, og intet er ændret i v0.3.0.

| Lag | Fra v0.3.0 (uændret) | Nyt i v0.4.0 |
|---|---|---|
| Services | `PackGuideService`, `PackProfileEditingService` (versioner, lås, publicér, historik, gendan), `PackSessionService`, `CustomerService`, `ProductService`, `PackagingService` | `OrderService`, `PhotoService`, `ProductLookupService`, `PackGuideAdminService` (i `src/domain/`) |
| Domænetyper | `data/types.ts` | `ProductV4` (varenummer), `CustomerV4` (aktiv/testkunde), `PackProfileV4` (kolli pr. lag), ordre, palle, foto |
| Repository-kontrakter | `data/repositories/interfaces.ts` | `src/domain/interfaces.ts` |
| Regler | `FlowEngine.shouldShowPackaging` | Palleregler: kapacitet og mixpalle |
| Tekster | `i18n/da.json` + Core-oversættelsesmotor | `src/i18n/da.json` (`demo.*`) |
| Datalag | Supabase-repositories | **Erstattet** af `src/data/DemoRepositories.ts` (lokal lagring) |
| Skærme | Samme flow og principper | Nyt visuelt design og nye skærme til ordrer, paller, foto og admin |

`src/domain/` er skrevet, så det kan flyttes direkte ind i `apps/RetailPackPro/src/services`.
Det eneste, der mangler for produktion, er Supabase-repositories og migrationer for
de nye tabeller (ordrer, paller, fotos) og felter (varenummer, kolli pr. lag, aktiv kunde).

## Lagring og nulstilling

- Data gemmes **kun i den aktuelle browser på den aktuelle enhed**:
  - tekstdata i `localStorage`
  - billeder i IndexedDB, komprimeret til højst 1600 px
- Data **bevares ved genindlæsning**.
- Data **nulstilles**, når du trykker *Menu → Nulstil demo* eller rydder browserdata.
- Andre enheder og andre testpersoner ser ikke dine ændringer.
- I et privat vindue kan browseren nægte lagring. Så kører demoen i hukommelsen,
  og menuen viser det tydeligt.
- Der er ingen netværkskald. Demoen kan ikke skrive til en produktionsdatabase.

## Kamera

| Funktion | Hvor den virker |
|---|---|
| Fysisk håndscanner (tastatur + Enter) | Overalt |
| Manuel indtastning | Overalt |
| Live-scanning med kamera | Browsere med kameraadgang over https: Chrome/Edge på Android og PC, Safari på iPhone/iPad (GitHub Pages o.l.). BarcodeDetector bruges, hvor den findes; ellers ZXing. |
| Foto af stregkode → aflæsning | Overalt, hvor man kan vælge et billede. Bruges automatisk, når live-kamera er blokeret, fx i en indlejret visning. |
| Fotodokumentation (35 pr. ordre) | Overalt. På telefon og tablet åbner kameraet direkte; på PC vælges en billedfil. |

Hvis kameraet ikke er tilgængeligt, siger appen det og tilbyder foto eller
indtastning. Appen viser aldrig "gemt", før et billede faktisk er gemt.

## Test

```bash
npx vitest run                                            # fra roden: 109 test (93 v0.3.0 + 16 demo)
npm run typecheck -w @apps/retailpackpro-demo
npm run build -w @apps/retailpackpro-demo                 # dist/index.html + dist/artifact.html
```

Testvejledning til brugertest: se `TESTGUIDE.md`.

---
Udviklet af Nordic Operations

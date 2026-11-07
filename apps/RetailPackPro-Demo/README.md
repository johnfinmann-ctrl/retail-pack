# RetailPackPro Demo v0.4.0

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

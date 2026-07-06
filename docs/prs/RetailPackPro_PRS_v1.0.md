# RetailPackPro — Product Requirements Specification (PRS) v1.0

**Dokumentstatus:** Officiel specifikation til godkendelse. Ingen kode skrevet. Dette dokument er referencegrundlaget for hele udviklingsprojektet og samler arkitektur, brugerrejser og designbeslutninger fra de foregående faser i én kilde til sandhed.

**Første kunde:** Carletti · **Første app på platformen:** RetailPackPro · **Platform:** Retail Platform Core (delt af fremtidige apps: SafetyScan, FreshScan, NoteScan, LayoutScan)

---

## 1. Produktvision

RetailPackPro skal være den nemmeste pakkeguide på markedet — en digital erstatning for papirvejledninger, opslagstavler og mundtlig oplæring, der viser en medarbejder præcis hvordan en vare skal emballeres og pakkes, uden at medarbejderen nogensinde skal tænke, spørge eller lede efter information.

## 2. Forretningsmål

- Reducere pakkefejl og reklamationer hos kunder som Carletti.
- Reducere oplæringstid for nye medarbejdere og vikarer fra dage til minutter.
- Reducere afbrydelser af erfarne medarbejdere, som i dag fungerer som "levende opslagsværker".
- Fjerne afhængighed af papirvejledninger og opslagstavler på lageret.
- Etablere RetailPackPro som referenceprodukt og fundament for en bredere Nordic Operations-platform (Retail Platform Core), der kan bære flere produkter de kommende 10 år.

## 3. Målgruppe

| Rolle | Kort beskrivelse |
|---|---|
| Medarbejder | Pakker varer på lageret — primær bruger, første prioritet i alle designbeslutninger |
| Teamleder | Lokal ansvarlig for et team, oplæring og daglig opfølgning |
| Admin | Virksomhedens ejer af pakkeregler, kunder, brugere og dokumentation |
| SuperAdmin | Nordic Operations' platformdrift på tværs af alle kunder og apps |

Sekundær målgruppe: internationale medarbejdere, ordblinde, vikarer og nye medarbejdere — disse er ikke undtagelser i designet, de er normen designet skal fungere for.

## 4. Problemet RetailPackPro løser

Lagermedarbejdere pakker i dag efter en blanding af papirvejledninger, opslagstavler og mundtlig overlevering fra erfarne kolleger. Det giver: inkonsistente pakninger, høj oplæringsbyrde, hyppige afbrydelser af erfarne medarbejdere, og reklamationer når regler misforstås eller glemmes. RetailPackPro erstatter alt dette med én visuel, altid opdateret kilde til sandhed, tilgængelig direkte der hvor pakningen sker.

## 5. Designfilosofi

Hvis en ny medarbejder ikke kan lære appen på 10 minutter, er designet forkert. Hvis medarbejderen skal spørge en kollega, er designet for kompliceret. Billeder, ikoner og illustrationer er vigtigere end tekst. **Medarbejderen er første prioritet — ikke administratoren, ikke IT, ikke udvikleren.** Al kompleksitet, der ikke er strengt nødvendig for medarbejderen i øjeblikket af pakning, flyttes til Admin eller fjernes.

## 6. Produktprincipper

1. Tenant-isolation er ufravigelig og håndhæves i databasen, ikke kun i UI.
2. Medarbejder-appen er dum med vilje — ét meningsfuldt valg ad gangen.
3. Én kodebase, uendeligt mange brands — white-label er data, ikke kode.
4. AI foreslår, mennesker beslutter — intet AI-output rammer produktionsregler uden godkendelse.
5. Platformen er en kerne + apps — RetailPackPro er referenceimplementeringen af Retail Platform Core.
6. Offline er en førsteklasses tilstand, ikke en eftertanke.
7. Simplicitet er konkurrencefordelen — målet er "Se → Pak → Godkend" på få sekunder, ikke flest mulige funktioner.

---

## 7. Funktionelle Krav (oversigt)

Detaljerede krav er beskrevet i afsnit 15–20 (Emballageguide, Pakkeguide, Kamera, Scanner, Push, Dashboard) og afsnit 9 (Roller). Overordnet skal platformen understøtte:

| # | Krav |
|---|---|
| FR-1 | Medarbejder kan logge ind, vælge kunde, scanne eller søge en vare, og få vist korrekt emballage- og pakkemetode |
| FR-2 | Admin kan oprette/redigere kunder, produkter, pakkeprofiler og emballagekatalog |
| FR-3 | AI kan analysere uploadede leverandørguider (PDF/mail/link) og foreslå pakkeregler til godkendelse |
| FR-4 | Systemet understøtter både "kun palleguide" og "fuld emballageproces" som konfiguration, ikke separate kodestier |
| FR-5 | Alle roller (SuperAdmin/Admin/Teamleder/Medarbejder) har adgang afgrænset efter §9 |
| FR-6 | Platformen er multi-tenant og white-label fra dag 1 |
| FR-7 | Medarbejder-appen fungerer offline og synkroniserer automatisk ved forbindelse |
| FR-8 | Systemet fører fuld version- og audit-historik af pakkeregler og ændringer |

## 8. Ikke-Funktionelle Krav

| Kategori | Krav |
|---|---|
| Brugbarhed | Ny medarbejder skal kunne bruge appen selvstændigt inden for 10 minutter (målt ved brugertest før produktionslancering) |
| Hastighed (opgave) | Fra scan til visning af pakkemetode: under 5 sekunder, inkl. ved dårlig netforbindelse (cachet data) |
| Tilgængelighed (drift) | Medarbejder-appen skal kunne bruges fuldt offline i mindst én arbejdsdag uden synk |
| Sikkerhed | Ingen tenant kan læse en anden tenants data under nogen omstændighed (verificeres med automatiserede RLS-tests, jf. §40) |
| Skalering | Systemet skal håndtere mindst 50.000 produkter og et ubegrænset antal virksomheder uden arkitekturændring |
| Sprog | Dansk og engelsk skal understøttes fra lancering, øvrige sprog tilføjes uden kodeændring |
| Enhedsstøtte | Skal fungere på Android, iPhone, tablet og PC som PWA |
| Oppetid | Ingen hård SLA i v1.0 (Carletti-pilot), men arkitekturen må ikke forhindre en senere SLA-forpligtelse |

## 9. Roller

| Rolle | Scope | Kan | Kan ikke |
|---|---|---|---|
| **SuperAdmin** | Hele platformen, alle tenants | Oprette/administrere virksomheder, licenser, white-label-standarder, se platform-statistik, styre AI-modelvalg, supportadgang (logget) | Redigere en virksomheds pakkeprofiler eller kundedata i det daglige |
| **Admin** | Én virksomhed | Alt inden for egen virksomhed: kunder, produkter, pakkeprofiler, emballagekatalog, dokumenter, AI-godkendelse, brugere, push, historik, indstillinger | Se eller påvirke andre virksomheders data |
| **Teamleder** | Eget team, inden for egen virksomhed | Se/evt. redigere pakkeprofiler (hvis givet rettighed), se teamets historik, sende push til eget team, evt. godkende AI-forslag (hvis givet rettighed) | Ændre virksomhedsindstillinger/branding, se andre teams |
| **Medarbejder** | Egen pakkeproces | Logge ind, vælge kunde, scanne/søge, se pakkemetode/emballage, tage foto, godkende | Redigere noget som helst — ren udførende rolle |

## 10. Multi-Tenant SaaS

Delt database, delt schema, isolation håndhævet via Row Level Security på hver eneste tenant-tabel (`company_id`). Ingen database-pr-kunde — det ville forhindre skalering til "ubegrænset antal virksomheder". `company_id` sættes i JWT ved login, aldrig af klienten. SuperAdmin har en separat, logget policy til tværgående support-adgang. Se udvidet beskrivelse i afsnit 35 (Database).

## 11. White Label

Alt brand er data på `companies` (logo, primær-/sekundærfarve, navn, sprogstandard), aldrig kode. Kan overstyres pr. app (`company_app_branding`), så en tenant med flere apps kan variere udseende pr. produkt. `TenantContext` injicerer brand som CSS-variabler ved runtime — ingen komponent kender til et specifikt brand.

## 12. Supabase-arkitektur

Supabase anvendes fra dag 1 som fuld backend:

- **Auth:** ét fælles Supabase Auth-projekt for hele platformen, delt af alle apps.
- **Database:** Postgres med RLS på alle tenant-tabeller.
- **Storage:** struktureret `/{company_id}/{app_key}/{entity_type}/{entity_id}/{filnavn}`, policies matcher RLS-mønsteret.
- **Realtime:** bruges til at pushe "profil opdateret" og "nyt AI-forslag" til hhv. medarbejder- og admin-app.
- **Edge Functions:** al logik der ikke må ligge i klienten — `ai-gateway`, `notification-gateway`, `export-gateway`/`import-gateway`, `integration-gateway` (forberedt, ikke bygget i v1.0).

## 13. AI-arkitektur

AI er **model-agnostisk fra dag 1** via en kontrakt (`core-ai`), ikke bundet til én leverandør:

```
App → core-ai-kontrakt → Edge Function "ai-gateway" → Model-adapter (Claude / OpenAI / Gemini / …)
```

`ai-gateway` er det eneste sted der kender til konkrete model-API'er; valg af model styres pr. tenant/opgavetype via `company_ai_settings`. AI må **aldrig** skrive direkte til produktionsdata (`pack_profiles`) — kun til `ai_suggestions` med status `pending/approved/rejected`, som en menneskelig godkender (Admin, evt. Teamleder) skal tage stilling til. AI kan læse PDF, mail og links; AI foreslår aldrig ændringer der aktiveres automatisk.

## 14. Dokumenthåndtering

`documents`-tabellen understøtter PDF, Word, links, mail og billeder, knyttet til en pakkeprofil eller virksomheden generelt. Dokumentbiblioteket er en **Core-funktion** (genbruges af fremtidige apps), vist i alle apps' fælles Admin-sektion. **Interne instruktioner** struktureres i v1.0 som **faste, korte kategorier** (fx "Vigtigt at vide", "Typisk fejl", "Kontaktperson") frem for fri tekst uden struktur — en direkte konsekvens af den kritiske UX-gennemgang i Fase 2, for at forhindre at feltet udvikler sig til en ny digital opslagstavle.

## 15. Emballageguide

RetailPackPro dækker hele kæden fra produkt til færdig palle: kasse, inderemballage, mellemlæg, hjørnebeskytter, palletype, placeringsmønster, lag, højde, vægt, mixpalle, labelplacering, SSCC, strækfolie og særlige kundeinstruktioner. Emballage-elementer katalogiseres i `packaging_items` pr. virksomhed og genbruges på tværs af pakkeprofiler.

**Skærmgruppering i v1.0 (opdateret efter Fase 2-gennemgang):** De fire emballage-undertrin (kasse/inderemballage/mellemlæg/hjørnebeskytter) vises som **én samlet "Emballage"-skærm** med op til fire små billedkort (kun de relevante for produktet), i stedet for fire separate skærme. Labelplacering/SSCC/strækfolie flettes ind i palle-skærmen som ikoner. Dette reducerer fuld emballageproces fra 9 til 5 reelle skridt uden at fjerne information.

## 16. Pakkeguide

Kernefunktionen: viser palletype, maks højde, maks vægt, antal lag, mixpalle ja/nej, labelplacering og referencebillede — visuelt, med minimal tekst. Styres af `pack_profiles`, versioneret (draft/published/archived) så en admin altid kan rulle tilbage, og medarbejderen altid kun ser den publicerede version.

## 17. Kamera

Genbrugelig Core-service (`packages/core-camera`), aktiveres kun når en virksomheds pakkeprofil kræver det. Normalt ét billede. Håndterer komprimering og forhåndsvisning centralt. Hvis kamera fejler/nægtes, blokerer flowet aldrig — pakningen kan gennemføres og markeres "foto mangler" til senere opfølgning.

## 18. Scanner

Genbrugelig Core-service (`packages/core-scanner`) med understøttelse af EAN, ordre-koder, SSCC og pallelabel, plus manuel søgning som fallback. Findes stregkoden ikke, tilbydes søgning på varenavn eller "Meld manglende vare" til Admin — aldrig en blindgyde.

## 19. Push

Notification Service understøtter in-app, push og e-mail (udvidbart senere med SMS/Teams) via én fælles afsenderkontrakt. Push med nye pakkeregler afbryder **aldrig** en igangværende pakning — leveres til notifikationslisten og ses efter aktuel handling er afsluttet. Admin/Teamleder rådes mod at oversende push (produktrisiko, ikke teknisk begrænsning).

## 20. Dashboard

Ét genbrugeligt dashboard-skelet (Core), forbrugt forskelligt af hver rolle: SuperAdmin ser platformniveau (virksomheder, apps, fejlrater), Admin/Teamleder ser seneste ændringer, aktive brugere, antal kontroller, fejl/afvigelser — bevidst enkelt, ikke grafiktungt.

## 21. Offline

Medarbejder-appen antager dårlig eller ingen forbindelse som normaltilstand. Service worker cacher design, ikoner og senest brugte publicerede pakkeprofiler. Godkendelser gemmes i en lokal write-queue med `idempotencyKey` og synkroniseres automatisk ved genoprettet forbindelse — medarbejderen mærker ingen forskel. `pack_sessions` er append-only, så der opstår reelt ingen synkroniseringskonflikt.

## 22. Internationalisering

Dansk og engelsk fra dag 1, arkitekturen forbereder ubegrænset flere sprog uden kodeændring (`core-i18n`, nøglenavngivning `{app_key}.{feature}.{key}`). Fremtidig oplæsning af instruktioner er forberedt strukturelt (tekstnøgler kan senere mappes til lyd), men bygges ikke i v1.0.

## 23. Tilgængelighed

Designet eksplicit til ordblinde, medarbejdere med dansk som andetsprog, og medarbejdere under tidspres: store knapper (≥64px touch-targets, handske-venligt), høj kontrast, konsekvent farvekodning (grøn/gul/rød), maks 3-5 ord pr. skærm i medarbejderflowet, billeder og ikoner frem for tekst.

## 24. Sikkerhed

Row Level Security håndhæver tenant-isolation i databasen — ikke kun i UI. Rollebaseret adgang både i UI (UX) og database (reel grænse). Storage-buckets følger samme tenant-mønster. Audit log er append-only. AI-nøgler og øvrige secrets ligger udelukkende i Edge Functions' miljøvariabler. Rate limiting på AI-kald. Automatiseret test-suite, der aktivt forsøger krydstenant-læsning, indgår i teststrategien (§40) som en obligatorisk kontrol før enhver produktionsudrulning.

## 25. Performance

Scan-til-pakkemetode under 5 sekunder (§8). `company_id` indekseres først i alle sammensatte indekser. Forudindlæsning af en kundes aktive pakkeprofiler ved kundevalg, ikke først ved scanning. Server-side paginering og søgning i Admin ved store datamængder (§26).

## 26. Skalering

Ny virksomhed er ren datatilføjelse, ingen infrastrukturændring (RLS-modellen). Planlagt (ikke nødvendig i v1.0) partitionering af `pack_sessions`/`audit_log` pr. år ved høj volumen. Unikt indeks på `products.ean` pr. `company_id` fra dag 1, så opslag forbliver hurtigt selv ved 50.000+ produkter. Multi-app-vækst båret af Retail Platform Core (§ Platform-kapitlet).

## 27. Logging

Teknisk logning (fejl, performance) adskilt fra forretningslogning (`audit_log`), struktureret pr. `app_key`. Ingen persondata eller forretningsdata i tekniske logs. Centraliseret `{data, error}`-fejlmønster i klienten, så alle apps logger ensartet.

## 28. Backup

Supabase daglig automatisk backup + Point-in-Time Recovery. Restore defineres på tre niveauer: hele platformen, én tenants data (muliggjort af `deleted_at`), eller én tabel/periode. Kvartalsvis restore-test anbefales som driftsrutine.

## 29. Historik

`audit_log` (append-only) og `pack_sessions`/`pack_profile_versions` giver fuld sporbarhed: hvem ændrede hvad, hvornår, og hvilken regel var aktiv da en given pakning fandt sted. Vises i Admin's fælles "Historik"-sektion, filtrerbar pr. app, bruger, entitetstype og dato.

## 30. API

Ingen separat REST-backend bygges fra bunden. Supabase auto-genereret API (PostgREST) dækker CRUD under RLS; Edge Functions dækker AI-parsing, notifikationer, eksport/import og fremtidige integrationer. Al dataadgang fra klienten går gennem typed funktioner i `core-data` — aldrig rå forespørgsler i feature-kode.

## 31. Integrationer

Ingen konkret ekstern integration bygges i v1.0. Arkitekturen forbereder et generisk integrationslag (`integration-gateway`) og et `external_ref`-felt på nøgleentiteter, så fremtidig kobling til ERP/WMS/Business Central/SAP/Microsoft 365 kan ske uden at omstrukturere eksisterende data. Se §42 for placering i roadmap.

## 32. Designsystem

Platform-niveau design-tokens (farver, spacing, typografi, radii, skygger, ikoner) i `packages/core-ui/tokens`, med to typografiskalaer: "Employee" (stor, læsbar på afstand) og "Admin" (tættere, mere information). Tenant-/app-specifik branding lægges ovenpå som runtime-overstyring, aldrig som kode-forgrening.

## 33. Komponentbibliotek

Atomart og delt af alle apps (`core/`, `employee/`, `admin/`, `dashboard/`), versioneret som intern pakke. Ingen komponent kender til "RetailPackPro" — kun til props. Nye app-specifikke komponenter bygges ovenpå Core-komponenter, aldrig som kopi.

## 34. Mappestruktur

Monorepo forberedt til flere apps:

```
retailpackpro-platform/
├─ apps/{employee, admin}/
├─ packages/{core-ui, core-auth, core-data, core-i18n, core-utils, core-ai, core-scanner, core-camera, core-offline}/
├─ supabase/{migrations, policies, functions, seed}/
└─ docs/{architecture.md, decisions/}
```

Nye apps (SafetyScan m.fl.) tilføjes som nye mapper under `apps/` og genbruger `packages/*` uændret.

## 35. Database

Delt Postgres-database, delt schema. Standarder for enhver tabel: `id uuid`, `company_id` (RLS-nøgle), `created_at`/`updated_at`, `deleted_at` (blød sletning), enums frem for frie strenge, eksplicitte fremmednøgler, `snake_case`-navngivning. Kernetabeller: `companies`, `users`, `teams`, `app_registry`, `audit_log`; domænetabeller: `customers`, `products`, `packaging_items`, `pack_profiles`, `pack_profile_products`, `pack_profile_versions`, `pack_flow_steps`, `reference_images`, `internal_instructions`, `documents`, `pack_sessions`, `pack_session_issues`, `ai_suggestions`, `notifications`, `push_subscriptions`.

**Tilføjelse identificeret i Fase 2 og optaget i v1.0-kravene:** `pack_profiles` (draft-tilstand) skal have en mekanisme til at undgå tab af data ved samtidig redigering — et versionstjek-felt (`edited_from_version`), der afviser publicering og viser en tydelig konfliktbesked, hvis en anden bruger har publiceret en nyere version i mellemtiden.

## 36. Datastruktur

JSON kun hvor det giver mening (`snapshot_jsonb` til versionering, `suggested_change_jsonb` til AI, `steps_completed_jsonb` til flow-historik) — ellers rigtige kolonner med Postgres-constraints. Bløde sletninger på alt forretningskritisk. Enums som Postgres-typer for statusfelter.

## 37. Navigation

**Medarbejder:** lineært, dynamisk antal skærme styret af `pack_flow_steps` — Login → Vælg kunde → Scan/Søg → (Emballage, samlet skærm) → Palle/placering (inkl. label/SSCC/folie) → (Foto) → Godkend. Ingen bundnavigation, ingen sidemenu, kun tilbage-knap.

**Admin/Teamleder:** rollestyret sidemenu (Dashboard, Kunder, Produkter, Pakkeprofiler, Emballage, Dokumenter, AI, Brugere, Historik, Push, Indstillinger), fælles skal på tværs af fremtidige apps.

**SuperAdmin:** separat platform-niveau (Virksomheder, Licenser, White Label, Support, Statistik, AI, Platform).

## 38. Brugerrejser

Fuldt udfoldede brugerrejser for alle fire roller — inklusive samtlige afvigelsesscenarier (stregkode ikke fundet, kunde ikke fundet, manglende pakkeprofil, kamera fejler, ingen internet, push midt i pakning, kun palleguide vs. fuld proces) — er dokumenteret i "RetailPackPro — Fase 2: Komplet Brugerrejse & UX-Validering" og indgår som bilag til denne specifikation. Nøglepunktet: medarbejderflowet har efter Fase 2-justeringen **5 reelle skridt** i fuld proces (ned fra 9), og enhver afvigelse har en indbygget handlingsmulighed — aldrig en blindgyde.

## 39. Wireframes

Fulde ASCII-wireframes for Login, Kundevalg, Scanner, Emballageguide, Pakkeguide/Palle, Referencebillede, Godkend, Dashboard, Admin-sidemenu og SuperAdmin-oversigt er dokumenteret i Fase 2-bilaget og indgår uændret i denne specifikation som det bindende layout-udgangspunkt for UI-udvikling. Layoutprincippet gennemgående: ét stort billede/ikon, ét primært tryk, minimal tekst, tydelig tilbage-vej.

## 40. Teststrategi

| Testniveau | Formål | Eksempler |
|---|---|---|
| **Tenant-isolation (sikkerhed)** | Bekræfte at RLS aldrig kan omgås | Automatiseret test der forsøger at læse/skrive en anden tenants rækker med en gyldig, men forkert-scoped session — skal fejle konsekvent, køres i CI før enhver udrulning |
| **Enheds- og integrationstest** | Verificere forretningslogik i `core-data`, `core-ai`, flow-engine | fx: korrekt trin-rækkefølge genereret fra `pack_flow_steps`, korrekt springe-over af tomme emballagefelter |
| **Offline-synkronisering** | Sikre at ingen godkendelse dubleres eller tabes | Simuler tab af forbindelse midt i en pakning, genopret forbindelse, verificér nøjagtigt én `pack_session` er oprettet (`idempotencyKey`) |
| **Samtidighedstest** | Verificere konfliktløsning ved samtidig redigering af pakkeprofil | To simulerede admins redigerer samme profil, den sidste publicering skal afvises med korrekt konfliktbesked (jf. §35-tilføjelse) |
| **Brugertest med rigtige lagermedarbejdere** | Validere designkontrollens fem krav (§5) i praksis, ikke kun i teori | Ny/vikar-medarbejder gennemfører en rigtig pakning uden hjælp, tid tages, om nødvendigt gentages efter justeringer |
| **Tilgængelighedstest** | Bekræfte brugbarhed for ordblinde og medarbejdere med dansk som andetsprog | Test med målgruppe-repræsentanter, ikke kun automatiserede kontrastscanninger |
| **Performance-/lasttest** | Bekræfte skalering til 50.000+ produkter og mange samtidige tenants | Belastningstest af scan-opslag og Admin-søgning ved stor datamængde |
| **Regressionstest ved AI-ændringer** | Sikre AI aldrig skriver til produktionsdata | Verificér strukturelt (databaseprivilegier), ikke kun ved kodegennemgang, at `ai-gateway`s Supabase-rolle ikke har skriveret til `pack_profiles` |

## 41. Risikoanalyse

De 10 største risici og deres afhjælpning (fuldt uddybet i Fase 2-bilaget), i prioriteret rækkefølge:

| # | Risiko | Status i v1.0 |
|---|---|---|
| 1 | Kunde ændrer pakkeregler hyppigt | Håndteret (draft/publish); "dupliker og rediger"-genvej anbefalet til Admin-UX |
| 2 | Stor produktmængde (50.000+) | Håndteret ved indeksering, paginering, bulk-import |
| 3 | Medarbejder mister forbindelse | Håndteret (offline write-queue, idempotens) |
| 4 | Samtidig redigering af pakkeprofil | **Krævet tilføjelse optaget i v1.0** (§35) |
| 5 | Utilsigtet sletning af referencemateriale | Håndteret (blød sletning + audit log) |
| 6 | AI foreslår forkert regel | Håndteret strukturelt (godkendelsestvang) |
| 7 | Data lækker mellem tenants | Håndteret (RLS); automatiseret test obligatorisk (§40) |
| 8 | Push bliver støj | Delvist håndteret (kanal-fleksibilitet); UX-advarsel ved høj frekvens anbefalet |
| 9 | Emballagekatalog vokser ukontrolleret | Ikke løst i v1.0, foreslået til v1.1 (lighedsadvarsel ved oprettelse) |
| 10 | Core-platformen bliver selv teknisk gæld | Håndteret ved bevidst "tynd kerne først"-strategi |

## 42. Fremtidige Moduler (uden for v1.0)

- **SafetyScan, FreshScan, NoteScan, LayoutScan** — fremtidige apps på samme Retail Platform Core.
- **ERP/WMS/Business Central/SAP/Microsoft 365-integrationer** — forberedt (`integration-gateway`, `external_ref`), ikke bygget.
- **Oplæsning af instruktioner** (audio) — strukturelt forberedt via i18n-nøgler, ikke bygget.
- **SSO pr. tenant** — forberedt i `core-auth`, ikke bygget.
- **Emballagekatalog-lighedsadvarsel** ved oprettelse af nye elementer (fra risikoanalysen).
- **Swipe-baseret navigation** for erfarne medarbejdere som valgfri hurtigere alternativ til tryk-knapper.

---

# Version 1.0 — Låst Scope

## Med i Version 1.0

- Medarbejder-app: login, kundevalg (med mulighed for "husk kunde for vagten"), scan/søg, emballageguide (samlet skærm), pakkeguide/palle (inkl. label/SSCC/folie), foto (konfigurerbar), godkendelse, offline-understøttelse.
- Admin: virksomhedsopsætning, white-label, kunder, produkter, emballagekatalog, pakkeprofiler med versionering og publicering, dokumentbibliotek, AI-forslag med godkendelsesflow, strukturerede interne instruktioner, brugerhåndtering, push, historik, dashboard.
- Teamleder: indskrænket admin-scope efter tildelte rettigheder.
- SuperAdmin: virksomhedsoprettelse, licenser, white-label-standarder, support-adgang, platform-statistik, AI-modelvalg pr. tenant.
- Multi-tenant SaaS med RLS-baseret isolation.
- Konfigurerbart pakkeflow ("kun palleguide" vs. "fuld emballageproces") pr. virksomhed og pr. kunde.
- Dansk og engelsk sprog.
- Samtidigheds-håndtering ved redigering af pakkeprofiler (§35-tilføjelsen).
- Grundlæggende audit- og versionshistorik.
- Model-agnostisk AI-lag (Claude/OpenAI/Gemini valgbar pr. tenant/opgave).

## Udskudt til Version 1.1

- Emballagekatalog-lighedsadvarsel ved oprettelse (undgå duplikater).
- Push-frekvens-advarsel til Admin ved overforbrug.
- "Dupliker seneste version og rediger"-genvej til hyppige regelændringer.
- Swipe-alternativ til tryk-navigation for erfarne medarbejdere.
- Yderligere sprog udover dansk/engelsk.

## Udskudt til Version 2.0 eller senere

- Konkrete ERP/WMS/Business Central/SAP/Microsoft 365-integrationer.
- Oplæsning af instruktioner (audio-understøttelse).
- SSO pr. tenant.
- SafetyScan, FreshScan, NoteScan, LayoutScan som selvstændige apps på platformen.
- Avanceret platform-fakturering pr. app/plan.

**Regel for udviklingsforløbet:** Nye idéer, der opstår under udviklingen, tilføjes **ikke** til Version 1.0-scopet. De placeres i backloggen (v1.1/v2.0-listen ovenfor) og tages op efter v1.0 er leveret til Carletti.

---

# Afsluttende Vurdering: Er RetailPackPro v1.0 klar til udvikling?

## Ja.

Begrundelsen falder i fire dele:

1. **Arkitekturen er komplet og konsistent.** Database, multi-tenant-strategi, white-label, AI-lag, offline-strategi, sikkerhedsmodel og skaleringsplan hænger sammen som ét system — ikke en samling løsrevne beslutninger. Den er blevet stresset gennem to selvstændige gennemgange (arkitekturfasen og Fase 2-UX-valideringen) uden at afsløre grundlæggende modsigelser.

2. **De svagheder, der blev fundet, er alle løsbare inden for den eksisterende model — ingen kræver en ny arkitekturrunde.** Fase 2 afdækkede tre reelle mangler (skærm-gruppering i emballageguiden, manglende samtidigheds-håndtering, ustruktureret fritekst i interne instruktioner). Alle tre er nu indarbejdet som konkrete v1.0-krav i dette dokument (§15, §35, §14) — det er præcis den slags problemer, en UX- og arkitekturgennemgang **skal** finde, før udvikling starter, og de er fundet i tide.

3. **Scope er eksplicit låst.** Version 1.0-listen ovenfor definerer en afgrænset, leverbar første version, med en klar og allerede besluttet vej for alt, der ikke skal med nu (backloggen). Dette forhindrer scope creep — den næststørste risiko for ethvert softwareprojekt efter manglende arkitektur.

4. **Medarbejderens oplevelse er valideret, ikke antaget.** Designkontrollen i Fase 2 blev gennemført kritisk, ikke som en formalitet — den identificerede reelle friktion og førte til konkrete forenklinger (9 skridt til 5). Det betyder v1.0 ikke bygges på en uprøvet antagelse om, at "billeder og få klik nok er nok", men på en gennemtænkt, testet arbejdsgang.

**Første skridt i udviklingen** bør være at bygge `packages/core-*` (auth, data, ui, i18n, offline, ai) før RetailPackPro monteres ovenpå som første app — præcis som besluttet i Platform Core-kapitlet. Herefter følger migrations, RLS-policies, og til sidst UI, i den rækkefølge arkitekturen foreskriver.

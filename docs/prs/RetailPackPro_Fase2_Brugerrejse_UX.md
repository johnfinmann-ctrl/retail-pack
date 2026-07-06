# RetailPackPro — Fase 2: Komplet Brugerrejse & UX-Validering

**Status:** Ingen kode skrevet. Dette dokument validerer arbejdsgange, navigation og brugeroplevelse på baggrund af den godkendte arkitektur (v1.2), før udvikling påbegyndes.

**Læsevejledning:** Dokumentet går rolle for rolle (SuperAdmin → Admin → Teamleder → Medarbejder), derefter wireframes, derefter designkontrol, kritisk selvevaluering, og til sidst de 10 største projektrisici.

---

# Del 1 — Brugerrejser (Walkthroughs)

## 1. SuperAdmin (Nordic Operations' eget niveau)

SuperAdmin ejer platformen på tværs af alle tenants og apps — dette er Nordic Operations' driftsrolle, ikke en kunde-rolle.

### 1.1 Trin-for-trin: Onboarding af en ny virksomhed (fx Carletti)

1. **Login** → SuperAdmin-portal (samme login-skærm som alle andre, men rollen giver adgang til et separat platform-niveau efter login).
2. **Platform-dashboard**: ser antal aktive virksomheder, samlet antal brugere, apps i brug, seneste fejl på tværs af systemet.
3. **Virksomheder → Opret ny**: indtaster firmanavn, vælger hvilke apps der skal aktiveres (`app_registry`), sætter plan/trial-status.
4. **White Label**: uploader standardlogo og farver for virksomheden (kan senere overstyres af Admin selv, eller pr. app jf. arkitekturens §5 i Platform Core).
5. **Licenser**: sætter antal bruger-seats, evt. udløbsdato for trial.
6. **Opret første Admin-bruger** for virksomheden og sender invitation (systemet sender e-mail med opsætningslink — Admin sætter selv adgangskode).
7. Virksomheden er nu klar — SuperAdmin's arbejde her er færdigt, resten sker i Admin-rollen.

### 1.2 Løbende SuperAdmin-arbejdsgange

| Opgave | Beskrivelse |
|---|---|
| **Support** | Kan (med logget adgang, jf. audit_log) midlertidigt se en virksomheds data for at fejlsøge et supportkald — aldrig stille, altid logget |
| **Statistik** | Platform-bred aktivitet: antal pakninger i dag på tværs af alle tenants, mest aktive virksomheder, væksttendens |
| **AI** | Overblik over AI-forbrug pr. virksomhed/app, mulighed for at sætte platform-standard for hvilken model (Claude/OpenAI/Gemini) der bruges til hvilken opgavetype, og se omkostning pr. tenant |
| **Platform** | Systemsundhed (Edge Function-fejlrater, Storage-forbrug), feature-flags til at rulle nye funktioner gradvist ud pr. virksomhed |
| **Licenser** | Forlænge/opsige trials, opgradere/nedgradere virksomheders plan, aktivere en ny app for en eksisterende kunde |

### 1.3 Hvad SuperAdmin **ikke** kan

SuperAdmin redigerer ikke pakkeprofiler, kundedata eller emballagekataloger — det er Admin/Teamleder's domæne. SuperAdmin's adgang til tenant-data er support-adgang, ikke daglig drift, og er altid synlig i audit-loggen for virksomheden selv (transparens, ikke skjult overvågning).

---

## 2. Admin (virksomhedsniveau, fx hos Carletti)

### 2.1 Første opsætning (onboarding-wizard efter invitation accepteret)

1. **Modtager invitation-mail** → sætter adgangskode → logger ind første gang.
2. **Onboarding-wizard (4 skridt):**
   - Skridt 1: Bekræft/upload logo og farver (hvis ikke sat af SuperAdmin).
   - Skridt 2: Vælg pakkeflow-tilgang: "Kun palleguide" eller "Fuld emballageproces" (sætter default i `pack_flow_steps`, kan finjusteres senere).
   - Skridt 3: Opret første kunde (fx "Salling Group").
   - Skridt 4: Inviter første Teamleder/medarbejdere (valgfrit, kan gøres senere).
3. **Landing på Dashboard** efter wizard — tomt, men med tydelig "Kom i gang"-liste hvis noget mangler (fx "Ingen pakkeprofiler oprettet endnu").

### 2.2 Arbejdsgang: Opsætning af en kundes pakkeregler

1. **Kunder → Salling Group → Ny pakkeprofil.**
2. Vælger produkt(er) profilen gælder for (eller "gælder for alle produkter fra denne kunde").
3. **Upload leverandørguide (PDF)** fra Salling Group i Dokumentbibliotek, knyttet til denne pakkeprofil.
4. **AI analyserer** dokumentet i baggrunden (Edge Function `ai-gateway`) — Admin ser en "AI arbejder…"-status, ingen blokering af resten af arbejdet.
5. Efter kort tid: **AI-forslag** dukker op under "AI"-sektionen: fx foreslået palletype, max højde, label-placering, udlæst fra PDF'en.
6. Admin **gennemgår forslag ét ad gangen**: godkend (skriver til `pack_profiles` som draft) eller afvis (forbliver i historik som afvist, kan genbesøges).
7. Admin **supplerer manuelt**: vælger kasse/inderemballage/mellemlæg fra `packaging_items`-kataloget (opretter nye elementer i kataloget hvis de ikke findes endnu — én gang, genbruges fremover).
8. Admin **tilføjer referencebilleder** (op til fx 3-5 pr. trin) og evt. **interne instruktioner** (fritekst til erfarne kolleger, vises ikke nødvendigvis til nye medarbejdere).
9. Admin **publicerer** profilen (draft → published, ny version oprettes i `pack_profile_versions`).
10. Fra dette øjeblik ser medarbejdere den nye regel, næste gang de scanner et produkt for denne kunde.

### 2.3 Løbende arbejdsgange

| Opgave | Beskrivelse |
|---|---|
| **Opret brugere** | Inviterer Teamledere/Medarbejdere, tildeler team |
| **Send push** | Vælger målgruppe (alle, ét team, én rolle), skriver kort besked (fx "Ny pakkeregel for Salling Group — tjek næste gang du pakker") |
| **Historik** | Ser alle pakninger (`pack_sessions`), filtrerbar pr. kunde/medarbejder/dato, ser afvigelser (`pack_session_issues`) |
| **Dashboard** | Seneste ændringer, aktive brugere, antal kontroller i dag/uge, fejlrate |
| **Rediger eksisterende profil** | Åbner altid en ny draft-version af en publiceret profil — aldrig direkte redigering af det medarbejderne ser lige nu |

---

## 3. Teamleder

Teamleder har samme visuelle admin-skal som Admin (jf. Platform Core §7), men et indskrænket scope:

1. **Login** → ser kun sit eget team's data (RLS + rolle-baseret filtrering).
2. Kan **se og redigere pakkeprofiler**, hvis Admin har givet rettigheden (`app_role_permissions`) — nogle virksomheder ønsker at Teamleder selv kan justere, andre kun Admin.
3. Kan **se sit teams historik og fejlrate** — bruges typisk til oplæring ("Jeg kan se, at 3 medarbejdere har haft afvigelser på Salling-pakninger denne uge, lad os gennemgå det på næste møde").
4. Kan **godkende AI-forslag**, hvis Admin har givet den rettighed — ellers kun se dem, Admin godkender.
5. Kan **sende push til eget team**.
6. Kan **ikke**: oprette nye virksomhedsindstillinger, ændre branding, invitere andre Teamledere, se andre teams' data.

---

## 4. Medarbejder — den kritiske rolle

Dette er brugerrejsen der afgør, om hele produktet lykkes. Beskrevet i to lag: **normalflow** og **alle afvigelsesscenarier**.

### 4.1 Normalflow (virksomhed med fuld emballageproces)

```
1. Åbner appen           → allerede logget ind (session husket, PWA)
2. Vælger kunde           → "Salling Group" (stort logo/kort, ét tryk)
3. Scanner produkt        → kamera åbner automatisk, EAN genkendes
4. Ser emballage-skærm    → kasse (billede + navn), ét tryk "Næste"
5. Ser inderemballage      → (vises kun hvis relevant for produktet)
6. Ser mellemlæg           → (vises kun hvis relevant)
7. Ser hjørnebeskyttere    → (vises kun hvis relevant)
8. Ser palle + placering   → billede af palletype, placeringsmønster, lag/højde/vægt/mix, alt på én skærm
9. Ser labelplacering/SSCC/folie → kort skærm, ikonbaseret
10. Tager billede          → (kun hvis virksomheden kræver det for denne profil)
11. Godkender              → ét stort tryk-og-hold, kvittering "✓ Godkendt"
12. Færdig                 → tilbage til "Scan næste produkt" automatisk
```

For en virksomhed med **kun palleguide** springes trin 4–7 og 9 over — medarbejderen oplever: Scan → Palle/placering → (Foto) → Godkend. Samme app, samme kode, forskellig oplevelse, styret af `pack_flow_steps` (arkitektur §17).

### 4.2 Afvigelsesscenarier — hvad medarbejderen oplever

| Scenarie | Hvad medarbejderen ser | Hvad der sker i baggrunden |
|---|---|---|
| **Stregkoden findes ikke** | Stor, venlig besked: "Vare ikke fundet" + mulighed for at søge på varenavn i stedet, eller taste EAN manuelt | Ingen fejl vises teknisk — kun handlingsmuligheder. Hvis varen slet ikke findes i systemet, tilbydes "Meld manglende vare" der sender en notifikation til Admin |
| **Kunden findes ikke / er ikke oprettet endnu** | Kundevalg viser kun de kunder virksomheden faktisk har oprettet — scenariet opstår reelt kun hvis en kunde er slettet/deaktiveret mens medarbejderen har appen åben; appen viser da "Denne kunde er ikke længere aktiv" og sender tilbage til kundevalg | Ingen adgang til inaktive kunder via RLS/status-filter |
| **Der mangler en pakkeprofil for produkt+kunde** | "Ingen pakkeregel fundet for denne kombination" + stort ikon + knap "Bed Admin om hjælp" (sender automatisk notifikation til Admin/Teamleder med produkt+kunde) | Systemet logger events af denne type, så Admin kan se hvilke kombinationer der mangler regler — værdifuld indsigt, ikke kun en fejl |
| **Kamera virker ikke / nægter adgang** | Hvis foto er påkrævet: besked "Kamera utilgængeligt" + mulighed for at fortsætte uden foto, markeret som "foto mangler" i historikken, så Admin kan følge op | Aldrig blokerende — en medarbejder skal aldrig gå i stå midt i en pakning pga. teknik |
| **Ingen internetforbindelse** | Appen fungerer som normalt — et lille, diskret ikon ("Offline — gemmes lokalt") vises, ellers uændret oplevelse | Godkendelser lægges i offline write-queue (idempotent), synkroniseres automatisk ved forbindelse. Sidst kendte publicerede pakkeprofiler er cachet lokalt |
| **Push med ny pakkeregel kommer midt i en pakning** | Push vises **ikke** som forstyrrende popup midt i et aktivt flow — lægges i notifikationslisten, synligt efter medarbejderen er færdig med igangværende pakning | Igangværende `pack_session` bruger den version af profilen, der var aktiv da flowet startede — ingen "reglen skiftede under mig"-forvirring |
| **Virksomhed ønsker kun simpel palleguide** | Kortere flow (jf. 4.1) — medarbejderen oplever aldrig emballagetrinene, de findes ikke for dem | `pack_flow_steps` med disabled trin |
| **Virksomhed ønsker hele emballageprocessen** | Længere, men stadig ét-trin-ad-gangen flow (jf. 4.1) | Samme mekanisme, blot flere aktiverede trin |

---

# Del 2 — Wireframes (ASCII, kun layout)

## Login

```
┌─────────────────────────────┐
│                             │
│        [ LOGO/BRAND ]       │
│                             │
│   ┌───────────────────────┐ │
│   │ E-mail                │ │
│   └───────────────────────┘ │
│   ┌───────────────────────┐ │
│   │ Adgangskode            │ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │        LOG IND         │ │
│   └───────────────────────┘ │
│                             │
│      Glemt adgangskode?     │
└─────────────────────────────┘
```

## Kundevalg (medarbejder)

```
┌─────────────────────────────┐
│  [Logo]           [≡ konto] │
│                             │
│   Vælg kunde                │
│                             │
│  ┌───────────┐ ┌───────────┐│
│  │  [logo]   │ │  [logo]   ││
│  │  Salling  │ │  Coop     ││
│  └───────────┘ └───────────┘│
│  ┌───────────┐ ┌───────────┐│
│  │  [logo]   │ │  [logo]   ││
│  │  Rema     │ │  Dagrofa  ││
│  └───────────┘ └───────────┘│
│                             │
└─────────────────────────────┘
```

## Scanner

```
┌─────────────────────────────┐
│  ← Tilbage                  │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │    [KAMERA-VIEW]     │   │
│   │    ┌───────────┐     │   │
│   │    │  scan-mål  │     │   │
│   │    └───────────┘     │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│   Eller søg vare manuelt →  │
│  ┌───────────────────────┐ │
│  │ 🔍 Søg produkt          │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

## Emballageguide-skærm (fx "Kasse")

```
┌─────────────────────────────┐
│  ← Tilbage        (2 af 6)  │
│                             │
│         KASSE                │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │   [STORT BILLEDE]    │   │
│   │   af kassetype       │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│      "Kasse type B3"        │
│                             │
│  ┌───────────────────────┐ │
│  │         NÆSTE           │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

## Pakkeguide / Palle-skærm

```
┌─────────────────────────────┐
│  ← Tilbage        (5 af 6)  │
│                             │
│      PALLE & PLACERING       │
│                             │
│   ┌─────────────────────┐   │
│   │  [BILLEDE: palle     │   │
│   │   m. placeringsmønster]│  │
│   └─────────────────────┘   │
│                             │
│  📏 Maks 120 cm  ⚖ Maks 500kg│
│  📚 4 lag        🔀 Mixpalle: Nej│
│                             │
│  ┌───────────────────────┐ │
│  │         NÆSTE           │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

## Referencebillede (fuldskærm zoom, tilgængelig fra ethvert trin via ikon)

```
┌─────────────────────────────┐
│  ✕ Luk                      │
│                             │
│                             │
│      [FULDSKÆRM BILLEDE]     │
│                             │
│                             │
│   ← →   (flere referencer)   │
└─────────────────────────────┘
```

## Godkend

```
┌─────────────────────────────┐
│  ← Tilbage                  │
│                             │
│     Klar til godkendelse     │
│                             │
│   ┌─────────────────────┐   │
│   │  📷 Tag billede       │   │
│   │  (hvis krævet)        │   │
│   └─────────────────────┘   │
│                             │
│  ┌───────────────────────┐ │
│  │  HOLD FOR AT GODKENDE  │ │
│  │        ✓✓✓              │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

## Dashboard (Admin/Teamleder)

```
┌─────────────────────────────┐
│ [Logo]  Dashboard    [≡]    │
│                             │
│ ┌─────────┐ ┌─────────────┐│
│ │ Aktive  │ │  Kontroller  ││
│ │ brugere │ │  i dag: 128  ││
│ │   12    │ │             ││
│ └─────────┘ └─────────────┘│
│                             │
│ ┌─────────────────────────┐│
│ │ Seneste ændringer         ││
│ │ • Salling profil v3       ││
│ │ • Ny bruger: Mikkel        ││
│ └─────────────────────────┘│
│                             │
│ ┌─────────────────────────┐│
│ │ Fejl/afvigelser denne uge ││
│ │  ▂▃▅▂▇▃▂                  ││
│ └─────────────────────────┘│
└─────────────────────────────┘
```

## Admin — sidemenu-layout

```
┌───────────┬─────────────────┐
│ [Logo]     │  Indhold vises   │
│           │  her afhængig af  │
│ Dashboard  │  valgt menupunkt │
│ Kunder     │                 │
│ Produkter  │                 │
│ Pakkepr.   │                 │
│ Emballage  │                 │
│ Dokumenter │                 │
│ AI         │                 │
│ Brugere    │                 │
│ Historik   │                 │
│ Push       │                 │
│ Indstill.  │                 │
└───────────┴─────────────────┘
```

## SuperAdmin — platform-oversigt

```
┌───────────┬─────────────────┐
│ PLATFORM   │  Virksomheder    │
│           │ ┌───────────────┐│
│ Virksomh.  │ │ Carletti  🟢  ││
│ Licenser   │ │ Reoler A/S 🟡 ││
│ White Label│ │ Bramidan  🟢  ││
│ Support    │ └───────────────┘│
│ Statistik  │                 │
│ AI         │  [+ Ny virksomh.]│
│ Platform   │                 │
└───────────┴─────────────────┘
```

---

# Del 3 — Designkontrol

Kontrolleret op mod de fem krav, arkitekturen skal opfylde:

| Krav | Vurdering | Begrundelse |
|---|---|---|
| Forstå appen på under 10 minutter | ✅ Opfyldt | Medarbejder-flowet har ingen menuer at lære — kun "se billede → tryk næste". Første pakning *er* oplæringen. |
| Finde pakkemetoden på under 5 sekunder | ✅ Opfyldt, med forbehold | Scan → direkte til relevant skærm er hurtigt. Forbeholdet: hvis en virksomhed aktiverer *alle* emballagetrin, tager det flere skærme at nå palle-skærmen — se kritisk gennemgang nedenfor, punkt om trin-sammenlægning |
| Bruge appen uden hjælp | ✅ Opfyldt for normalflow | Alle afvigelsesscenarier (§4.2) har en indbygget handling ("Bed Admin om hjælp", "Søg manuelt") i stedet for en blindgyde |
| Aldrig behøve læse PDF'er | ✅ Opfyldt | PDF'er lever udelukkende i Admin (leverandørguider til AI-analyse) — medarbejderen ser kun billeder/ikoner |
| Aldrig behøve spørge en kollega | ⚠️ Delvist — se kritisk gennemgang | Interne instruktioner (fritekst) er en risiko: hvis Admin lægger for meget vigtig information i fritekst i stedet for i de strukturerede felter/billeder, kan medarbejderen alligevel ende med at skulle spørge. Anbefaling nedenfor. |

---

# Del 4 — Kritisk gennemgang (Claude som UX-konsulent)

Dette er en ærlig, selvkritisk gennemgang — ikke en bekræftelse af, at alt er perfekt.

### Hvad er for kompliceret?

1. **Op til 6 emballagetrin i træk** er i praksis for mange separate skærme for en erfaren medarbejder, der pakker den samme kunde 50 gange om dagen. At skulle trykke "Næste" 5-6 gange for noget, man kender udenad, bremser mere end det hjælper.
2. **"Interne instruktioner" som fritekst** er en risiko for at blive en digital opslagstavle 2.0 — præcis det, produktet skal erstatte. Fritekst uden struktur inviterer til lange, utydelige noter.
3. **Kunde-valg som separat skridt** er unødvendigt for virksomheder, hvor medarbejderen typisk kun pakker for én kunde ad gangen i en hel arbejdsdag (fx en fast Salling-vagt) — at skulle vælge kunde for hver eneste pakning er friktion.

### Hvad kan fjernes eller forenkles?

| Nuværende | Forslag til forenkling |
|---|---|
| 4 separate skærme for kasse / inderemballage / mellemlæg / hjørnebeskytter | **Slå sammen til én "Emballage"-skærm** med op til 4 små billedkort side om side (kun dem der er relevante for produktet vises) — ét tryk "Næste" i stedet for op til 4. Reducerer trin fra 6 til 3 i alt for fuld proces. |
| Kundevalg ved hver pakning | Tilføj en **"husk min kunde for denne vagt"**-indstilling — medarbejderen vælger kunde én gang, appen bruger samme kunde til alle scanninger indtil de aktivt skifter eller logger ud. Kan skrues til/fra pr. virksomhed (endnu et `pack_flow_steps`-agtigt flag, ikke en kodeforgrening). |
| Fritekst interne instruktioner uden struktur | Omdan til **korte, forudbestemte kategorier** ("Vigtigt at vide", "Typisk fejl", "Kontaktperson"), max ét par linjer pr. kategori — bevarer fleksibilitet, men forhindrer at feltet vokser sig til et dokument. |
| Separat "labelplacering/SSCC/folie"-skærm (trin 9) | **Flet ind i palle-skærmen** (trin 8) som ikoner i bunden af samme skærm i stedet for en ny skærm — det er samme mentale kategori ("hvordan pallen skal se ud færdig"), ikke et nyt emne. |

**Samlet effekt af disse fire ændringer:** Fuld emballageproces går fra 9 skridt til reelt **5 skridt** (Scan → Emballage-samlet → Palle+label samlet → Foto → Godkend), uden at nogen information fjernes — kun grupperet mere meningsfuldt.

### Hvor risikerer brugeren at blive forvirret?

- Hvis et produkt har pakkeregler for **flere kunder samtidig**, og medarbejderen har glemt at skifte kunde (særligt relevant hvis "husk min kunde"-forslaget ovenfor implementeres) — bør scanneren vise et **tydeligt, ikke-blokerende kunde-badge** øverst på alle skærme, så det altid er synligt hvilken kunde der aktivt pakkes for.
- Hvis en pakkeprofil er **nyligt opdateret**, kan en medarbejder, der har brugt den samme regel i månedsvis, overse en ændring. Forslag: vis en diskret, engangs "Opdateret"-markør på skærmen første gang efter en ny publicering, ikke en blokerende popup.

### Hvilke klik kan fjernes?

- "Næste"-trykket på hver skærm kunne på sigt erstattes med **swipe** for erfarne brugere (valgfri indstilling), men fastholdes som trykknap i v1 for maksimal tydelighed for nye/ordblinde medarbejdere — bevidst valg, ikke en fejl.
- Godkend-skærmens "Tag billede"-knap kunne integreres direkte i selve godkend-handlingen for profiler, der kræver foto (ét samlet "hold-for-at-tage-billede-og-godkende"-tryk) i stedet for to separate handlinger.

### Hvordan bliver appen endnu hurtigere?

- **Forudindlæsning:** Når medarbejderen vælger kunde, forudhentes/cachees alle den kundes aktive pakkeprofiler med det samme (ikke først ved scanning) — eliminerer ventetid mellem scan og skærmvisning.
- **Seneste 5 scannede produkter** vises som genveje på scan-skærmen for hyppigt pakkede varer, så meget brugte produkter ikke kræver kameraadgang overhovedet.

**Konklusion på kritisk gennemgang:** Arkitekturen (data-model, flow-engine, konfiguration frem for kodeforgrening) er solid og kræver **ingen ændringer**. Det er UI-lagets skærm*gruppering*, der bør justeres, før udvikling påbegyndes — dette er en UX-finjustering, ikke en arkitekturrevision, og kan indarbejdes i `pack_flow_steps`' step_key-liste ved at tilføje sammensatte step-typer (fx `packaging_combined` i stedet for fire enkeltstående nøgler).

---

# Del 5 — De 10 største projektrisici

| # | Risiko | Hvordan arkitekturen håndterer den |
|---|---|---|
| 1 | **Kunde ændrer pakkeregler hver uge** | Draft/publish-flow (`pack_profile_versions`) gør en ændring til en ny version uden at forstyrre igangværende pakninger. Risiko der *ikke* er fuldt dækket endnu: hyppige ændringer kræver en **hurtig admin-arbejdsgang** — anbefaling: tilføj en "dupliker seneste version og rediger"-genvej i Admin, så en ugentlig justering tager sekunder, ikke minutter. |
| 2 | **Virksomhed med 50.000 produkter** | `products.ean` skal have et unikt indeks pr. `company_id` fra dag 1 (§17 Database-standarder), så opslag ved scanning er O(log n), ikke en tabel-scan. Import/Export Framework (§23) håndterer bulk-oprettelse. Søgning i Admin kræver server-side paginering og søgning, ikke "hent alle og filtrer i browseren." |
| 3 | **Medarbejder mister internetforbindelse midt i en pakning** | Offline Framework (§22): write-queue med `idempotencyKey` sikrer at en godkendelse aldrig dubleres, og senest kendte publicerede profiler er cachet lokalt, så flowet fortsætter uændret. |
| 4 | **To administratorer redigerer samme pakkeprofil samtidig** | **Identificeret hul i arkitekturen under denne gennemgang:** nuværende design har ikke eksplicit håndtering af samtidig redigering. Anbefalet tilføjelse: `pack_profiles` (draft-tilstand) får et `locked_by`/`locked_at`-felt eller optimistisk versionstjek (gem `edited_from_version`, afvis publicering hvis nogen anden har publiceret imellem), med en tydelig UI-besked "Denne profil er blevet ændret af [navn] — se forskelle før du publicerer." Bør besluttes inden udvikling af Admin's pakkeprofil-editor. |
| 5 | **Referenceguide/billede slettes ved en fejl** | `deleted_at` (blød sletning, §17 Database-standarder) betyder intet forsvinder permanent ved et uheld — Admin eller SuperAdmin kan gendanne. `audit_log` viser præcis hvem der slettede hvad og hvornår. |
| 6 | **AI foreslår en forkert eller farlig pakkeregel** | Strukturelt umuligt for AI at skrive direkte til `pack_profiles` (§9 AI Service Layer) — alt går gennem `ai_suggestions` med obligatorisk menneskelig godkendelse. Værste tilfælde er et forslag, der bliver stående ulæst — afhjælpes med push/notifikation til Admin, når nye forslag venter. |
| 7 | **Data lækker mellem to virksomheder (tenant-isolation fejler)** | RLS håndhævet i databasen (§3/§11), ikke kun i frontend — selv en fejl i UI-koden kan ikke eksponere en anden tenants rækker. Anbefaling: automatiseret test-suite, der specifikt forsøger krydstenant-læsning som del af CI, før hver produktionsudrulning. |
| 8 | **Push-beskeder bliver støj og bliver ignoreret** | Notification Service (§12) er kanal-fleksibel, men **selve hyppigheden** er en produktrisiko, ikke kun en teknisk en — anbefaling: Admin's push-funktion bør advare ved meget hyppig brug ("Du har sendt 5 push i dag — overvej at samle beskeder"), så funktionen ikke devaluerer sig selv. |
| 9 | **Emballagekatalog vokser ukontrolleret** (mange næsten-ens kasser oprettet af forskellige admins over tid) | Ingen automatisk oprydning i arkitekturen endnu — anbefaling: en simpel "ligner denne et eksisterende element?"-advarsel ved oprettelse af nyt `packaging_items`, baseret på navnelighed, for at reducere duplikater før de opstår. |
| 10 | **Platformen vokser til flere apps, men Core bliver for tungt at ændre** (risiko for at Core selv bliver teknisk gæld) | Håndteret ved den bevidste beslutning om at bygge Core "tyndt" først (jf. tidligere åbne beslutning) og kun udvide med nye Core-funktioner, når en anden app (SafetyScan/FreshScan) konkret efterspørger dem — undgår at bygge spekulativ infrastruktur, der aldrig bruges, men også aldrig ryddes op. |

**Vigtigste handling før udvikling:** Punkt 4 (samtidig redigering) bør besluttes eksplicit, da det er det eneste af de 10 punkter, der kræver en konkret tilføjelse til datamodellen (et lock- eller versionstjek-felt på `pack_profiles`), før Admin's redigeringsflow kan bygges korrekt.

---

## Opsummering — er arkitekturen og UX klar til udvikling?

**Ja, med tre konkrete justeringer at tage stilling til, før kodning påbegyndes:**

1. Slå de fire emballage-undertrin sammen til én skærm (Del 4) — reducerer fra 9 til 5 skridt i fuld proces.
2. Tilføj samtidig-redigerings-håndtering til `pack_profiles` (Risiko #4).
3. Strukturér "interne instruktioner" i faste, korte kategorier i stedet for fri tekst (Del 4).

Ingen af de tre kræver en ny arkitekturrunde — de er justeringer inden for den allerede godkendte model, klar til at blive skrevet ind i migration-planen når vi går i gang.

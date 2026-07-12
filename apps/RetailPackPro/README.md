# RetailPackPro

Første app på Retail Platform Core. Digital pakke-/emballageguide, bygget for Carletti
som første (test-)kunde.

## Status

✅ **v0.3.0 — MVP, klar til styret brugertest hos Carletti.**

Al ny funktionsudvikling er stoppet med henblik på en stabil testversion. Se
`CHANGELOG.md` for den fulde historik og `../../USER_TEST_GUIDE_CARLETTI.md` for
selve brugertestguiden.

## Hvad MVP'en kan

**Medarbejderflow** — "Scan. Se. Pak.":
- Vælge kunde (springes automatisk over, hvis der kun findes én aktiv kunde)
- Finde en vare via ét samlet felt (stregkode/varenummer ELLER navn — systemet
  afgør selv hvilket, og vælger automatisk ved entydigt navnematch)
- Se pakkemetoden: billede af palletype, antal lag, maks højde/vægt, labelplacering,
  folie, mixpalle, og højst én fremhævet instruktion — intet unødvendigt
- Godkende med ét tryk, automatisk retur til scan bagefter

**Adminflow:**
- Oprette kunder og produkter (inline, ét felt ad gangen)
- Oprette en pakkemetode i en to-trins guide (hvem gælder det for → selve
  pakkemetoden) med en preview, der viser praecis den skaerm medarbejderen ser
- Redigere en allerede publiceret pakkemetode sikkert: systemet opretter automatisk
  en ny kladde-version, laaser den til den redigerende admin, og medarbejdere
  fortsaetter uforstyrret med at se den gamle version, indtil der publiceres
- Se hvis en anden admin allerede er i gang ("X redigerer denne pakkemetode lige nu"),
  med mulighed for at aabne skrivebeskyttet eller proeve igen senere
- Tilfoeje en kort aendringsbeskrivelse ved publicering ("Ny labelplacering" etc.)
- Se tidligere versioner (version, dato, bruger, aendringsbeskrivelse) og gendanne
  en tidligere version som en ny, publicerbar kladde — historikken slettes aldrig
- Publicering er atomisk: ny version aktiv + gammel arkiveret + laas frigivet, alt
  paa én gang, aldrig kun halvt gennemfoert

Ingen af disse begreber ("draft", "published", "lineage_id", "version_number" osv.)
er synlige for en admin — kun almindelige handlinger som "Redigér", "Gem, men vis
ikke endnu", "Publicér", "Annullér", "Gendan".

## De tre kendte begraensninger (bevidste, dokumenterede fravalg)

1. **Ingen fil-upload af billeder** — kun et link/URL-felt. Storage er bevidst privat
   (kraever signerede URL'er, der udloeber), og en robust fil-upload-loesning er en
   selvstaendig opgave, der ikke er bygget endnu.
2. **Ingen live kamera-baseret stregkodescanning** — kun manuel indtastning/soegning.
   Virker dog fint sammen med en fysisk stregkode-scanner (de fleste "taster" koden
   ind via tastatur-emulering), da scan-feltet har autofokus og reagerer paa Enter.
3. **Offline-koeen er ikke koblet paa godkend-handlingen.** Godkendelse kraever derfor
   aktiv internetforbindelse i denne version.

Derudover: redigering forudsaetter, at en pakkemetode allerede er publiceret foerste
gang via oprettelsesguiden — der er ingen bulk-import af eksisterende papirbaserede
pakkeregler.

## Lokal opsaetning

```bash
nvm use                            # Node 20 (se ../../.nvmrc)
npm install                        # fra repo-roden — installerer ALLE workspaces
npm run generate:manifest --workspace=@apps/retailpackpro
npm run dev --workspace=@apps/retailpackpro
```

Kraever `.env.local` i `apps/RetailPackPro/` (ikke committet, se `.gitignore`):
```
VITE_SUPABASE_URL=https://<dit-projekt>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_PLATFORM_ENV=development
```

## Supabase-opsaetning

Foelg i raekkefoelge:
1. `../../database/SUPABASE_SETUP.md` (Platform Core) — opret projekt, koer Core's
   migrationer (`database/migrations/0001-0005`), registrér Custom Access Token
   Hook (kritisk — uden den virker RLS ikke).
2. `database/SUPABASE_SETUP.md` (denne app) — koer RetailPackPro's egne migrationer
   (`database/migrations/0001-0005`), eksponér skemaet `retailpackpro` i
   Supabase-dashboardet (Settings -> API -> Exposed schemas) — kritisk, ellers fejler
   alle forespoergsler fra appen med en "skema findes ikke"-fejl.

## Seed-data

Kun til udvikling/demo — ALDRIG mod et produktionsmiljoe:
```bash
psql "$DATABASE_URL" -f ../../database/seed/0001_dev_seed.sql        # Core: Carletti som tenant
psql "$DATABASE_URL" -f database/seed/0001_carletti_seed.sql         # RetailPackPro: demo-kunder/produkter/pakkemetoder
```
Opretter Carletti som white-label demo-tenant med 3 opdigtede kunder, 8 opdigtede
produkter, et emballagekatalog, og 3 pakkemetoder (2 publicerede, 1 kladde). Se
selve filerne for detaljer — alt indhold er tydeligt markeret som demo/test.

## Login og roller

Seed-filen opretter to demo-brugere i `public.users`, men de har ingen adgangskode
endnu — `public.users` er kun platformens egen brugertabel, login sker via Supabase
Auth separat. For at teste skal du:

1. Oprette en rigtig bruger via Supabase Auth (Dashboard -> Authentication -> Users,
   eller `supabase.auth.signUp()`) med samme e-mail som en seedet demo-bruger
   (`demo-admin@carletti-demo.test` eller `demo-medarbejder@carletti-demo.test`).
2. Sikre at den nye Auth-brugers `id` matcher raekken i `public.users` (opdatér
   `public.users.id` til den nye Auth-bruger-id, hvis Supabase genererer et andet).

Rolle (`admin`/`medarbejder`) styrer automatisk om appen viser Admin- eller
medarbejderflowet — der er ingen manuel skift.

## Saadan gennemfoeres en test

Se `../../USER_TEST_GUIDE_CARLETTI.md` for den fulde guide til brugertesten,
inklusive opgaver, observationspunkter og opfoelgende spoergsmaal.

Kort opsummeret:
1. Opsaet Supabase-projektet og koer migrationerne (se ovenfor).
2. Opret mindst én rigtig Auth-bruger pr. rolle (admin + medarbejder).
3. Koer appen lokalt (`npm run dev`) eller deploy `dist/`-mappen efter `npm run build`.
4. Foelg opgaverne i brugertestguiden, og notér observationerne undervejs — ikke bagefter.

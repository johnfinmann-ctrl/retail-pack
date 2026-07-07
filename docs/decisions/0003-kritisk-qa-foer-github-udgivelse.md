# ADR-0003: Uafhængig kritisk QA før GitHub-udgivelse (→ v0.1.1 Security Fix)

**Dato:** 2026-07-07
**Status:** Besluttet — 6 kritiske fund rettet og verificeret, anbefalede fund noteret til senere

## Baggrund
Før udgivelse på GitHub blev hele Platform Core gennemgået som en uafhængig code review
(ikke af den samme "hat" der byggede det), specifikt for at finde fejl, mangler og
svagheder. Gennemgangen afdækkede fem kritiske fund i første runde. En efterfølgende,
mere grundig verifikationsrunde — hvor migrations blev kørt fra en HELT TOM database og
afprøvet med en fuld positiv/negativ testmatrix i stedet for kun at blive læst igennem —
afdækkede et SJETTE kritisk fund (manglende RLS-aktivering på storage.objects), som ikke
var fanget af den første gennemgang. Dette førte til version v0.1.1 i stedet for at rette
v0.1.0 stiltiende.

## Kritiske fund (rettet i denne gennemgang)

1. **RLS-policies antog en JWT-struktur, som intet i migrations rent faktisk producerede.**
   `platform_jwt_company_id()`/`platform_jwt_role()` læser flade top-level claims, men
   Supabase's standard-JWT lægger custom data under et nested `app_metadata`-objekt.
   Uden en Custom Access Token Hook ville disse funktioner returnere NULL for enhver
   ægte bruger. **Fix:** `0004_custom_access_token_hook.sql` + påkrævet manuel
   dashboard-registrering, dokumenteret i `database/SUPABASE_SETUP.md`.

2. **Ingen GRANT-statements til `authenticated`-rollen.** PostgREST ville afvise alle
   forespørgsler med permission denied, uanset RLS. **Fix:** `0005_grants.sql`, inkl.
   `alter default privileges` så fremtidige tabeller automatisk arver grant.

3. **`teams`/`app_registry` havde kun tenant-match, intet rolletjek på skrivehandlinger.**
   En almindelig medarbejder kunne have oprettet/slettet teams eller slået apps til/fra
   for hele virksomheden. **Fix:** adskilt select- (tenant-bred) og write-policies
   (kun admin/superadmin), samme mønster som allerede brugt korrekt på `users`.

4. **`audit_log`-insert tjekkede ikke at `user_id` matchede den faktisk indloggede
   bruger.** En kompromitteret session kunne forfalske audit-poster i en anden brugers
   navn. **Fix:** `with check (... and user_id = auth.uid())`.

5. **RetailPackPro-specifik term (`pack_session_photos`) lækket ind i
   `@platform/auth`s Storage-fundament.** Brød den eksplicitte regel om ingen
   app-specifik kode i Core. **Fix:** omdøbt til `activity_photos`.

6. **RLS var aldrig aktiveret på `storage.objects`.** Policies i
   `0003_storage_policies.sql` blev oprettet korrekt, men uden
   `alter table storage.objects enable row level security;` håndhæver
   Postgres dem slet ikke — enhver bruger kunne se og slette alle
   virksomheders filer, uanset tenant. Fundet under den AFSLUTTENDE
   verifikations-runde (v0.1.1), efter de første fem rettelser, ved at
   faktisk køre positive/negative test-scenarier mod storage.objects —
   ikke kun ved at læse koden. **Fix:** tilføjet eksplicit
   `enable row level security`-linje.

Alle seks er verificeret med reelle forespørgsler mod en lokal Postgres-instans, kørt
fra en HELT TOM database (ikke en database der allerede havde kørt tidligere migrations),
inklusive faktiske positive/negative test-scenarier: medarbejder afvist på skrivning til
teams/app_registry/storage, admin tilladt, krydstenant-læsning afvist på både
databaserækker og storage-objekter, forfalsket audit-post afvist.

## Anbefalede fund (IKKE rettet — bevidst efterladt til senere beslutning)

| # | Fund | Hvorfor ikke rettet nu |
|---|---|---|
| A | `@platform/auth` afhænger af `@platform/ui` kun for `platformDefaultBrand`-konstanten — binder en auth/sikkerhedspakke unødigt til en React-orienteret UI-pakke. | Fungerer korrekt i dag; bør løses ved at flytte farve-tokens til en lettere, framework-fri pakke, hvis/når en Edge Function får brug for branding-opløsning server-side. |
| B | Ingen ADR dokumenterer VALGET af React 18 + TypeScript + npm workspaces + Vitest som platformens konkrete tech-stack. | Stacken virker og er konsistent implementeret, men beslutningen bør formaliseres, så en fremtidig udvikler forstår hvorfor, ikke kun hvad. |
| C | Ingen dataoprydnings-/GDPR-sletningsstrategi for `deleted_at`-rækker (bløde sletninger ophobes for evigt). | Relevant for "10 års levetid"-spørgsmålet, men ingen konkret virksomhed rammer dette problem i v0.1.0. |
| D | Inkonsistent dependency-pinning (nogle `--save-exact`, andre caret-ranges). | Kosmetisk risiko for versionsdrift — bør standardiseres, evt. med Renovate/Dependabot, men ikke sikkerhedskritisk. |
| E | Ingen automatiseret test, der specifikt forsøger krydstenant-adgang, kører i CI (kun manuelt verificeret under denne QA). | Bør tilføjes som en dedikeret RLS-test-suite (fx via `supabase test` eller pgTAP) i et senere sprint, så denne klasse af fejl fanges automatisk, ikke kun ved manuel gennemgang. |
| F | `packages/qr-rfid`, `ai-engine`, `reports`, `analytics`, `apps/ReolScan` er fortsat reserverede uden beslutning (uændret fra ADR-0001/0002). | Afventer din stillingtagen. |

## Konklusion
De kritiske fund var reelle funktionalitets- og sikkerhedsbrister, ikke formaliteter — uden
rettelse ville platformen enten slet ikke have virket (manglende grants/hook) eller have
haft en reel privilegie-eskaleringsrisiko (teams/app_registry/audit_log/storage). Alle seks
er rettet og verificeret med en fuld positiv/negativ testmatrix fra en tom database.

Det sjette fund (storage-RLS) er samtidig det stærkeste argument for anbefaling E
nedenfor: en manuel gennemgang — selv en grundig én — fanger ikke alt på første forsøg.
Kun ved faktisk at KØRE migrations og forsøge de forbudte handlinger blev fejlen fundet.
En automatiseret RLS-test-suite i CI bør derfor prioriteres tidligt i Sprint 2, så denne
klasse af fejl fanges ved hvert push, ikke kun ved lejlighedsvise manuelle gennemgange.

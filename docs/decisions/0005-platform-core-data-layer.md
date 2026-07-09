# ADR-0005: Platform Core Data-adgangslag (v0.2.0) — @platform/data

**Dato:** 2026-07-08
**Status:** Besluttet

## Beslutning
Ny Core-pakke `@platform/data`, der interponerer sig mellem ethvert repository-lag
(i enhver app) og Supabase. Repositories importerer `DataClient` fra denne pakke,
ALDRIG `@supabase/supabase-js`s fejltyper direkte. Versioneret som Platform Core
v0.2.0 (minor — ny kapabilitet, ikke en fejlrettelse).

## Kontekst
Under Sprint 2 (RetailPackPro), Trin 4, blev repository-laget bygget med
`UI → Application Services → Repositories → Supabase` — men repositories tog en rå
`SupabaseClient` og håndterede `{data, error}`-mønsteret (inkl. `toAppError`) selv,
duplikeret i alle 13+ repository-metoder. Et efterfølgende krav præciserede laget til
`UI → Application Services → Repositories → Platform Core → Supabase` — Repositories
skal gå gennem Platform Core, ikke direkte til Supabase-SDK'et.

## Hvorfor pakken er bevidst SNÆVER
`@platform/data` forsøger IKKE at gengive PostgREST's fulde forespørgselssprog
(`.eq`, `.ilike`, `.in`, `.order`, nested selects osv.) som en abstrakt, database-
uafhængig type. Det ville være en stor, risikabel genopfindelse af et helt
forespørgselssprog for meget lidt reel gevinst — Supabase/PostgREST's forespørgsels-
bygger er allerede veldesignet og stærkt typet. I stedet ejer pakken kun:
1. **Entry point** (`schema()`) — så intet repository kalder `.schema()` på en rå klient selv.
2. **Resultat-håndtering** (`run()`/`runMany()`) — fejl-normalisering og logging ét sted.

Dette giver den reelle værdi, kravet efterspørger (udskiftelighed, centraliseret
fejlhåndtering/logging, ét sted at ændre hvis Supabase nogensinde forlades), uden at
pådrage platformen en unødvendig, skrøbelig abstraktion oven på selve forespørgslerne.

## Konsekvens
- RetailPackPro's fem Supabase*Repository-klasser er opdateret til at tage en
  `DataClient` i konstruktøren i stedet for en rå `SupabaseClient`. Deres offentlige
  interfaces (`CustomerRepository` osv.) er UÆNDREDE — Application Services-laget og
  alle eksisterende tests (fakes) er upåvirket.
- Skulle Supabase nogensinde udskiftes, er `@platform/data`s implementering af
  `createDataClient` det eneste sted, der skal skrives om — under forudsætning af at
  den nye backend også kan udtrykkes som `{data, error}`-forespørgsler, hvilket er et
  almindeligt mønster (fx PostgREST-lignende API'er, GraphQL-klienter med lignende
  resultat-form osv.). Et fundamentalt anderledes paradigme ville kræve en ny
  version af `@platform/data` selv — men Repositories og Services ville stadig ikke
  skulle ændres, kun deres konstruktør-injektion af `DataClient`.

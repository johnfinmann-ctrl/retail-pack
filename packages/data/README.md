# @platform/data

Data-adgangslaget mellem repositories (i enhver app) og Supabase. Centraliserer
fejl-normalisering og logging ét sted — repositories importerer ALDRIG
`@supabase/supabase-js`s fejltyper direkte.

## Lag
```
UI → Application Services → Repositories → @platform/data → Supabase
```

## Status
🚧 v0.1.0 — første version, bygget som del af Platform Core v0.2.0. Bevidst minimal:
ejer kun skema-opslag + resultat-håndtering, ikke selve forespørgselssproget.

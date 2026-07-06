# database/

Supabase-relateret database-definition for hele platformen.

- `migrations/` — al skemaændring versioneret her (SQL), aldrig manuel ændring i Supabase Studio for produktionsmiljøer.
- `policies/` — Row Level Security-policies som kode, reviewbare i pull requests.
- `seed/` — testdata til lokal udvikling.

**Status Sprint 1:** Tom. Første migrations (companies, users, teams, app_registry, audit_log — jf. PRS §35) tilføjes i "Supabase integration"-leverancen af Sprint 1, efter denne mappestruktur er godkendt.

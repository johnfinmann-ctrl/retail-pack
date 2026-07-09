# RetailPackPro

Første app på Retail Platform Core. Digital pakke-/emballageguide, bygget for Carletti
som første (test-)kunde.

## Status — Sprint 2

🚧 **Trin 3 af 6: App-scaffold færdig.** Vite/React-opsætning, rollebaseret routing
(Login → Employee/Admin), i18n (DA/EN), PWA-manifest, koblet til
`@platform/ui`/`@platform/auth`/`@platform/translations`/`@platform/offline`.

Employee- og Admin-flowet er **pladsholdere** — det fulde medarbejderflow bygges i Trin 5,
Admin grundstruktur i Trin 6.

## Lokal udvikling

```bash
npm install                        # fra repo-roden
npm run generate:manifest --workspace=@apps/retailpackpro
npm run dev --workspace=@apps/retailpackpro
```

Kræver `.env.local` (ikke committet) med:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_PLATFORM_ENV=development
```

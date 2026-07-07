# GitHub-opsætning

Dette repository er udviklet lokalt med fuld git-historik og er klar til at blive
publiceret som det officielle GitHub-repository for platformen.

## 1. Opret et TOMT repository på GitHub
Navn: `retail-platform-core` (under din organisation/konto, fx `johnfinmann-ctrl`).
**Vigtigt:** opret det UDEN README/.gitignore/LICENSE — dette repository har allerede
alle tre, og GitHub's auto-genererede filer vil skabe unødige merge-konflikter.

Repositoryet bør oprettes som **privat** — jf. `LICENSE` (proprietær kode).

## 2. Push den eksisterende historik
```bash
cd retail-platform-core
git remote add origin https://github.com/<din-konto>/retail-platform-core.git
git branch -M main
git push -u origin main
git push origin --tags   # medtager v0.1.0 og v0.1.1-tags
```

## 3. Verificér CI kører
`.github/workflows/ci.yml` kører automatisk ved push. Tjek fanen **Actions** på GitHub
og bekræft at install → lint → typecheck → test → build alle er grønne.

## 4. Beskyt main-branchen (anbefalet, ikke påkrævet for v0.1.1)
Settings → Branches → Add rule for `main`: kræv at CI består og mindst én godkendelse,
før merge, når flere udviklere begynder at bidrage.

## 5. Første rigtige Supabase-projekt
Se `database/SUPABASE_SETUP.md` — **særligt trin 3 (Custom Access Token Hook)**, som er
et påkrævet manuelt dashboard-skridt og IKKE dækkes af `git push` eller migrations alene.

## Verificeret før denne guide blev skrevet
- Ren `npm install` → 0 sårbarheder i produktionsafhængigheder
- `npm run lint` → 0 fejl, 0 advarsler
- `npm run typecheck` → alle 14 pakker kompilerer via project references
- `npx vitest run` → 51/51 tests bestået
- `npm run build` → alle pakker med build-script bygger rent
- Alle 5 migrationsfiler kørt fra en HELT TOM database, ingen fejl
- 14 sikkerheds-scenarier (tenant-isolation, rolle-begrænsning, audit-integritet,
  storage-isolation) testet positivt og negativt — alle bestod

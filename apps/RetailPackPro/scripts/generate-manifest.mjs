// Genererer public/manifest.json ved at genbruge @platform/offline's
// buildManifest — INGEN duplikeret manifest-logik i denne app.
//
// OBS: importerer fra pakkens KOMPILEREDE dist/ (ikke ../src/), fordi
// @platform/offline's package.json peger "main"/"types" på TypeScript-kilden
// (til Vite/bundlere, der forstår TS direkte) — et almindeligt plain
// Node-script som dette kan ikke køre .ts-filer uden en loader. Kræver derfor
// at `npm run build` er kørt i packages/offline først (samme forudsætning
// som TypeScript project references allerede stiller).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildManifest } from '../../../packages/offline/dist/pwa.js';

const manifest = buildManifest({
  appName: 'RetailPackPro',
  shortName: 'RetailPackPro',
  themeColor: '#0D1B2A',
  backgroundColor: '#ffffff',
  startUrl: '/',
  icons: [
    { src: '/assets/demo/icon-192-placeholder.svg', sizes: '192x192', type: 'image/svg+xml' },
    { src: '/assets/demo/icon-512-placeholder.svg', sizes: '512x512', type: 'image/svg+xml' },
  ],
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../public/manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Manifest skrevet til ${outPath} (via @platform/offline sin egen buildManifest)`);

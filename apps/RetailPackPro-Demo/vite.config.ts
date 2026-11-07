import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * RetailPackPro Demo — bygges til ÉN selvstændig HTML-fil (dist/index.html),
 * så demoen kan åbnes direkte, publiceres som link eller lægges på GitHub
 * Pages uden server og uden build-trin hos modtageren.
 *
 * `@rpp/*` peger på v0.3.0's kildekode (apps/RetailPackPro/src) — demoen
 * GENBRUGER services, domænetyper og repository-kontrakter derfra uden at
 * kopiere eller ændre dem.
 */
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@rpp': fileURLToPath(new URL('../RetailPackPro/src', import.meta.url)),
    },
  },
  server: { port: 5174, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
  },
  test: {
    environment: 'node',
  },
});

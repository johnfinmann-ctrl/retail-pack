import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// RetailPackPro — Vite-opsætning. Ingen backend, ingen API-nøgler i klienten
// (kun Supabase URL + anon key, som er offentlige per design, jf. PRS §12).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

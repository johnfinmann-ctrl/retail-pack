// Kør alle workspaces' test fra roden. Hvert workspace bruger sin egen
// vite/vitest-konfiguration, hvis den findes (fx RetailPackPro-Demo's @rpp-alias).
export default ['packages/*', 'shared/*', 'apps/*'];

/**
 * Alle RetailPackPro-tabeller ligger i Postgres-skemaet "retailpackpro"
 * (ikke "public" — se apps/RetailPackPro/database/migrations/0001).
 * `.schema(RPP_SCHEMA)` skal derfor stå FØRST i enhver Supabase-forespørgsel
 * i dette repository-lag. Kræver at skemaet er eksponeret via PostgREST i
 * Supabase-dashboardet (Settings → API → Exposed schemas) — se
 * apps/RetailPackPro/database/SUPABASE_SETUP.md.
 */
export const RPP_SCHEMA = 'retailpackpro';

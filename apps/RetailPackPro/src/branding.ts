/**
 * Anvender Carletti-brandingen (eller enhver anden tenants) på siden, ved
 * at genbruge @platform/auth's fallback-kæde uændret: app-override → firma
 * → platformens neutrale standard. RetailPackPro tilføjer ingen egen
 * branding-logik — kun visningen af det, Core allerede har udregnet.
 */
import { resolveBranding, brandingToCssVariables, type CompanyBranding } from '@platform/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function applyBranding(client: SupabaseClient, companyId: string): Promise<void> {
  const { data, error } = await client
    .from('companies')
    .select('name, logo_url, primary_color, secondary_color')
    .eq('id', companyId)
    .single();

  if (error || !data) {
    // Fejler stille til platformens neutrale standard — branding er aldrig
    // kritisk nok til at blokere appen (PRS §6 princip 1: aldrig blokerende).
    return;
  }

  const company: CompanyBranding = {
    companyName: data.name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
  };

  // Ingen app-specifik override-tabel bygget endnu (company_app_branding,
  // PRS §5) — sendes derfor som null, hvilket resolveBranding håndterer
  // korrekt som "ingen override, brug firmaets egen branding".
  const resolved = resolveBranding(company, null);
  const cssVars = brandingToCssVariables(resolved);

  for (const [key, value] of Object.entries(cssVars)) {
    document.documentElement.style.setProperty(key, value);
  }
}

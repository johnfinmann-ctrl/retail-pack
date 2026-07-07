/**
 * White Label — fallback-kæden (PRS §5/§11): app-specifik branding, hvis den
 * findes → ellers virksomhedens standardbranding → ellers platformens
 * neutrale standarddesign. Al branding er DATA — ingen komponent kender
 * til et specifikt firma.
 */
import { platformDefaultBrand } from '@platform/ui';

export interface CompanyBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  companyName: string;
}

export interface AppBrandingOverride {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface ResolvedBranding {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

/**
 * Slår branding op efter PRS §5's regel: appens egen override vinder,
 * derefter virksomhedens standard, derefter platformens neutrale standard.
 * Denne funktion er den ENESTE plads i platformen, der kender fallback-rækkefølgen.
 */
export function resolveBranding(
  company: CompanyBranding,
  appOverride: AppBrandingOverride | null,
): ResolvedBranding {
  return {
    logoUrl: appOverride?.logoUrl ?? company.logoUrl ?? null,
    primaryColor: appOverride?.primaryColor ?? company.primaryColor ?? platformDefaultBrand.primary,
    secondaryColor:
      appOverride?.secondaryColor ?? company.secondaryColor ?? platformDefaultBrand.secondary,
    companyName: company.companyName,
  };
}

/** Bygger CSS custom properties-objektet, som injiceres på rod-elementet ved runtime. */
export function brandingToCssVariables(branding: ResolvedBranding): Record<string, string> {
  return {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
  };
}

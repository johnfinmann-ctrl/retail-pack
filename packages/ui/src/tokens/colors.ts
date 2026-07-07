/**
 * Platform-neutrale farve-tokens (PRS §32). Bruges som CSS custom properties,
 * så en tenant/app kan overstyre `--brand-primary`/`--brand-secondary` uden
 * at nogen komponent skal ændres — white-label er runtime-data, ikke kode.
 */
export const neutralColors = {
  background: '#ffffff',
  surface: '#f7f7f8',
  border: '#e2e2e5',
  textPrimary: '#111114',
  textSecondary: '#5c5c66',
} as const;

/** Semantiske farver — bruges konsekvent på tværs af alle apps (PRS §6 UX). */
export const semanticColors = {
  success: '#1e8e3e',
  warning: '#e3a008',
  error: '#d93025',
  info: '#1a73e8',
} as const;

/**
 * Standard brand-farver, brugt hvis en tenant/app ikke har sat sin egen
 * branding (§5 White Label — fallback-kæden: app-brand → company-brand → dette).
 */
export const platformDefaultBrand = {
  primary: '#1a2b4c',
  secondary: '#a8883a',
} as const;

export type ColorToken =
  | keyof typeof neutralColors
  | keyof typeof semanticColors
  | keyof typeof platformDefaultBrand;

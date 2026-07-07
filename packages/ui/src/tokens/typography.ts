/**
 * To typografiskalaer (PRS §32): "employee" er stor og læsbar på afstand
 * (handske-/tidspres-venlig), "admin" er tættere og viser mere information.
 * Ingen skala er en "default" — hvert UI-lag vælger eksplicit hvilken det bruger.
 */
export const employeeTypeScale = {
  body: { fontSize: 18, lineHeight: 1.5, fontWeight: 500 },
  label: { fontSize: 16, lineHeight: 1.4, fontWeight: 500 },
  heading: { fontSize: 28, lineHeight: 1.2, fontWeight: 700 },
} as const;

export const adminTypeScale = {
  body: { fontSize: 14, lineHeight: 1.5, fontWeight: 400 },
  label: { fontSize: 13, lineHeight: 1.4, fontWeight: 500 },
  heading: { fontSize: 20, lineHeight: 1.3, fontWeight: 600 },
} as const;

export type TypeScaleName = 'employee' | 'admin';
export type TypeScaleKey = keyof typeof employeeTypeScale;

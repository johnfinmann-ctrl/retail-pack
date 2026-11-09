/**
 * Samlet konfiguration for v0.5. Ændres ét sted.
 */
export const CONFIG = {
  /** Fotos pr. palle, før den kan godkendes til forsendelse. En afvigelse kræver altid mindst ét. */
  minPhotosPerPallet: 1,
  /** Maks. fotos pr. ordre (plukrute) i alt — håndhæves i RegistrationService. */
  maxPhotosPerOrder: 35,
  /** Lokal lagernøgle — adskilt fra v0.4.0, så referenceversionen ikke påvirkes. */
  storageKey: 'retailpackpro-demo-v0.5.0',
  /** Tekst der vises, hvor kæden endnu ikke har en indlæst vejledning. */
  awaitingText: 'Afventer officiel vejledning',
} as const;

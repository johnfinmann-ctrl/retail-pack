/**
 * Samlet konfiguration for v0.5. Ændres ét sted.
 */
export const CONFIG = {
  /** Fotos pr. palle, før den kan godkendes til forsendelse. En afvigelse kræver altid mindst ét. */
  minPhotosPerPallet: 1,
  /** Maks. fotos pr. ordre (plukrute) i alt — håndhæves i RegistrationService. */
  maxPhotosPerOrder: 35,
  /** Lokal lagernøgle for v0.5.1. Data fra v0.5.0 kopieres frem ved første start (v0.5.0 forbliver urørt). */
  storageKey: 'retailpackpro-demo-v0.5.1',
  previousStorageKey: 'retailpackpro-demo-v0.5.0',
  fileDbName: 'retailpackpro-demo-v051',
  previousFileDbName: 'retailpackpro-demo-v05',
  /** Lagersteder i AX. Carlettis eget lagersted er H5 / PLUK1. */
  sites: {
    H5: { code: 'H5', location: 'PLUK1', name: 'Carletti', short: 'Carletti', own: true },
    FL: { code: 'FL', location: 'FL', name: 'Frode Laursen (fjernlager)', short: 'Frode Laursen', own: false },
  },
  ownSite: 'H5',
  /** Tekst der vises, hvor kæden endnu ikke har en indlæst vejledning. */
  awaitingText: 'Afventer officiel vejledning',
} as const;

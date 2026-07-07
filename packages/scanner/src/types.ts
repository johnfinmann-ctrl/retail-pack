/**
 * Scanner Service — kontrakt (PRS §18). Understøtter EAN, ordre-koder,
 * SSCC og pallelabel, med manuel søgning som fallback. Selve
 * kamera-/scanner-hardware-adgangen implementeres i den enkelte app
 * (browser BarcodeDetector API, native SDK, e.l.) — denne pakke definerer
 * KONTRAKTEN, ikke enhedsintegrationen (heraf "fundament" i Sprint 1).
 */
export const ScanFormat = {
  EAN: 'EAN',
  Order: 'ORDER',
  SSCC: 'SSCC',
  PalletLabel: 'PALLET_LABEL',
} as const;

export type ScanFormat = (typeof ScanFormat)[keyof typeof ScanFormat];

export interface ScanResult {
  format: ScanFormat;
  rawValue: string;
  scannedAt: string; // ISO 8601
}

export interface ScannerService {
  /** Starter enhedens scanner/kamera og kalder onResult, når en kode genkendes. */
  start(options: { formats: readonly ScanFormat[]; onResult: (result: ScanResult) => void }): void;
  stop(): void;
}

/**
 * Fallback når scanning fejler eller stregkoden ikke findes (PRS §4.2
 * afvigelsesscenarie "Stregkoden findes ikke") — aldrig en blindgyde.
 */
export interface ManualSearchFallback {
  searchByName(query: string): Promise<Array<{ id: string; name: string }>>;
  reportMissingProduct(barcodeOrQuery: string): Promise<void>;
}

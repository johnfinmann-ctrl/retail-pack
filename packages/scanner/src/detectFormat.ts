/**
 * Simpel, afhængighedsfri heuristik til at afgøre kodetype ud fra længde/
 * mønster, indtil den fulde enhedsintegration er på plads i en app. Bruges
 * også ved MANUEL indtastning (PRS §4.2), hvor der ikke er en scanner-SDK
 * til at fortælle os formatet.
 */
import { ScanFormat } from './types';

export function detectScanFormat(rawValue: string): ScanFormat | null {
  const value = rawValue.trim();

  if (/^\d{8}$|^\d{13}$/.test(value)) return ScanFormat.EAN;
  if (/^\d{18}$/.test(value)) return ScanFormat.SSCC;
  if (/^ORD-/i.test(value)) return ScanFormat.Order;
  if (/^PAL-/i.test(value)) return ScanFormat.PalletLabel;

  return null;
}

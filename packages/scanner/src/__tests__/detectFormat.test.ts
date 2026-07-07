import { describe, expect, it } from 'vitest';

import { detectScanFormat } from '../detectFormat';
import { ScanFormat } from '../types';

describe('detectScanFormat', () => {
  it('genkender 13-cifret EAN', () => {
    expect(detectScanFormat('5701234567890')).toBe(ScanFormat.EAN);
  });
  it('genkender 8-cifret EAN', () => {
    expect(detectScanFormat('12345678')).toBe(ScanFormat.EAN);
  });
  it('genkender 18-cifret SSCC', () => {
    expect(detectScanFormat('123456789012345678')).toBe(ScanFormat.SSCC);
  });
  it('genkender ordre-præfiks', () => {
    expect(detectScanFormat('ORD-2026-001')).toBe(ScanFormat.Order);
  });
  it('genkender pallelabel-præfiks', () => {
    expect(detectScanFormat('PAL-99881')).toBe(ScanFormat.PalletLabel);
  });
  it('returnerer null for ukendt format', () => {
    expect(detectScanFormat('tilfældig-tekst')).toBeNull();
  });
});

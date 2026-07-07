import { describe, expect, it } from 'vitest';

import {
  formatDateDa,
  generateIdempotencyKey,
  isDefined,
  isValidEmail,
  slugify,
  truncate,
} from '../index';

describe('isValidEmail', () => {
  it('accepterer en gyldig e-mail', () => {
    expect(isValidEmail('john@nordicoperations.dk')).toBe(true);
  });
  it('afviser en ugyldig e-mail', () => {
    expect(isValidEmail('ikke-en-mail')).toBe(false);
  });
});

describe('slugify', () => {
  it('konverterer danske tegn og mellemrum korrekt', () => {
    expect(slugify('Lyngbygaard Golf Klub')).toBe('lyngbygaard-golf-klub');
  });
});

describe('formatDateDa', () => {
  it('formaterer ISO-dato til dd.mm.åååå', () => {
    expect(formatDateDa('2026-07-06T12:00:00Z')).toBe('06.07.2026');
  });
  it('kaster fejl ved ugyldig dato', () => {
    expect(() => formatDateDa('ikke-en-dato')).toThrow();
  });
});

describe('truncate', () => {
  it('klipper lange strenge med ellipsis', () => {
    expect(truncate('Salling Group', 6)).toBe('Salli…');
  });
  it('lader korte strenge være uændrede', () => {
    expect(truncate('Rema', 10)).toBe('Rema');
  });
});

describe('generateIdempotencyKey', () => {
  it('genererer unikke nøgler', () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).not.toBe(b);
  });
});

describe('isDefined', () => {
  it('filtrerer null/undefined fra et array', () => {
    const values = [1, null, 2, undefined, 3];
    expect(values.filter(isDefined)).toEqual([1, 2, 3]);
  });
});

import { describe, expect, it } from 'vitest';

import { NotFoundError, toAppError, UnauthorizedError } from '../errors';

describe('toAppError', () => {
  it('lader en eksisterende AppError være uændret', () => {
    const original = new NotFoundError('Kunde');
    expect(toAppError(original)).toBe(original);
  });

  it('normaliserer en almindelig Error', () => {
    const wrapped = toAppError(new Error('noget gik galt'));
    expect(wrapped.code).toBe('UNKNOWN');
    expect(wrapped.message).toBe('noget gik galt');
  });

  it('normaliserer en ukendt kastet værdi', () => {
    const wrapped = toAppError('streng-fejl');
    expect(wrapped.code).toBe('UNKNOWN');
  });
});

describe('UnauthorizedError', () => {
  it('har en sikker standard brugerbesked', () => {
    const err = new UnauthorizedError();
    expect(err.userMessage).toBe('Du har ikke adgang til dette.');
  });
});

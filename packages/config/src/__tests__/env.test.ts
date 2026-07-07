import { describe, expect, it } from 'vitest';

import { loadPlatformEnv } from '../env';
import { ValidationError } from '../errors';

describe('loadPlatformEnv', () => {
  it('indlæser gyldig konfiguration', () => {
    const env = loadPlatformEnv({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      PLATFORM_ENV: 'development',
    });
    expect(env.supabaseUrl).toBe('https://example.supabase.co');
    expect(env.environment).toBe('development');
  });

  it('fejler tydeligt ved manglende SUPABASE_URL', () => {
    expect(() => loadPlatformEnv({ SUPABASE_ANON_KEY: 'x' })).toThrow(ValidationError);
  });

  it('fejler ved ugyldig PLATFORM_ENV', () => {
    expect(() =>
      loadPlatformEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        PLATFORM_ENV: 'not-a-real-env',
      }),
    ).toThrow(ValidationError);
  });
});

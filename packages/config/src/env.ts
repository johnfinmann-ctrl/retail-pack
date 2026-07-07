/**
 * Miljøkonfiguration. Læser og validerer miljøvariabler ét sted, så en
 * manglende/forkert konfiguration fejler tydeligt ved opstart — ikke som en
 * kryptisk fejl dybt inde i et Supabase-kald senere.
 */

import { ValidationError } from './errors';

export interface PlatformEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** 'production' | 'staging' | 'development' — bruges bl.a. til logniveau. */
  environment: 'production' | 'staging' | 'development';
}

/**
 * Læser platform-miljøvariabler fra en vilkårlig kilde (import.meta.env i
 * Vite-apps, process.env i Node/Edge Functions) uden at binde denne pakke
 * til én bestemt runtime.
 */
export function loadPlatformEnv(source: Record<string, string | undefined>): PlatformEnv {
  const supabaseUrl = source.SUPABASE_URL ?? source.VITE_SUPABASE_URL;
  const supabaseAnonKey = source.SUPABASE_ANON_KEY ?? source.VITE_SUPABASE_ANON_KEY;
  const environmentRaw = source.PLATFORM_ENV ?? source.VITE_PLATFORM_ENV ?? 'development';

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new ValidationError(`Manglende påkrævede miljøvariabler: ${missing.join(', ')}`, {
      missing,
    });
  }

  if (!['production', 'staging', 'development'].includes(environmentRaw)) {
    throw new ValidationError(`Ugyldig PLATFORM_ENV-værdi: "${environmentRaw}"`, {
      value: environmentRaw,
    });
  }

  return {
    supabaseUrl: supabaseUrl as string,
    supabaseAnonKey: supabaseAnonKey as string,
    environment: environmentRaw as PlatformEnv['environment'],
  };
}

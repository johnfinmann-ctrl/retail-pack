/**
 * Samler @platform/auth's Supabase-klient med @platform/data's fejl-/
 * logging-wrapper — den konkrete "Platform Core"-del af laget
 * UI → Services → Repositories → Platform Core → Supabase.
 * Bruges til at bygge repositories (createSupabaseRepositories) i Trin 5/6.
 */
import { getSupabaseClient } from '@platform/auth';
import { createDataClient, type DataClient } from '@platform/data';
import { ConsoleLogger } from '@platform/logging';

import { getEnv } from './env';

let cached: DataClient | null = null;

export function getDataClient(): DataClient {
  if (!cached) {
    const logger = new ConsoleLogger('warn'); // kun advarsler/fejl i klienten, ikke støj
    cached = createDataClient(getSupabaseClient(getEnv()), logger);
  }
  return cached;
}

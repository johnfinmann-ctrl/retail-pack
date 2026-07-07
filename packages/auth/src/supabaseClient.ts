/**
 * Supabase-klient-fabrik. Ét sted der kender til Supabase-SDK'et direkte —
 * alt andet i platformen taler til denne pakkes typed funktioner, aldrig
 * direkte til supabase-js (PRS §12/§30).
 */
import type { PlatformEnv } from '@platform/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';


let cachedClient: SupabaseClient | null = null;

export function createSupabaseClient(env: PlatformEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/** Singleton til klient-apps — undgår at oprette flere forbindelser pr. render. */
export function getSupabaseClient(env: PlatformEnv): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient(env);
  }
  return cachedClient;
}

/** Kun til test — nulstiller singleton mellem tests. */
export function resetSupabaseClientForTests(): void {
  cachedClient = null;
}

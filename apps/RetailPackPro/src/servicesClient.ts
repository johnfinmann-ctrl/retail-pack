/**
 * Sammensætningsroden for HELE kæden UI → Services → Repositories →
 * Platform Core → Supabase. Dette er den ENESTE fil, React-komponenter må
 * importere for at få adgang til forretningslogik — ALDRIG
 * data/repositories/* eller Supabase-klienten direkte fra en skærm.
 */
import { createSupabaseRepositories } from './data/repositories';
import { getDataClient } from './dataClient';
import { createServices, type Services } from './services';

let cached: Services | null = null;

export function getServices(): Services {
  if (!cached) {
    cached = createServices(createSupabaseRepositories(getDataClient()));
  }
  return cached;
}

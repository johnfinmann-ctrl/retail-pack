/**
 * Sammensætningsroden for repository-laget. Dette er den ENESTE fil i hele
 * appen, der importerer de konkrete Supabase*Repository-klasser direkte —
 * alt andet (Services, UI) arbejder udelukkende med interfaces.ts's typer.
 *
 * Tager en @platform/data DataClient (ikke en rå Supabase-klient) — det er
 * selve håndhævelsen af laget UI → Services → Repositories → Platform Core
 * → Supabase. Skulle Supabase nogensinde udskiftes, er DataClient's egen
 * implementering (i @platform/data) det eneste, der skal ændres.
 */
import type { DataClient } from '@platform/data';

import type { Repositories } from './interfaces';
import { SupabaseCustomerRepository } from './supabase/SupabaseCustomerRepository';
import { SupabasePackagingRepository } from './supabase/SupabasePackagingRepository';
import { SupabasePackProfileRepository } from './supabase/SupabasePackProfileRepository';
import { SupabasePackSessionRepository } from './supabase/SupabasePackSessionRepository';
import { SupabaseProductRepository } from './supabase/SupabaseProductRepository';

export function createSupabaseRepositories(data: DataClient): Repositories {
  return {
    customers: new SupabaseCustomerRepository(data),
    products: new SupabaseProductRepository(data),
    packaging: new SupabasePackagingRepository(data),
    packProfiles: new SupabasePackProfileRepository(data),
    packSessions: new SupabasePackSessionRepository(data),
  };
}

export type { Repositories } from './interfaces';
export type {
  CustomerRepository,
  PackagingRepository,
  PackProfileRepository,
  PackSessionRepository,
  ProductRepository,
} from './interfaces';

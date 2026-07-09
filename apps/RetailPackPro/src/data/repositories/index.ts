/**
 * Sammensætningsroden for repository-laget. Dette er den ENESTE fil i hele
 * appen, der importerer de konkrete Supabase*Repository-klasser direkte —
 * alt andet (Services, UI) arbejder udelukkende med interfaces.ts's typer.
 *
 * Skulle Supabase nogensinde udskiftes, er dette den eneste fil, der skal
 * ændres — Services-laget forbliver uændret.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Repositories } from './interfaces';
import { SupabaseCustomerRepository } from './supabase/SupabaseCustomerRepository';
import { SupabasePackagingRepository } from './supabase/SupabasePackagingRepository';
import { SupabasePackProfileRepository } from './supabase/SupabasePackProfileRepository';
import { SupabasePackSessionRepository } from './supabase/SupabasePackSessionRepository';
import { SupabaseProductRepository } from './supabase/SupabaseProductRepository';

export function createSupabaseRepositories(client: SupabaseClient): Repositories {
  return {
    customers: new SupabaseCustomerRepository(client),
    products: new SupabaseProductRepository(client),
    packaging: new SupabasePackagingRepository(client),
    packProfiles: new SupabasePackProfileRepository(client),
    packSessions: new SupabasePackSessionRepository(client),
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

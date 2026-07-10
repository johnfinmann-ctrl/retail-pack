/**
 * Repository-interfaces — den ENESTE kontrakt Application Services-laget
 * kender til. UI kalder Services, Services kalder disse interfaces, ALDRIG
 * en konkret Supabase-implementering direkte.
 *
 * Dette gør det muligt at:
 * - udskifte Supabase-implementeringen senere uden at ændre Services/UI
 * - injicere fake/mock-implementeringer i tests (se __tests__/)
 * - genbruge Services-laget i en anden app, hvis den bruger samme domæne
 */
import type {
  Customer,
  NewPackSession,
  PackagingItem,
  PackFlowStep,
  PackProfile,
  PackSession,
  Product,
  ReferenceImage,
} from '../types';

export interface CustomerRepository {
  listActive(companyId: string): Promise<Customer[]>;
  getById(customerId: string): Promise<Customer | null>;
}

export interface ProductRepository {
  findByEan(companyId: string, ean: string): Promise<Product | null>;
  searchByName(companyId: string, query: string): Promise<Product[]>;
  getById(productId: string): Promise<Product | null>;
  /** Til Admin's grundlæggende produktoversigt (PRS §9 Admin). */
  listAll(companyId: string): Promise<Product[]>;
}

export interface PackagingRepository {
  listByIds(ids: readonly string[]): Promise<PackagingItem[]>;
}

export interface PackProfileRepository {
  /**
   * Finder den PUBLICEREDE profil, der gælder for en kunde+produkt-
   * kombination. Håndterer selv reglen "ingen pack_profile_products-rækker
   * = gælder for alle produkter" (PRS §2.2) — kaldende kode behøver ikke
   * kende denne regel.
   */
  findPublishedForCustomerAndProduct(customerId: string, productId: string): Promise<PackProfile | null>;
  listFlowSteps(companyId: string): Promise<PackFlowStep[]>;
  listReferenceImages(packProfileId: string): Promise<ReferenceImage[]>;
  /** Til Admin's grundlæggende oversigt — ALLE statusser (draft/published/archived). */
  listAllForCompany(companyId: string): Promise<PackProfile[]>;
}

export interface PackSessionRepository {
  create(session: NewPackSession): Promise<PackSession>;
  listOwn(userId: string): Promise<PackSession[]>;
}

/** Samlet sæt af alle repositories — det Application Services-laget modtager. */
export interface Repositories {
  customers: CustomerRepository;
  products: ProductRepository;
  packaging: PackagingRepository;
  packProfiles: PackProfileRepository;
  packSessions: PackSessionRepository;
}

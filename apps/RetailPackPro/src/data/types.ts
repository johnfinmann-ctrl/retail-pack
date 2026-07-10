/**
 * RetailPackPro's egne domænetyper. Bevidst adskilt fra databasens
 * snake_case-kolonnenavne (se mappers.ts) — så et fremtidigt databaseskift
 * (eller en anden navngivning) ikke tvinger ændringer igennem hele appen.
 */

export type PackFlowStepKey = 'packaging' | 'pallet' | 'photo' | 'approve';
export type PackProfileStatus = 'draft' | 'published' | 'archived';
export type PackagingItemType = 'box' | 'inner_packaging' | 'divider' | 'corner_protector' | 'pallet_type';

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  logoUrl: string | null;
  notes: string | null;
  packFlowMode: string | null;
}

export interface Product {
  id: string;
  companyId: string;
  ean: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
}

export interface PackagingItem {
  id: string;
  companyId: string;
  type: PackagingItemType;
  name: string;
  imageUrl: string | null;
  dimensions: string | null;
  notes: string | null;
}

export interface PackProfile {
  id: string;
  companyId: string;
  customerId: string;
  name: string;

  boxItemId: string | null;
  innerPackagingItemId: string | null;
  dividerItemId: string | null;
  cornerProtectorItemId: string | null;

  palletItemId: string | null;
  placementPatternImageUrl: string | null;
  maxHeightCm: number | null;
  maxWeightKg: number | null;
  layerCount: number | null;
  mixedPalletAllowed: boolean | null;
  labelPosition: string | null;
  ssccLabelRequired: boolean;
  foilType: string | null;
  overhangAllowed: boolean | null;
  specialInstructions: string | null;

  version: number;
  status: PackProfileStatus;
  effectiveFrom: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
  publishedAt: string | null;
  /** Binder alle versioner af SAMME logiske pakkemetode sammen (ikke vist i UI). */
  lineageId: string;
  /** "Beskriv kort ændringen" — sat ved publicering, aldrig for version 1. */
  changeSummary: string | null;
}

/**
 * Til "Se tidligere versioner". Bevidst en SEPARAT, minimal type — kun de
 * fire ting admin må se (versionsnummer, dato, bruger, ændringsbeskrivelse).
 * Ingen tekniske databasefelter (status som ord, id'er, låsefelter osv.)
 * lækker igennem denne type.
 */
export interface PackProfileVersionSummary {
  id: string;
  version: number;
  /** true for den version, der er aktiv/synlig for medarbejdere lige nu. */
  isCurrent: boolean;
  date: string;
  userName: string | null;
  changeSummary: string | null;
}

export interface PackFlowStep {
  id: string;
  companyId: string;
  stepKey: PackFlowStepKey;
  sortOrder: number;
  enabled: boolean;
}

export interface ReferenceImage {
  id: string;
  packProfileId: string;
  url: string;
  sortOrder: number;
  caption: string | null;
  relatedStep: PackFlowStepKey | null;
}

export interface PackSession {
  id: string;
  companyId: string;
  userId: string;
  customerId: string;
  productId: string;
  packProfileId: string;
  scannedCode: string | null;
  stepsCompleted: Record<string, unknown> | null;
  approvedAt: string;
  deviceInfo: Record<string, unknown> | null;
}

export interface NewPackSession {
  companyId: string;
  userId: string;
  customerId: string;
  productId: string;
  packProfileId: string;
  scannedCode?: string;
  stepsCompleted?: Record<string, unknown>;
  deviceInfo?: Record<string, unknown>;
}

export interface NewCustomer {
  companyId: string;
  name: string;
  logoUrl?: string | null;
}

export interface NewProduct {
  companyId: string;
  ean: string;
  name: string;
  imageUrl?: string | null;
}

export interface NewPackagingItem {
  companyId: string;
  type: PackagingItemType;
  name: string;
  imageUrl?: string | null;
}

export interface NewPackProfile {
  companyId: string;
  customerId: string;
  name: string;
  palletItemId?: string | null;
  maxHeightCm?: number | null;
  maxWeightKg?: number | null;
  layerCount?: number | null;
  mixedPalletAllowed?: boolean | null;
  labelPosition?: string | null;
  foilType?: string | null;
  specialInstructions?: string | null;
  createdBy: string;
  /** Tom/udeladt = gælder for alle kundens produkter (PRS §2.2). */
  productIds?: string[];
}

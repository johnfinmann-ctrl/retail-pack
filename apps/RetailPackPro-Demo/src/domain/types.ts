/**
 * v0.4.0-domæneudvidelser til RetailPackPro.
 *
 * Alt her er skrevet, så det kan flyttes direkte ind i apps/RetailPackPro
 * (og få en tilsvarende Supabase-migration), når demoen er godkendt. Typerne
 * UDVIDER v0.3.0's typer — de erstatter dem ikke — så v0.3.0's services kan
 * arbejde videre på de samme objekter.
 */
import type { Customer, PackProfile, Product } from '@rpp/data/types';

/** Produkt med de felter, medarbejderen skal kunne genkende varen på. */
export interface ProductV4 extends Product {
  /** Internt varenummer (fx "CH-1001"). EAN ligger fortsat i `ean`. */
  itemNumber: string;
}

/** Kunde med aktiv/inaktiv og markering af testkunder. */
export interface CustomerV4 extends Customer {
  active: boolean;
  isTestCustomer: boolean;
}

/**
 * Pakkevejledning med v0.4.0-felter. Versioneres sammen med resten af
 * profilen (kopieres med, når en ny kladde oprettes).
 * `placementPatternImageUrl` (fra v0.3.0) bruges som "billede af færdigpakket palle".
 */
export interface PackProfileV4 extends PackProfile {
  /** Kolli pr. lag. */
  unitsPerLayer: number | null;
}

/** Felter, der kan gemmes på en kladde ud over v0.3.0's NewPackProfile. */
export interface PackProfileV4Fields {
  unitsPerLayer?: number | null;
  placementPatternImageUrl?: string | null;
  overhangAllowed?: boolean | null;
  ssccLabelRequired?: boolean;
}

// ---------------------------------------------------------------- Ordrer

export type OrderStatus = 'open' | 'in_progress' | 'completed';

export interface OrderLine {
  id: string;
  productId: string;
  /** Bestilt antal kolli. */
  quantity: number;
}

export interface Order {
  id: string;
  companyId: string;
  orderNumber: string;
  customerId: string;
  deliveryDate: string;
  status: OrderStatus;
  lines: OrderLine[];
  note: string | null;
  completedAt: string | null;
  completedBy: string | null;
}

export interface PalletLine {
  productId: string;
  quantity: number;
}

/** En færdigpakket, registreret palle på en ordre. */
export interface Pallet {
  id: string;
  orderId: string;
  /** Løbenummer på ordren: 1, 2, 3 … */
  number: number;
  lines: PalletLine[];
  registeredAt: string;
  registeredBy: string;
}

// ---------------------------------------------------------------- Foto

export interface PhotoRecord {
  id: string;
  companyId: string;
  orderId: string;
  /** null = billede til ordren som helhed. */
  palletId: string | null;
  createdAt: string;
  createdBy: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

/** Billede tilknyttet en pakkevejledning (vises for medarbejderen). */
export interface ReferenceImageInput {
  packProfileId: string;
  url: string;
  caption: string | null;
}

export const MAX_PHOTOS_PER_ORDER = 35;

/** Samlet oversigt over én ordres fremdrift — beregnes af OrderService. */
export interface OrderProgress {
  totalQuantity: number;
  packedQuantity: number;
  remainingQuantity: number;
  palletsDone: number;
  /** Skøn over antal paller i alt, ud fra pakkevejledningernes kapacitet. null = kan ikke beregnes. */
  palletsEstimated: number | null;
  lines: Array<{
    line: OrderLine;
    packed: number;
    remaining: number;
    /** Kolli pr. palle for denne vare, hvis pakkevejledningen angiver lag × kolli pr. lag. */
    capacityPerPallet: number | null;
  }>;
  canComplete: boolean;
}

export type { Customer, PackProfile, Product };

/**
 * v0.4.0-repository-kontrakter. Følger samme princip som v0.3.0's
 * data/repositories/interfaces.ts: services kender KUN disse interfaces —
 * demoens lokale lager og en senere Supabase-implementering er udskiftelige.
 */
import type { Repositories } from '@rpp/data/repositories/interfaces';
import type { ReferenceImage } from '@rpp/data/types';

import type {
  CustomerV4,
  Order,
  OrderStatus,
  Pallet,
  PalletLine,
  PhotoRecord,
  ProductV4,
  ReferenceImageInput,
} from './types';

export interface CatalogAdminRepository {
  listAllCustomers(companyId: string): Promise<CustomerV4[]>;
  updateCustomer(customerId: string, fields: Partial<Pick<CustomerV4, 'name' | 'logoUrl' | 'active' | 'notes'>>): Promise<CustomerV4>;
  createCustomerV4(input: { companyId: string; name: string; logoUrl: string | null; notes: string | null }): Promise<CustomerV4>;
  findByItemNumber(companyId: string, itemNumber: string): Promise<ProductV4 | null>;
  createProductV4(input: Omit<ProductV4, 'id' | 'description' | 'category'> & { category?: string | null }): Promise<ProductV4>;
  updateProduct(
    productId: string,
    fields: Partial<Pick<ProductV4, 'name' | 'ean' | 'itemNumber' | 'imageUrl' | 'category'>>,
  ): Promise<ProductV4>;
  getProductLinks(packProfileId: string): Promise<string[]>;
}

export interface ReferenceImageAdminRepository {
  addReferenceImage(input: ReferenceImageInput): Promise<ReferenceImage>;
  removeReferenceImage(referenceImageId: string): Promise<void>;
}

export interface OrderRepository {
  listForCompany(companyId: string): Promise<Order[]>;
  findByNumber(companyId: string, orderNumber: string): Promise<Order | null>;
  getById(orderId: string): Promise<Order | null>;
  setStatus(orderId: string, status: OrderStatus, completedBy?: string | null): Promise<Order>;
  listPallets(orderId: string): Promise<Pallet[]>;
  addPallet(orderId: string, lines: PalletLine[], registeredBy: string): Promise<Pallet>;
  removePallet(palletId: string): Promise<void>;
}

export interface PhotoRepository {
  listForOrder(orderId: string): Promise<PhotoRecord[]>;
  add(record: Omit<PhotoRecord, 'id' | 'createdAt'>, data: Blob): Promise<PhotoRecord>;
  getData(photoId: string): Promise<Blob | null>;
  remove(photoId: string): Promise<void>;
}

/** Alt, v0.4.0-services modtager: v0.3.0's repositories + udvidelserne. */
export interface RepositoriesV4 extends Repositories {
  catalog: CatalogAdminRepository;
  referenceImages: ReferenceImageAdminRepository;
  orders: OrderRepository;
  photos: PhotoRepository;
}

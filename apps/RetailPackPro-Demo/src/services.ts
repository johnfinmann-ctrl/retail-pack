/**
 * Sammensætningsrod for demoen: v0.3.0's services (UÆNDREDE, via @rpp) +
 * v0.4.0-services, alle kørende på demo-datalaget. Skærme importerer kun herfra.
 */
import { createServices, type Services } from '@rpp/services';

import { createDemoRepositories, DemoDatabase } from './data/DemoRepositories';
import type { DemoState } from './demo/seed';
import { JsonStorage, openBlobStore, type BlobStore } from './demo/storage';
import type { RepositoriesV4 } from './domain/interfaces';
import { OrderService } from './domain/OrderService';
import { PackGuideAdminService } from './domain/PackGuideAdminService';
import { PhotoService } from './domain/PhotoService';
import { ProductLookupService } from './domain/ProductLookupService';

export const STORAGE_KEY = 'retailpackpro-demo-v0.4.0';

export interface AppServices extends Services {
  lookup: ProductLookupService;
  orders: OrderService;
  photos: PhotoService;
  guideAdmin: PackGuideAdminService;
  repos: RepositoriesV4;
  db: DemoDatabase;
}

export function composeServices(db: DemoDatabase): AppServices {
  const repos = createDemoRepositories(db);
  const base = createServices(repos);
  return {
    ...base,
    lookup: new ProductLookupService(repos),
    orders: new OrderService(repos),
    photos: new PhotoService(repos),
    guideAdmin: new PackGuideAdminService(repos, base),
    repos,
    db,
  };
}

let instance: AppServices | null = null;

export async function initServices(blobStore?: BlobStore): Promise<AppServices> {
  if (instance) return instance;
  const blobs = blobStore ?? (await openBlobStore());
  const db = new DemoDatabase(new JsonStorage<DemoState>(STORAGE_KEY), blobs);
  instance = composeServices(db);
  return instance;
}

export function getServices(): AppServices {
  if (!instance) throw new Error('Services er ikke initialiseret');
  return instance;
}

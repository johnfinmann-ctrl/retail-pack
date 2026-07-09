/**
 * Sammensætningsroden for Application Services-laget. UI importerer
 * UDELUKKENDE herfra — aldrig fra data/repositories/* direkte.
 */
import type { Repositories } from '../data/repositories/interfaces';

import { CustomerService } from './CustomerService';
import { PackGuideService } from './PackGuideService';
import { PackSessionService } from './PackSessionService';
import { ProductService } from './ProductService';

export interface Services {
  customers: CustomerService;
  products: ProductService;
  packGuide: PackGuideService;
  packSessions: PackSessionService;
}

export function createServices(repositories: Repositories): Services {
  return {
    customers: new CustomerService(repositories),
    products: new ProductService(repositories),
    packGuide: new PackGuideService(repositories),
    packSessions: new PackSessionService(repositories),
  };
}

export type { PackGuide } from './PackGuideService';

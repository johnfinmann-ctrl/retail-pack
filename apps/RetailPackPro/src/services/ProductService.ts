import type { Repositories } from '../data/repositories/interfaces';
import type { Product } from '../data/types';

export class ProductService {
  constructor(private readonly repos: Pick<Repositories, 'products'>) {}

  findByEan(companyId: string, ean: string): Promise<Product | null> {
    return this.repos.products.findByEan(companyId, ean);
  }

  /** Fallback når scanning fejler/koden ikke findes (PRS §4.2) — aldrig en blindgyde. */
  searchByName(companyId: string, query: string): Promise<Product[]> {
    return this.repos.products.searchByName(companyId, query);
  }
}

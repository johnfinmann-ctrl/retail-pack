import type { Repositories } from '../data/repositories/interfaces';
import type { NewProduct, Product } from '../data/types';

export class ProductService {
  constructor(private readonly repos: Pick<Repositories, 'products'>) {}

  findByEan(companyId: string, ean: string): Promise<Product | null> {
    return this.repos.products.findByEan(companyId, ean);
  }

  /** Fallback når scanning fejler/koden ikke findes (PRS §4.2) — aldrig en blindgyde. */
  searchByName(companyId: string, query: string): Promise<Product[]> {
    return this.repos.products.searchByName(companyId, query);
  }

  /** Til Admin's grundlæggende produktoversigt. */
  listAll(companyId: string): Promise<Product[]> {
    return this.repos.products.listAll(companyId);
  }

  createProduct(input: NewProduct): Promise<Product> {
    return this.repos.products.create(input);
  }
}

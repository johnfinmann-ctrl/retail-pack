import { describe, expect, it } from 'vitest';

import { FakeProductRepository } from '../../data/repositories/__tests__/fakes';
import type { Product } from '../../data/types';
import { ProductService } from '../ProductService';

const products: Product[] = [
  { id: 'p1', companyId: 'company-1', ean: '5900000000011', name: 'Demo Bland-Selv Slik', description: null, imageUrl: null, category: null },
];

describe('ProductService', () => {
  it('finder produkt via EAN', async () => {
    const service = new ProductService({ products: new FakeProductRepository(products) });
    const result = await service.findByEan('company-1', '5900000000011');
    expect(result?.name).toBe('Demo Bland-Selv Slik');
  });

  it('returnerer null (ikke fejl) hvis stregkoden ikke findes — PRS §4.2 fallback til søgning', async () => {
    const service = new ProductService({ products: new FakeProductRepository(products) });
    const result = await service.findByEan('company-1', '0000000000000');
    expect(result).toBeNull();
  });

  it('søger på produktnavn som fallback', async () => {
    const service = new ProductService({ products: new FakeProductRepository(products) });
    const result = await service.searchByName('company-1', 'bland');
    expect(result).toHaveLength(1);
  });

  it('lister alle produkter for Admin-oversigten', async () => {
    const service = new ProductService({ products: new FakeProductRepository(products) });
    const result = await service.listAll('company-1');
    expect(result).toHaveLength(1);
  });
});

describe('ProductService.createProduct', () => {
  it('opretter et nyt produkt', async () => {
    const repo = new FakeProductRepository([]);
    const service = new ProductService({ products: repo });
    const created = await service.createProduct({ companyId: 'company-1', ean: '5900000000097', name: 'Nyt Testprodukt' });
    expect(created.name).toBe('Nyt Testprodukt');
    expect(created.ean).toBe('5900000000097');
  });
});

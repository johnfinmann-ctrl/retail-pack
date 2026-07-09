import type { DataClient } from '@platform/data';

import { mapProductRow } from '../../mappers';
import type { Product } from '../../types';
import type { ProductRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly data: DataClient) {}

  async findByEan(companyId: string, ean: string): Promise<Product | null> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('ean', ean)
        .is('deleted_at', null)
        .maybeSingle(),
    );
    return row ? mapProductRow(row) : null;
  }

  async searchByName(companyId: string, query: string): Promise<Product[]> {
    const rows = await this.data.runMany(
      this.data
        .schema(RPP_SCHEMA)
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(20),
    );
    return rows.map(mapProductRow);
  }

  async getById(productId: string): Promise<Product | null> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('products')
        .select('*')
        .eq('id', productId)
        .is('deleted_at', null)
        .maybeSingle(),
    );
    return row ? mapProductRow(row) : null;
  }
}

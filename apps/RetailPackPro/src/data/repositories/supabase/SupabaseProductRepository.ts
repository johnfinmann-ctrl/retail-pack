import { toAppError } from '@platform/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { mapProductRow } from '../../mappers';
import type { Product } from '../../types';
import type { ProductRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByEan(companyId: string, ean: string): Promise<Product | null> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('ean', ean)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw toAppError(error);
    return data ? mapProductRow(data) : null;
  }

  async searchByName(companyId: string, query: string): Promise<Product[]> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(20);

    if (error) throw toAppError(error);
    return (data ?? []).map(mapProductRow);
  }

  async getById(productId: string): Promise<Product | null> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('products')
      .select('*')
      .eq('id', productId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw toAppError(error);
    return data ? mapProductRow(data) : null;
  }
}

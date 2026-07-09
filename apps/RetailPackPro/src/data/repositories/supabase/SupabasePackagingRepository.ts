import { toAppError } from '@platform/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { mapPackagingItemRow } from '../../mappers';
import type { PackagingItem } from '../../types';
import type { PackagingRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabasePackagingRepository implements PackagingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listByIds(ids: readonly string[]): Promise<PackagingItem[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('packaging_items')
      .select('*')
      .in('id', ids as string[])
      .is('deleted_at', null);

    if (error) throw toAppError(error);
    return (data ?? []).map(mapPackagingItemRow);
  }
}

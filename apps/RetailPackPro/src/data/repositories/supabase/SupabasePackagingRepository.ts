import type { DataClient } from '@platform/data';

import { mapPackagingItemRow } from '../../mappers';
import type { PackagingItem } from '../../types';
import type { PackagingRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabasePackagingRepository implements PackagingRepository {
  constructor(private readonly data: DataClient) {}

  async listByIds(ids: readonly string[]): Promise<PackagingItem[]> {
    if (ids.length === 0) return [];

    const rows = await this.data.runMany(
      this.data
        .schema(RPP_SCHEMA)
        .from('packaging_items')
        .select('*')
        .in('id', ids as string[])
        .is('deleted_at', null),
    );
    return rows.map(mapPackagingItemRow);
  }
}

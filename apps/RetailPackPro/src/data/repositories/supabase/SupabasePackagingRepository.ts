import type { DataClient } from '@platform/data';

import { mapPackagingItemRow } from '../../mappers';
import type { NewPackagingItem, PackagingItem, PackagingItemType } from '../../types';
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

  async listByType(companyId: string, type: PackagingItemType): Promise<PackagingItem[]> {
    const rows = await this.data.runMany(
      this.data
        .schema(RPP_SCHEMA)
        .from('packaging_items')
        .select('*')
        .eq('company_id', companyId)
        .eq('type', type)
        .is('deleted_at', null)
        .order('name'),
    );
    return rows.map(mapPackagingItemRow);
  }

  async create(input: NewPackagingItem): Promise<PackagingItem> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('packaging_items')
        .insert({
          company_id: input.companyId,
          type: input.type,
          name: input.name,
          image_url: input.imageUrl ?? null,
        })
        .select('*')
        .single(),
    );
    return mapPackagingItemRow(row);
  }
}

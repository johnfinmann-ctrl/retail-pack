import type { DataClient } from '@platform/data';

import { mapPackSessionRow } from '../../mappers';
import type { NewPackSession, PackSession } from '../../types';
import type { PackSessionRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabasePackSessionRepository implements PackSessionRepository {
  constructor(private readonly data: DataClient) {}

  async create(session: NewPackSession): Promise<PackSession> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_sessions')
        .insert({
          company_id: session.companyId,
          user_id: session.userId,
          customer_id: session.customerId,
          product_id: session.productId,
          pack_profile_id: session.packProfileId,
          scanned_code: session.scannedCode ?? null,
          steps_completed: session.stepsCompleted ?? null,
          device_info: session.deviceInfo ?? null,
        })
        .select('*')
        .single(),
    );
    return mapPackSessionRow(row);
  }

  async listOwn(userId: string): Promise<PackSession[]> {
    const rows = await this.data.runMany(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('approved_at', { ascending: false }),
    );
    return rows.map(mapPackSessionRow);
  }
}

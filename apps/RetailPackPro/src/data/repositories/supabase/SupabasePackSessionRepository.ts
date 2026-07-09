import { toAppError } from '@platform/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { mapPackSessionRow } from '../../mappers';
import type { NewPackSession, PackSession } from '../../types';
import type { PackSessionRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabasePackSessionRepository implements PackSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(session: NewPackSession): Promise<PackSession> {
    const { data, error } = await this.client
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
      .single();

    if (error) throw toAppError(error);
    return mapPackSessionRow(data);
  }

  async listOwn(userId: string): Promise<PackSession[]> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('pack_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('approved_at', { ascending: false });

    if (error) throw toAppError(error);
    return (data ?? []).map(mapPackSessionRow);
  }
}

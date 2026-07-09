import { toAppError } from '@platform/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { mapPackFlowStepRow, mapPackProfileRow, mapReferenceImageRow } from '../../mappers';
import type { PackFlowStep, PackProfile, ReferenceImage } from '../../types';
import type { PackProfileRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

interface PackProfileRowWithLinks {
  id: string;
  updated_at: string;
  pack_profile_products: Array<{ product_id: string }> | null;
  [key: string]: unknown;
}

export class SupabasePackProfileRepository implements PackProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * "Gælder for alle produkter, hvis ingen rækker findes i
   * pack_profile_products; ellers kun for de listede produkter" (PRS §2.2)
   * afgøres her i TypeScript — bevidst IKKE i en Postgres-funktion, så
   * reglen forbliver mockbar/testbar uden en database og kan genbruges,
   * hvis Supabase nogensinde udskiftes.
   */
  async findPublishedForCustomerAndProduct(
    customerId: string,
    productId: string,
  ): Promise<PackProfile | null> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('pack_profiles')
      .select('*, pack_profile_products(product_id)')
      .eq('customer_id', customerId)
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (error) throw toAppError(error);

    const rows = (data ?? []) as PackProfileRowWithLinks[];
    const match = rows.find((row) => {
      const links = row.pack_profile_products ?? [];
      return links.length === 0 || links.some((link) => link.product_id === productId);
    });

    return match ? mapPackProfileRow(match) : null;
  }

  async listFlowSteps(companyId: string): Promise<PackFlowStep[]> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('pack_flow_steps')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order');

    if (error) throw toAppError(error);
    return (data ?? []).map(mapPackFlowStepRow);
  }

  async listReferenceImages(packProfileId: string): Promise<ReferenceImage[]> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('reference_images')
      .select('*')
      .eq('pack_profile_id', packProfileId)
      .order('sort_order');

    if (error) throw toAppError(error);
    return (data ?? []).map(mapReferenceImageRow);
  }
}

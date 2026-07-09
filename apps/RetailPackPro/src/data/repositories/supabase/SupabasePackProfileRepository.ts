import type { DataClient } from '@platform/data';

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
  constructor(private readonly data: DataClient) {}

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
    const rows = await this.data.runMany<PackProfileRowWithLinks>(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_profiles')
        .select('*, pack_profile_products(product_id)')
        .eq('customer_id', customerId)
        .eq('status', 'published')
        .order('updated_at', { ascending: false }),
    );

    const match = rows.find((row) => {
      const links = row.pack_profile_products ?? [];
      return links.length === 0 || links.some((link) => link.product_id === productId);
    });

    return match ? mapPackProfileRow(match) : null;
  }

  async listFlowSteps(companyId: string): Promise<PackFlowStep[]> {
    const rows = await this.data.runMany(
      this.data.schema(RPP_SCHEMA).from('pack_flow_steps').select('*').eq('company_id', companyId).order('sort_order'),
    );
    return rows.map(mapPackFlowStepRow);
  }

  async listReferenceImages(packProfileId: string): Promise<ReferenceImage[]> {
    const rows = await this.data.runMany(
      this.data
        .schema(RPP_SCHEMA)
        .from('reference_images')
        .select('*')
        .eq('pack_profile_id', packProfileId)
        .order('sort_order'),
    );
    return rows.map(mapReferenceImageRow);
  }
}

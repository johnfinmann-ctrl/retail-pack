import type { DataClient } from '@platform/data';

import { mapPackFlowStepRow, mapPackProfileRow, mapReferenceImageRow } from '../../mappers';
import type { NewPackProfile, PackFlowStep, PackProfile, ReferenceImage } from '../../types';
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

  async listAllForCompany(companyId: string): Promise<PackProfile[]> {
    const rows = await this.data.runMany(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_profiles')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name'),
    );
    return rows.map(mapPackProfileRow);
  }

  async create(input: NewPackProfile): Promise<PackProfile> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_profiles')
        .insert({
          company_id: input.companyId,
          customer_id: input.customerId,
          name: input.name,
          pallet_item_id: input.palletItemId ?? null,
          max_height_cm: input.maxHeightCm ?? null,
          max_weight_kg: input.maxWeightKg ?? null,
          layer_count: input.layerCount ?? null,
          mixed_pallet_allowed: input.mixedPalletAllowed ?? null,
          label_position: input.labelPosition ?? null,
          foil_type: input.foilType ?? null,
          special_instructions_richtext: input.specialInstructions ?? null,
          status: 'draft',
          created_by: input.createdBy,
          updated_by: input.createdBy,
        })
        .select('*')
        .single(),
    );
    return mapPackProfileRow(row);
  }

  async publish(profileId: string, publishedByUserId: string): Promise<PackProfile> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_profiles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_by: publishedByUserId,
        })
        .eq('id', profileId)
        .select('*')
        .single(),
    );
    return mapPackProfileRow(row);
  }

  async setProductLinks(profileId: string, productIds: readonly string[]): Promise<void> {
    if (productIds.length === 0) return; // ingen rækker = gælder for alle (PRS §2.2) — intet at skrive

    const rows = productIds.map((productId) => ({ pack_profile_id: profileId, product_id: productId }));
    await this.data.runMany(this.data.schema(RPP_SCHEMA).from('pack_profile_products').insert(rows).select('*'));
  }
}

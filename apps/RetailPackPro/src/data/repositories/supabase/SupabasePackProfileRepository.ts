import { ConflictError, toAppError } from '@platform/config';
import type { DataClient } from '@platform/data';

import { mapPackFlowStepRow, mapPackProfileRow, mapReferenceImageRow } from '../../mappers';
import type { NewPackProfile, PackFlowStep, PackProfile, PackProfileVersionSummary, ReferenceImage } from '../../types';
import type { PackProfileRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

interface PackProfileRowWithLinks {
  id: string;
  updated_at: string;
  pack_profile_products: Array<{ product_id: string }> | null;
  [key: string]: unknown;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- rå DB-række, kun brugt internt før mapPackProfileRow */
type PackProfileRow = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

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

  // ---- Redigering af en allerede publiceret pakkemetode ----

  async findDraftForLineage(lineageId: string): Promise<PackProfile | null> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_profiles')
        .select('*')
        .eq('lineage_id', lineageId)
        .eq('status', 'draft')
        .maybeSingle(),
    );
    return row ? mapPackProfileRow(row) : null;
  }

  async createDraftFromVersion(sourceVersionId: string, editingUserId: string): Promise<PackProfile> {
    const published = await this.data.run<PackProfileRow>(
      this.data.schema(RPP_SCHEMA).from('pack_profiles').select('*').eq('id', sourceVersionId).single(),
    );
    if (!published) {
      throw new Error(`Version ${sourceVersionId} findes ikke`);
    }

    try {
      const draftRow = await this.data.run<PackProfileRow>(
        this.data
          .schema(RPP_SCHEMA)
          .from('pack_profiles')
          .insert({
            company_id: published.company_id,
            customer_id: published.customer_id,
            lineage_id: published.lineage_id,
            name: published.name,
            box_item_id: published.box_item_id,
            inner_packaging_item_id: published.inner_packaging_item_id,
            divider_item_id: published.divider_item_id,
            corner_protector_item_id: published.corner_protector_item_id,
            pallet_item_id: published.pallet_item_id,
            placement_pattern_image_url: published.placement_pattern_image_url,
            max_height_cm: published.max_height_cm,
            max_weight_kg: published.max_weight_kg,
            layer_count: published.layer_count,
            mixed_pallet_allowed: published.mixed_pallet_allowed,
            label_position: published.label_position,
            sscc_label_required: published.sscc_label_required,
            foil_type: published.foil_type,
            overhang_allowed: published.overhang_allowed,
            special_instructions_richtext: published.special_instructions_richtext,
            version: published.version + 1,
            status: 'draft',
            created_by: editingUserId,
            updated_by: editingUserId,
            locked_by: editingUserId,
            locked_at: new Date().toISOString(),
          })
          .select('*')
          .single(),
      );
      if (!draftRow) {
        throw new Error('Kladde kunne ikke oprettes');
      }

      // Kopiér hvilke produkter reglen gælder for, så kladden starter identisk
      // med kilde-versionen.
      const existingLinks = await this.data.runMany<{ product_id: string }>(
        this.data
          .schema(RPP_SCHEMA)
          .from('pack_profile_products')
          .select('product_id')
          .eq('pack_profile_id', sourceVersionId),
      );
      if (existingLinks.length > 0) {
        await this.data.runMany(
          this.data
            .schema(RPP_SCHEMA)
            .from('pack_profile_products')
            .insert(existingLinks.map((link) => ({ pack_profile_id: draftRow.id, product_id: link.product_id })))
            .select('*'),
        );
      }

      return mapPackProfileRow(draftRow);
    } catch (error) {
      // Postgres 23505 = unique_violation. Rammes hvis en anden admin når at
      // oprette kladden i det lille tidsrum mellem tjek og forsøg på oprettelse
      // (samtidighed) — omsættes til ConflictError, så Services-laget kan
      // fange den specifikt og genfremvise "en anden redigerer allerede".
      // toAppError() (kaldt inde i this.data.run) gemmer den rå Postgrest-fejl
      // i context.raw, fordi den ikke er en almindelig JS Error-instans.
      const appError = toAppError(error);
      const rawCode = (appError.context?.raw as { code?: string } | undefined)?.code;
      if (rawCode === '23505') {
        throw new ConflictError('En anden admin er allerede i gang med at redigere denne pakkemetode', {
          lineageId: published.lineage_id,
        });
      }
      throw appError;
    }
  }

  async updateDraft(draftId: string, fields: Partial<NewPackProfile>): Promise<PackProfile> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_profiles')
        .update({
          ...(fields.customerId !== undefined ? { customer_id: fields.customerId } : {}),
          ...(fields.name !== undefined ? { name: fields.name } : {}),
          ...(fields.palletItemId !== undefined ? { pallet_item_id: fields.palletItemId } : {}),
          ...(fields.maxHeightCm !== undefined ? { max_height_cm: fields.maxHeightCm } : {}),
          ...(fields.maxWeightKg !== undefined ? { max_weight_kg: fields.maxWeightKg } : {}),
          ...(fields.layerCount !== undefined ? { layer_count: fields.layerCount } : {}),
          ...(fields.mixedPalletAllowed !== undefined ? { mixed_pallet_allowed: fields.mixedPalletAllowed } : {}),
          ...(fields.labelPosition !== undefined ? { label_position: fields.labelPosition } : {}),
          ...(fields.foilType !== undefined ? { foil_type: fields.foilType } : {}),
          ...(fields.specialInstructions !== undefined
            ? { special_instructions_richtext: fields.specialInstructions }
            : {}),
        })
        .eq('id', draftId)
        .eq('status', 'draft') // en sikkerhedsspærre mere: kan aldrig ved en fejl ramme en publiceret række
        .select('*')
        .single(),
    );
    return mapPackProfileRow(row);
  }

  async publishDraft(draftId: string, publisherUserId: string, changeSummary?: string | null): Promise<PackProfile> {
    const row = await this.data.run<PackProfileRow>(
      this.data.schema(RPP_SCHEMA).rpc('publish_pack_profile_draft', {
        draft_id: draftId,
        publisher_id: publisherUserId,
        change_summary: changeSummary ?? null,
      }),
    );
    return mapPackProfileRow(row);
  }

  async discardDraft(draftId: string): Promise<void> {
    await this.data.runMany(
      this.data.schema(RPP_SCHEMA).from('pack_profiles').delete().eq('id', draftId).eq('status', 'draft').select('*'),
    );
  }

  async listVersionSummaries(lineageId: string): Promise<PackProfileVersionSummary[]> {
    const rows = await this.data.runMany<PackProfileRow>(
      this.data
        .schema(RPP_SCHEMA)
        .from('pack_profiles')
        .select('id, version, status, published_at, created_at, change_summary, updated_by')
        .eq('lineage_id', lineageId)
        .order('version', { ascending: false }),
    );

    // Slår brugernavne op ét ad gangen — antallet af versioner pr.
    // pakkemetode er lille nok til at N+1 her ikke er et reelt problem.
    const names = new Map<string, string | null>();
    for (const row of rows) {
      if (row.updated_by && !names.has(row.updated_by)) {
        names.set(row.updated_by, await this.getUserFullName(row.updated_by));
      }
    }

    return rows.map((row) => ({
      id: row.id,
      version: row.version,
      isCurrent: row.status === 'published',
      date: row.published_at ?? row.created_at,
      userName: row.updated_by ? (names.get(row.updated_by) ?? null) : null,
      changeSummary: row.change_summary,
    }));
  }

  async getUserFullName(userId: string): Promise<string | null> {
    const row = await this.data.run(
      this.data.schema('public').from('users').select('full_name').eq('id', userId).maybeSingle(),
    );
    return row ? (row as { full_name: string }).full_name : null;
  }
}

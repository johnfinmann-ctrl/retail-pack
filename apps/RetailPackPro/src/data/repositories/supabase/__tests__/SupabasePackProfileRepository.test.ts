/**
 * Fokuseret test af én snørklet detalje: at et Postgres unique_violation
 * (23505) — som opstår hvis to admins når at oprette en kladde for samme
 * lineage samtidig — bliver omsat til en venlig ConflictError, IKKE en rå
 * teknisk fejl. Bruger en minimal fake af @platform/data's DataClient
 * (ikke en ægte database) for at isolere præcis denne logik.
 */
import { ConflictError } from '@platform/config';
import type { DataClient, RawResult } from '@platform/data';
import { describe, expect, it } from 'vitest';

import { SupabasePackProfileRepository } from '../SupabasePackProfileRepository';

function makeFakeDataClient(overrides: { onSecondFromCall: 'unique_violation' | 'success' }): DataClient {
  let fromCallCount = 0;

  const publishedRow = {
    id: 'published-1',
    company_id: 'company-1',
    customer_id: 'customer-1',
    lineage_id: 'lineage-1',
    name: 'Test',
    version: 1,
    box_item_id: null,
    inner_packaging_item_id: null,
    divider_item_id: null,
    corner_protector_item_id: null,
    pallet_item_id: null,
    placement_pattern_image_url: null,
    max_height_cm: null,
    max_weight_kg: null,
    layer_count: null,
    mixed_pallet_allowed: null,
    label_position: null,
    sscc_label_required: false,
    foil_type: null,
    overhang_allowed: null,
    special_instructions_richtext: null,
  };

  const chain = {
    select: () => chain,
    eq: () => chain,
    insert: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    order: () => chain,
    delete: () => chain,
    rpc: () => chain,
    then: (resolve: (r: RawResult<unknown>) => void) => {
      fromCallCount += 1;
      if (fromCallCount === 1) {
        // Første kald: hent den publicerede profil
        resolve({ data: publishedRow, error: null });
        return;
      }
      // Andet kald: forsøg på at INSERT'e kladden
      if (overrides.onSecondFromCall === 'unique_violation') {
        resolve({
          data: null,
          error: { message: 'duplicate key value violates unique constraint', code: '23505' },
        });
      } else {
        resolve({ data: { ...publishedRow, id: 'draft-1', status: 'draft' }, error: null });
      }
    },
  };
  const schemaScope = { from: () => chain, rpc: () => chain };

  return {
    schema: () => schemaScope as unknown as ReturnType<DataClient['schema']>,
    run: async (query: PromiseLike<RawResult<unknown>>) => {
      const { data, error } = await query;
      if (error) throw error; // simulerer DataClient.run()'s reelle adfærd (kaster ved fejl)
      return data;
    },
    runMany: async (query: PromiseLike<RawResult<unknown[]>>) => {
      const { data } = await query;
      return data ?? [];
    },
  } as unknown as DataClient;
}

describe('SupabasePackProfileRepository.createDraftFromVersion', () => {
  it('konverterer Postgres unique_violation (23505) til en venlig ConflictError', async () => {
    const repo = new SupabasePackProfileRepository(makeFakeDataClient({ onSecondFromCall: 'unique_violation' }));
    await expect(repo.createDraftFromVersion('published-1', 'user-1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('opretter kladden normalt, når der ikke er noget kapløb', async () => {
    const repo = new SupabasePackProfileRepository(makeFakeDataClient({ onSecondFromCall: 'success' }));
    const draft = await repo.createDraftFromVersion('published-1', 'user-1');
    expect(draft.status).toBe('draft');
  });
});

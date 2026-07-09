import { describe, expect, it } from 'vitest';

import {
  FakePackagingRepository,
  FakePackProfileRepository,
} from '../../data/repositories/__tests__/fakes';
import type { PackagingItem, PackFlowStep, PackProfile, ReferenceImage } from '../../data/types';
import { PackGuideService } from '../PackGuideService';

const baseProfile: PackProfile = {
  id: 'profile-1',
  companyId: 'company-1',
  customerId: 'customer-1',
  name: 'Test-profil',
  boxItemId: 'box-1',
  innerPackagingItemId: null,
  dividerItemId: null,
  cornerProtectorItemId: null,
  palletItemId: 'pallet-1',
  placementPatternImageUrl: null,
  maxHeightCm: 150,
  maxWeightKg: 500,
  layerCount: 6,
  mixedPalletAllowed: false,
  labelPosition: null,
  ssccLabelRequired: true,
  foilType: null,
  overhangAllowed: false,
  specialInstructions: null,
  version: 1,
  status: 'published',
  effectiveFrom: null,
  createdBy: null,
  updatedBy: null,
  lockedBy: null,
  lockedAt: null,
  publishedAt: null,
};

const packagingItems: PackagingItem[] = [
  { id: 'box-1', companyId: 'company-1', type: 'box', name: 'Standardkasse', imageUrl: null, dimensions: null, notes: null },
  { id: 'pallet-1', companyId: 'company-1', type: 'pallet_type', name: 'EUR-palle', imageUrl: null, dimensions: null, notes: null },
];

const flowSteps: PackFlowStep[] = [
  { id: 'fs-1', companyId: 'company-1', stepKey: 'packaging', sortOrder: 1, enabled: true },
  { id: 'fs-2', companyId: 'company-1', stepKey: 'pallet', sortOrder: 2, enabled: true },
  { id: 'fs-3', companyId: 'company-1', stepKey: 'photo', sortOrder: 3, enabled: false },
  { id: 'fs-4', companyId: 'company-1', stepKey: 'approve', sortOrder: 4, enabled: true },
];

const referenceImages: ReferenceImage[] = [
  { id: 'ri-1', packProfileId: 'profile-1', url: '/img/1.svg', sortOrder: 1, caption: null, relatedStep: 'pallet' },
];

describe('PackGuideService (helt uden Supabase — kun fakes)', () => {
  it('bygger en fuld pakkeguide for en profil, der gælder for ALLE produkter (ingen links)', async () => {
    const service = new PackGuideService({
      packProfiles: new FakePackProfileRepository([baseProfile], {}, flowSteps, referenceImages),
      packaging: new FakePackagingRepository(packagingItems),
    });

    const guide = await service.getGuideFor('company-1', 'customer-1', 'et-vilkaarligt-produkt');

    expect(guide).not.toBeNull();
    expect(guide?.box?.name).toBe('Standardkasse');
    expect(guide?.pallet?.name).toBe('EUR-palle');
    expect(guide?.innerPackaging).toBeNull();
    expect(guide?.activeFlowSteps.map((s) => s.stepKey)).toEqual(['packaging', 'pallet', 'approve']);
    expect(guide?.referenceImages).toHaveLength(1);
  });

  it('respekterer pack_profile_products — profil gælder KUN for linkede produkter', async () => {
    const service = new PackGuideService({
      packProfiles: new FakePackProfileRepository(
        [baseProfile],
        { 'profile-1': ['produkt-a'] },
        flowSteps,
        referenceImages,
      ),
      packaging: new FakePackagingRepository(packagingItems),
    });

    const guideForLinket = await service.getGuideFor('company-1', 'customer-1', 'produkt-a');
    const guideForAndet = await service.getGuideFor('company-1', 'customer-1', 'produkt-b');

    expect(guideForLinket).not.toBeNull();
    expect(guideForAndet).toBeNull();
  });

  it('returnerer null (ikke en fejl) når ingen publiceret profil findes — PRS §4.2', async () => {
    const service = new PackGuideService({
      packProfiles: new FakePackProfileRepository([], {}, [], []),
      packaging: new FakePackagingRepository([]),
    });

    const guide = await service.getGuideFor('company-1', 'ukendt-kunde', 'ukendt-produkt');
    expect(guide).toBeNull();
  });

  it('springer draft-profiler over — kun published anvendes', async () => {
    const draftProfile: PackProfile = { ...baseProfile, id: 'profile-draft', status: 'draft' };
    const service = new PackGuideService({
      packProfiles: new FakePackProfileRepository([draftProfile], {}, flowSteps, []),
      packaging: new FakePackagingRepository(packagingItems),
    });

    const guide = await service.getGuideFor('company-1', 'customer-1', 'et-produkt');
    expect(guide).toBeNull();
  });
});

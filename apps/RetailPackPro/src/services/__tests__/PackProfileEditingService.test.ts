import { describe, expect, it } from 'vitest';

import { FakePackProfileRepository } from '../../data/repositories/__tests__/fakes';
import type { PackProfile } from '../../data/types';
import { PackProfileEditingService } from '../PackProfileEditingService';

function publishedProfile(overrides: Partial<PackProfile> = {}): PackProfile {
  return {
    id: 'profile-1',
    companyId: 'company-1',
    customerId: 'customer-1',
    name: 'Test-profil',
    boxItemId: null,
    innerPackagingItemId: null,
    dividerItemId: null,
    cornerProtectorItemId: null,
    palletItemId: 'pallet-1',
    placementPatternImageUrl: null,
    maxHeightCm: 150,
    maxWeightKg: 400,
    layerCount: 5,
    mixedPalletAllowed: false,
    labelPosition: null,
    ssccLabelRequired: false,
    foilType: null,
    overhangAllowed: null,
    specialInstructions: null,
    version: 1,
    status: 'published',
    effectiveFrom: null,
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    lockedBy: null,
    lockedAt: null,
    publishedAt: '2026-01-01T10:00:00.000Z',
    lineageId: 'profile-1', // egen id = egen lineage, da den er "version 1"
    ...overrides,
  };
}

describe('PackProfileEditingService — redigering af publiceret pakkemetode', () => {
  it('SCENARIE: to admins forsøger at redigere samme profil — den anden ser tydeligt hvem der redigerer', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    repo.setUserName('admin-1', 'Anna Admin');
    const service = new PackProfileEditingService({ packProfiles: repo });

    const first = await service.startEditing(published, 'admin-1');
    expect(first.outcome).toBe('ready');

    const second = await service.startEditing(published, 'admin-2');
    expect(second.outcome).toBe('locked_by_other');
    if (second.outcome === 'locked_by_other') {
      expect(second.lockedByName).toBe('Anna Admin');
    }
  });

  it('SCENARIE: samme admin kan genoptage sin egen kladde uden fejl', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    const first = await service.startEditing(published, 'admin-1');
    const second = await service.startEditing(published, 'admin-1');

    expect(first.outcome).toBe('ready');
    expect(second.outcome).toBe('ready');
    if (first.outcome === 'ready' && second.outcome === 'ready') {
      expect(second.draft.id).toBe(first.draft.id); // samme kladde, ikke en ny
    }
  });

  it('SCENARIE: den gamle version forbliver synlig for medarbejdere, mens der redigeres', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    await service.startEditing(published, 'admin-1');

    // Medarbejderens opslag rammer findPublishedForCustomerAndProduct, som
    // KUN kigger på status === 'published' — kladden må aldrig ændre dette.
    const employeeView = await repo.findPublishedForCustomerAndProduct('customer-1', 'et-produkt');
    expect(employeeView?.status).toBe('published');
    expect(employeeView?.id).toBe('profile-1');
  });

  it('SCENARIE: efter publicering ser medarbejderen ØJEBLIKKELIGT den nye version, og den gamle er arkiveret', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    const started = await service.startEditing(published, 'admin-1');
    if (started.outcome !== 'ready') throw new Error('forventede ready');

    await service.saveDraft(started.draft.id, { maxHeightCm: 200 });
    const publishedResult = await service.publish(started.draft.id, 'admin-1');

    expect(publishedResult.status).toBe('published');
    expect(publishedResult.maxHeightCm).toBe(200);

    const employeeView = await repo.findPublishedForCustomerAndProduct('customer-1', 'et-produkt');
    expect(employeeView?.id).toBe(publishedResult.id);
    expect(employeeView?.maxHeightCm).toBe(200);

    const oldVersion = await repo.listVersionsForLineage(published.lineageId);
    const archived = oldVersion.find((v) => v.id === 'profile-1');
    expect(archived?.status).toBe('archived');
  });

  it('SCENARIE: lås frigives ved publicering', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    const started = await service.startEditing(published, 'admin-1');
    if (started.outcome !== 'ready') throw new Error('forventede ready');

    const result = await service.publish(started.draft.id, 'admin-1');
    expect(result.lockedBy).toBeNull();
    expect(result.lockedAt).toBeNull();
  });

  it('SCENARIE: ved annullering bevares den gamle version, kladden forsvinder, og en ny redigering kan startes', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    const started = await service.startEditing(published, 'admin-1');
    if (started.outcome !== 'ready') throw new Error('forventede ready');

    await service.cancel(started.draft.id);

    // Den gamle publicerede version er uændret
    const stillPublished = await repo.findPublishedForCustomerAndProduct('customer-1', 'et-produkt');
    expect(stillPublished?.status).toBe('published');
    expect(stillPublished?.id).toBe('profile-1');

    // Kladden findes ikke længere — lås er dermed også væk
    const draftAfterCancel = await repo.findDraftForLineage(published.lineageId);
    expect(draftAfterCancel).toBeNull();

    // En NY redigering kan nu startes uden at blive opfattet som "optaget"
    const restarted = await service.startEditing(published, 'admin-2');
    expect(restarted.outcome).toBe('ready');
  });

  it('SCENARIE: historik gemmer korrekt hvem og hvornår', async () => {
    const published = publishedProfile({ createdBy: 'admin-1', updatedBy: 'admin-1' });
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    const started = await service.startEditing(published, 'admin-2');
    if (started.outcome !== 'ready') throw new Error('forventede ready');
    expect(started.draft.createdBy).toBe('admin-2'); // hvem oprettede kladden

    const publishedResult = await service.publish(started.draft.id, 'admin-2');
    expect(publishedResult.updatedBy).toBe('admin-2'); // hvem publicerede
    expect(publishedResult.publishedAt).not.toBeNull(); // hvornår

    const history = await service.listVersionHistory(published.lineageId);
    const archivedOldVersion = history.find((v) => v.id === 'profile-1');
    expect(archivedOldVersion?.status).toBe('archived');
    expect(archivedOldVersion?.updatedBy).toBe('admin-2'); // hvem arkiverede den (samme handling)
  });

  it('SCENARIE: medarbejder ser ALDRIG kladdeversioner, uanset hvor mange der findes', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    await service.startEditing(published, 'admin-1');

    // findPublishedForCustomerAndProduct er den ENESTE metode medarbejder-
    // flowet bruger (PackGuideService) — den filtrerer allerede på status.
    const employeeResult = await repo.findPublishedForCustomerAndProduct('customer-1', 'et-produkt');
    expect(employeeResult?.status).toBe('published');
  });

  it('listCurrentVersionsForCompany viser kladden (ikke den gamle publicerede) mens der redigeres', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    await service.startEditing(published, 'admin-1');

    const current = await service.listCurrentVersionsForCompany('company-1');
    expect(current).toHaveLength(1); // ikke 2 — ingen forvirrende dublet i oversigten
    expect(current[0]?.status).toBe('draft');
  });
});

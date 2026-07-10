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
    changeSummary: null,
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
      // "Åbn skrivebeskyttet" skal have noget reelt indhold at vise
      expect(second.draftPreview).toBeDefined();
      expect(second.draftPreview.lockedBy).toBe('admin-1');
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

    const employeeView = await repo.findPublishedForCustomerAndProduct('customer-1', 'et-produkt');
    expect(employeeView?.status).toBe('published');
    expect(employeeView?.id).toBe('profile-1');
  });

  it('SCENARIE: efter publicering ser medarbejderen ØJEBLIKKELIGT den nye version, og den gamle er arkiveret (publicering er atomisk)', async () => {
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

    // Kun ÉN publiceret og ÉN arkiveret findes samtidig — aldrig to publicerede,
    // aldrig nul (det ville betyde publiceringen kun var halvt gennemført).
    const history = await service.listVersionHistory(published.lineageId);
    expect(history.filter((v) => v.isCurrent)).toHaveLength(1);
    expect(history).toHaveLength(2);
  });

  it('SCENARIE: ændringsbeskrivelse gemmes — tom bliver til standardteksten', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    const started = await service.startEditing(published, 'admin-1');
    if (started.outcome !== 'ready') throw new Error('forventede ready');
    const withText = await service.publish(started.draft.id, 'admin-1', 'Ny labelplacering');
    expect(withText.changeSummary).toBe('Ny labelplacering');

    // Ny runde, uden tekst denne gang
    const started2 = await service.startEditing(withText, 'admin-1');
    if (started2.outcome !== 'ready') throw new Error('forventede ready');
    const withoutText = await service.publish(started2.draft.id, 'admin-1', '');
    expect(withoutText.changeSummary).toBe('Opdateret pakkemetode');
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

  it('SCENARIE: ved annullering bevares den gamle version, kladden forsvinder, lås frigives, og en ny redigering kan startes', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    const started = await service.startEditing(published, 'admin-1');
    if (started.outcome !== 'ready') throw new Error('forventede ready');

    await service.cancel(started.draft.id);

    const stillPublished = await repo.findPublishedForCustomerAndProduct('customer-1', 'et-produkt');
    expect(stillPublished?.status).toBe('published');
    expect(stillPublished?.id).toBe('profile-1');

    const draftAfterCancel = await repo.findDraftForLineage(published.lineageId);
    expect(draftAfterCancel).toBeNull(); // lås frigivet (kladden — og dermed låsen — findes ikke længere)

    const restarted = await service.startEditing(published, 'admin-2');
    expect(restarted.outcome).toBe('ready');
  });

  it('SCENARIE: historik gemmer korrekt bruger og tidspunkt — og BEVARER attributionen for ældre versioner', async () => {
    const published = publishedProfile({ createdBy: 'admin-1', updatedBy: 'admin-1' });
    const repo = new FakePackProfileRepository([published]);
    repo.setUserName('admin-1', 'Anna');
    repo.setUserName('admin-2', 'Bo');
    const service = new PackProfileEditingService({ packProfiles: repo });

    const started = await service.startEditing(published, 'admin-2');
    if (started.outcome !== 'ready') throw new Error('forventede ready');
    expect(started.draft.createdBy).toBe('admin-2');

    const publishedResult = await service.publish(started.draft.id, 'admin-2', 'Ny palletype');
    expect(publishedResult.publishedAt).not.toBeNull();

    const history = await service.listVersionHistory(published.lineageId);
    expect(history).toHaveLength(2);

    const v1 = history.find((v) => v.version === 1);
    const v2 = history.find((v) => v.version === 2);

    // KRITISK: v1's attribution ("Anna") må IKKE være overskrevet af Bo's
    // publicering af v2 — det var netop fejlen fundet og rettet i denne gennemgang.
    expect(v1?.userName).toBe('Anna');
    expect(v1?.isCurrent).toBe(false);

    expect(v2?.userName).toBe('Bo');
    expect(v2?.changeSummary).toBe('Ny palletype');
    expect(v2?.isCurrent).toBe(true);
  });

  it('SCENARIE: medarbejder ser ALDRIG kladdeversioner, uanset hvor mange der findes', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    await service.startEditing(published, 'admin-1');

    const employeeResult = await repo.findPublishedForCustomerAndProduct('customer-1', 'et-produkt');
    expect(employeeResult?.status).toBe('published');
  });

  it('listCurrentVersionsForCompany viser kladden (ikke den gamle publicerede) mens der redigeres', async () => {
    const published = publishedProfile();
    const repo = new FakePackProfileRepository([published]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    await service.startEditing(published, 'admin-1');

    const current = await service.listCurrentVersionsForCompany('company-1');
    expect(current).toHaveLength(1);
    expect(current[0]?.status).toBe('draft');
  });

  it('SCENARIE: "Gendan denne version" opretter en NY version som kopi af en arkiveret version — historikken overskrives aldrig', async () => {
    const v1 = publishedProfile({ status: 'archived', layerCount: 4, changeSummary: null });
    const v2 = publishedProfile({
      id: 'profile-2',
      version: 2,
      status: 'published',
      layerCount: 6,
      changeSummary: 'Flere lag',
    });
    const repo = new FakePackProfileRepository([v1, v2]);
    const service = new PackProfileEditingService({ packProfiles: repo });

    // Admin gendanner v1 (4 lag) mens v2 (6 lag) er den aktuelle
    const restored = await service.restoreVersion(v1.lineageId, v1.id, 'admin-1');
    if (restored.outcome !== 'ready') throw new Error('forventede ready');

    expect(restored.draft.layerCount).toBe(4); // kopieret fra v1, ikke v2
    expect(restored.draft.version).toBe(3); // fortsætter versionsnummereringen fra den AKTUELLE (v2), ikke fra v1

    const publishedRestore = await service.publish(restored.draft.id, 'admin-1', 'Gendannet tidligere version');

    const history = await service.listVersionHistory(v1.lineageId);
    // Alle tre versioner findes stadig — INTET er overskrevet
    expect(history).toHaveLength(3);
    expect(history.find((v) => v.version === 1)).toBeDefined();
    expect(history.find((v) => v.version === 2)).toBeDefined();
    expect(history.find((v) => v.version === 3)?.changeSummary).toBe('Gendannet tidligere version');
    expect(publishedRestore.layerCount).toBe(4);
  });
});

/**
 * Admin-handlinger på pakkevejledninger i v0.4.0. Bygger OVENPÅ v0.3.0's
 * PackGuideService og PackProfileEditingService (låsning, versionering,
 * publicering, historik og gendan genbruges uændret) og tilføjer kun:
 * - v0.4.0-felter (kolli pr. lag, billede af færdig palle)
 * - produktvalg på en kladde
 * - billedreferencer
 * - forhåndsvisning af en kladde præcis som medarbejderen vil se den
 *
 * Princippet fra v0.3.0 er uændret: medarbejderen ser kun den publicerede
 * version — en kladde påvirker intet, før den publiceres.
 */
import { isDefined } from '@platform/shared-utils';
import type { NewPackProfile, ReferenceImage } from '@rpp/data/types';
import type { PackGuide, Services } from '@rpp/services';

import type { RepositoriesV4 } from './interfaces';
import type { PackProfileV4, PackProfileV4Fields } from './types';

export type GuideFields = Partial<NewPackProfile> & PackProfileV4Fields;

export class PackGuideAdminService {
  constructor(
    private readonly repos: Pick<RepositoriesV4, 'packProfiles' | 'packaging' | 'catalog' | 'referenceImages'>,
    private readonly base: Pick<Services, 'packGuide' | 'packProfileEditing'>,
  ) {}

  /** Opret ny vejledning (v0.3.0: altid kladde først) — publiceres med det samme, hvis ønsket. */
  async create(
    input: NewPackProfile & PackProfileV4Fields,
    options: { publish: boolean; userId: string },
  ): Promise<PackProfileV4> {
    const created = (await this.base.packGuide.createProfile(input)) as PackProfileV4;
    if (!options.publish) return created;
    return (await this.base.packGuide.publishProfile(created.id, options.userId)) as PackProfileV4;
  }

  /** "Gem, men vis ikke endnu" — v0.3.0's saveDraft + v0.4.0-felter og produktvalg. */
  async saveDraft(draftId: string, fields: GuideFields, productIds?: string[]): Promise<PackProfileV4> {
    const saved = (await this.base.packProfileEditing.saveDraft(draftId, fields)) as PackProfileV4;
    if (productIds) await this.repos.packProfiles.setProductLinks(draftId, productIds);
    return saved;
  }

  getProductLinks(profileId: string): Promise<string[]> {
    return this.repos.catalog.getProductLinks(profileId);
  }

  listReferenceImages(profileId: string): Promise<ReferenceImage[]> {
    return this.repos.packProfiles.listReferenceImages(profileId);
  }

  addReferenceImage(profileId: string, url: string, caption: string | null): Promise<ReferenceImage> {
    return this.repos.referenceImages.addReferenceImage({ packProfileId: profileId, url, caption });
  }

  removeReferenceImage(referenceImageId: string): Promise<void> {
    return this.repos.referenceImages.removeReferenceImage(referenceImageId);
  }

  /**
   * Samme opbygning som v0.3.0's PackGuideService.getGuideFor, men for en
   * vilkårlig version (fx en kladde) — bruges til forhåndsvisning.
   */
  async buildGuide(profile: PackProfileV4): Promise<PackGuide> {
    const ids = [
      profile.boxItemId,
      profile.innerPackagingItemId,
      profile.dividerItemId,
      profile.cornerProtectorItemId,
      profile.palletItemId,
    ].filter(isDefined);
    const [items, referenceImages, steps] = await Promise.all([
      this.repos.packaging.listByIds(ids),
      this.repos.packProfiles.listReferenceImages(profile.id),
      this.repos.packProfiles.listFlowSteps(profile.companyId),
    ]);
    const byId = new Map(items.map((i) => [i.id, i] as const));
    const get = (id: string | null) => (id ? (byId.get(id) ?? null) : null);
    return {
      profile,
      box: get(profile.boxItemId),
      innerPackaging: get(profile.innerPackagingItemId),
      divider: get(profile.dividerItemId),
      cornerProtector: get(profile.cornerProtectorItemId),
      pallet: get(profile.palletItemId),
      referenceImages,
      activeFlowSteps: steps.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }
}

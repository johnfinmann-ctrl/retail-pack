/**
 * Kernen i medarbejderflowet: given en kunde+produkt-kombination, byg den
 * fulde, visningsklare pakkeguide — emballage, palle, referencebilleder og
 * hvilke trin der reelt skal vises (kun aktiverede pack_flow_steps).
 *
 * Al forretningslogik (hvilken profil gælder, hvilke emballage-elementer
 * hører til, hvilke trin er aktive) ligger HER — ikke i UI-komponenterne,
 * og ikke i repositories (som kun henter/gemmer rå data).
 */
import { isDefined } from '@platform/shared-utils';

import type { Repositories } from '../data/repositories/interfaces';
import type { NewPackProfile, PackagingItem, PackFlowStep, PackProfile, ReferenceImage } from '../data/types';

export interface PackGuide {
  profile: PackProfile;
  box: PackagingItem | null;
  innerPackaging: PackagingItem | null;
  divider: PackagingItem | null;
  cornerProtector: PackagingItem | null;
  pallet: PackagingItem | null;
  referenceImages: ReferenceImage[];
  /** Kun de trin medarbejderen faktisk skal se — allerede filtreret og sorteret. */
  activeFlowSteps: PackFlowStep[];
}

export class PackGuideService {
  constructor(private readonly repos: Pick<Repositories, 'packProfiles' | 'packaging'>) {}

  /**
   * Returnerer null, hvis ingen publiceret regel findes for kombinationen —
   * den kaldende UI skal da vise "Ingen pakkeregel fundet" (PRS §4.2), ikke
   * kaste en fejl. Fravær af en regel er en forventet, håndteret tilstand.
   */
  async getGuideFor(companyId: string, customerId: string, productId: string): Promise<PackGuide | null> {
    const profile = await this.repos.packProfiles.findPublishedForCustomerAndProduct(customerId, productId);
    if (!profile) return null;

    const packagingIds = [
      profile.boxItemId,
      profile.innerPackagingItemId,
      profile.dividerItemId,
      profile.cornerProtectorItemId,
      profile.palletItemId,
    ].filter(isDefined);

    const [packagingItems, referenceImages, allFlowSteps] = await Promise.all([
      this.repos.packaging.listByIds(packagingIds),
      this.repos.packProfiles.listReferenceImages(profile.id),
      this.repos.packProfiles.listFlowSteps(companyId),
    ]);

    const byId = new Map(packagingItems.map((item) => [item.id, item] as const));
    const lookup = (id: string | null) => (id ? (byId.get(id) ?? null) : null);

    return {
      profile,
      box: lookup(profile.boxItemId),
      innerPackaging: lookup(profile.innerPackagingItemId),
      divider: lookup(profile.dividerItemId),
      cornerProtector: lookup(profile.cornerProtectorItemId),
      pallet: lookup(profile.palletItemId),
      referenceImages,
      activeFlowSteps: allFlowSteps.filter((step) => step.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  /** Til Admin's grundlæggende pakkeprofil-oversigt — ALLE statusser. */
  listProfilesForCompany(companyId: string) {
    return this.repos.packProfiles.listAllForCompany(companyId);
  }

  /**
   * Opretter en ny pakkemetode (altid som kladde) og knytter den til de
   * valgte produkter — eller til ALLE kundens produkter, hvis ingen er
   * angivet eksplicit (PRS §2.2). Admin-UI'et kender ikke til "kladde"
   * som begreb — det ser kun handlingen "Gem".
   */
  async createProfile(input: NewPackProfile): Promise<PackProfile> {
    const profile = await this.repos.packProfiles.create(input);
    if (input.productIds && input.productIds.length > 0) {
      await this.repos.packProfiles.setProductLinks(profile.id, input.productIds);
    }
    return profile;
  }

  /** Gør profilen synlig for medarbejdere. Admin-UI'et kalder det bare "Publicér". */
  publishProfile(profileId: string, publishedByUserId: string): Promise<PackProfile> {
    return this.repos.packProfiles.publish(profileId, publishedByUserId);
  }
}

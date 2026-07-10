/**
 * Redigering af en allerede publiceret pakkemetode. Al forretningslogik
 * for låsning, versionering og publicering ligger HER — Admin-UI'et
 * kender kun til handlingerne "Redigér", "Gem, men vis ikke endnu",
 * "Publicér", "Annullér" og "Gendan denne version". Ordene "draft"/
 * "published"/"archived"/"lock_owner"/"version_number" optræder ALDRIG
 * uden for dette lag.
 */
import { ConflictError } from '@platform/config';

import type { Repositories } from '../data/repositories/interfaces';
import type { NewPackProfile, PackProfile, PackProfileVersionSummary } from '../data/types';

export type StartEditingResult =
  | { outcome: 'ready'; draft: PackProfile }
  | {
      outcome: 'locked_by_other';
      lockedByName: string;
      lockedAt: string;
      /** Den låste kladdes indhold — til "Åbn skrivebeskyttet". */
      draftPreview: PackProfile;
    };

export class PackProfileEditingService {
  constructor(private readonly repos: Pick<Repositories, 'packProfiles'>) {}

  /** Kaldes når admin trykker "Redigér" på en publiceret pakkemetode. */
  async startEditing(publishedProfile: PackProfile, editingUserId: string): Promise<StartEditingResult> {
    return this.beginDraft(publishedProfile.lineageId, publishedProfile.id, editingUserId);
  }

  /**
   * Kaldes når admin trykker "Gendan denne version" på en tidligere
   * (arkiveret) version. Opretter en ny kladde som kopi af DEN version —
   * historikken overskrives aldrig, der oprettes altid en ny version.
   */
  async restoreVersion(
    lineageId: string,
    sourceVersionId: string,
    editingUserId: string,
  ): Promise<StartEditingResult> {
    return this.beginDraft(lineageId, sourceVersionId, editingUserId);
  }

  private async beginDraft(
    lineageId: string,
    sourceVersionId: string,
    editingUserId: string,
  ): Promise<StartEditingResult> {
    const existingDraft = await this.repos.packProfiles.findDraftForLineage(lineageId);

    if (existingDraft) {
      if (existingDraft.lockedBy && existingDraft.lockedBy !== editingUserId) {
        const lockedByName = await this.repos.packProfiles.getUserFullName(existingDraft.lockedBy);
        return {
          outcome: 'locked_by_other',
          lockedByName: lockedByName ?? 'En anden administrator',
          lockedAt: existingDraft.lockedAt ?? '',
          draftPreview: existingDraft,
        };
      }
      // Egen kladde, eller en kladde uden lås (defensivt tilfælde) — fortsæt med den.
      return { outcome: 'ready', draft: existingDraft };
    }

    try {
      const draft = await this.repos.packProfiles.createDraftFromVersion(sourceVersionId, editingUserId);
      return { outcome: 'ready', draft };
    } catch (error) {
      // Kapløb: en anden admin nåede at oprette kladden i tidsrummet mellem
      // vores tjek og vores forsøg på oprettelse.
      if (error instanceof ConflictError) {
        const raceDraft = await this.repos.packProfiles.findDraftForLineage(lineageId);
        const lockedByName = raceDraft?.lockedBy
          ? await this.repos.packProfiles.getUserFullName(raceDraft.lockedBy)
          : null;
        return {
          outcome: 'locked_by_other',
          lockedByName: lockedByName ?? 'En anden administrator',
          lockedAt: raceDraft?.lockedAt ?? '',
          draftPreview: raceDraft as PackProfile,
        };
      }
      throw error;
    }
  }

  /** "Gem, men vis ikke endnu" — ændringer gemmes, låsen bevares. */
  saveDraft(draftId: string, fields: Partial<NewPackProfile>): Promise<PackProfile> {
    return this.repos.packProfiles.updateDraft(draftId, fields);
  }

  /**
   * "Publicér" — atomisk: kladden bliver aktiv, den gamle arkiveres (uden
   * at miste sin egen historik), låsen frigives. `changeSummary` er
   * valgfri fritekst ("Beskriv kort ændringen") — tom bliver til
   * "Opdateret pakkemetode".
   */
  publish(draftId: string, publisherUserId: string, changeSummary?: string | null): Promise<PackProfile> {
    return this.repos.packProfiles.publishDraft(draftId, publisherUserId, changeSummary);
  }

  /** "Annullér" — kladden slettes, den publicerede version forbliver uændret, låsen frigives. */
  cancel(draftId: string): Promise<void> {
    return this.repos.packProfiles.discardDraft(draftId);
  }

  /** "Se tidligere versioner" — kun version, dato, bruger, ændringsbeskrivelse. */
  listVersionHistory(lineageId: string): Promise<PackProfileVersionSummary[]> {
    return this.repos.packProfiles.listVersionSummaries(lineageId);
  }

  /**
   * Til pakkemetode-oversigten: ÉN række pr. logisk pakkemetode, ikke én
   * pr. fysisk databaserække. Hvis en kladde er i gang, vises DEN (så
   * admin ser at redigering pågår) — ellers den publicerede version.
   * Rene arkiverede lineages (ingen aktiv version) vises ikke i oversigten.
   */
  async listCurrentVersionsForCompany(companyId: string): Promise<PackProfile[]> {
    const all = await this.repos.packProfiles.listAllForCompany(companyId);
    const byLineage = new Map<string, PackProfile[]>();
    for (const profile of all) {
      const group = byLineage.get(profile.lineageId) ?? [];
      group.push(profile);
      byLineage.set(profile.lineageId, group);
    }

    const priority: Record<PackProfile['status'], number> = { draft: 0, published: 1, archived: 2 };
    const current: PackProfile[] = [];
    for (const group of byLineage.values()) {
      const sorted = [...group].sort((a, b) => priority[a.status] - priority[b.status]);
      const best = sorted[0];
      if (best && best.status !== 'archived') current.push(best);
    }
    return current;
  }
}

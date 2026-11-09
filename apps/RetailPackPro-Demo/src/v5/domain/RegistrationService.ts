/**
 * Plukruter, pallekontrol, fotodokumentation og historik (v0.5).
 *
 * RetailPackPro erstatter IKKE AX: plukruten bruges kun til at finde
 * modtageren og samle registreringerne. Ingen varer, antal eller partier.
 *
 * Regler for registrering:
 * - "Godkendt til forsendelse" kræver: gældende krav uden konflikt/mangler,
 *   alle kontrolpunkter OK og mindst ét foto af pallen.
 * - Ellers kan pallen registreres som "Afvigelse" med begrundelse og foto —
 *   den bliver aldrig markeret som godkendt til forsendelse.
 */
import { NotFoundError, ValidationError } from '@platform/config';

import { newId } from '../../demo/storage';

import { CONFIG } from './config';
import { ForbiddenError } from './errors';
import { FIELD_BY_KEY, formatValue } from './fields';
import type { RuleService } from './RuleService';
import type { DataStore, DemoUserV5 } from './store';
import {
  MAX_PHOTOS_PER_ORDER,
  type CheckResult,
  type PalletRecord,
  type PalletStatus,
  type PhotoRecordV5,
  type Pickroute,
  type Resolution,
  type RuleSnapshot,
} from './types';

const now = () => new Date().toISOString();

export type PickrouteLookup =
  | { kind: 'pickroute'; pickroute: Pickroute }
  | { kind: 'batch'; pickroute: Pickroute; code: string }
  | { kind: 'salesOrder'; pickroute: Pickroute; code: string }
  | { kind: 'none'; code: string };

export interface PreparedImage {
  data: Blob;
  width: number;
  height: number;
}

/** Fjerner AIM-præfiks (fx "]C1"), som nogle scannere sender med. */
export function normalizeCode(raw: string): string {
  return raw.trim().replace(/^\][A-Za-z]\d/, '').replace(/\s+/g, '');
}

/** GS1-kontrolciffer for SSCC (18 cifre). Accepterer også "(00)"-præfiks. */
export function parseSscc(raw: string): string | null {
  const v = normalizeCode(raw).replace(/^\(?00\)?/, '');
  if (!/^\d{18}$/.test(v)) return null;
  const digits = v.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check ? v : null;
}

export function snapshotOf(resolution: Resolution, docTitles: Map<string, { title: string; docVersion: string }>): RuleSnapshot {
  const docIds = [...new Set(resolution.fields.map((f) => f.sourceDocId))];
  const issues = [
    ...resolution.conflicts.map((c) => `Modstridende krav: ${FIELD_BY_KEY.get(c.key)?.label}`),
    ...resolution.unclear.map((k) => `Uklart krav: ${FIELD_BY_KEY.get(k)?.label}`),
    ...resolution.missing.map((k) => `Mangler krav: ${FIELD_BY_KEY.get(k)?.label}`),
    ...resolution.expired.map((e) => `Kilde ikke gyldig: ${FIELD_BY_KEY.get(e.key)?.label}`),
    ...(resolution.status === 'awaiting' ? ['Afventer officiel vejledning'] : []),
  ];
  return {
    status: resolution.status,
    ruleSets: resolution.ruleSetsUsed,
    documents: docIds.map((id) => ({ id, title: docTitles.get(id)?.title ?? '', docVersion: docTitles.get(id)?.docVersion ?? '' })),
    issues,
  };
}

export function checksFrom(resolution: Resolution): CheckResult[] {
  return resolution.fields
    .filter((f) => f.checkpoint)
    .map((f) => ({ key: f.key, label: FIELD_BY_KEY.get(f.key)?.label ?? f.key, requirement: formatValue(f.key, f.value), ok: null }));
}

export interface HistoryRow {
  pallet: PalletRecord;
  pickroute: Pickroute;
  chainName: string;
  warehouseName: string | null;
  photoCount: number;
}

export class RegistrationService {
  constructor(
    private readonly store: DataStore,
    private readonly rules: RuleService,
  ) {}

  // ---------------------------------------------------------- Plukruter

  async listPickroutes(): Promise<Pickroute[]> {
    return (await this.store.list('pickroutes')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async lookup(raw: string): Promise<PickrouteLookup> {
    const code = normalizeCode(raw);
    if (!code) return { kind: 'none', code };
    const routes = await this.store.list('pickroutes');
    const byRoute = routes.find((p) => p.routeNumber === code);
    if (byRoute) return { kind: 'pickroute', pickroute: byRoute };
    const byBatch = routes.find((p) => p.demoBatchIds.some((b) => b.toUpperCase() === code.toUpperCase()));
    if (byBatch) return { kind: 'batch', pickroute: byBatch, code };
    const bySales = routes.find((p) => p.salesOrder === code);
    if (bySales) return { kind: 'salesOrder', pickroute: bySales, code };
    return { kind: 'none', code };
  }

  async savePickroute(
    input: { id?: string; routeNumber: string; salesOrder: string; recipientName: string; chainId: string; formatId: string | null; warehouseId: string | null; demoBatchIds: string[] },
    user: DemoUserV5,
  ): Promise<Pickroute> {
    if (user.role === 'medarbejder') throw new ForbiddenError('Testordrer oprettes i administrationen.');
    const routeNumber = normalizeCode(input.routeNumber);
    if (!/^\d{4,12}$/.test(routeNumber)) throw new ValidationError('Plukrutenummer skal være 4–12 cifre.');
    if (!input.salesOrder.trim()) throw new ValidationError('Angiv salgsordre.');
    if (!input.recipientName.trim()) throw new ValidationError('Angiv modtager.');
    if (!input.chainId) throw new ValidationError('Vælg kæde.');
    const routes = await this.store.list('pickroutes');
    if (routes.some((p) => p.id !== input.id && p.routeNumber === routeNumber)) throw new ValidationError('Plukrutenummeret findes allerede.');
    const row = {
      routeNumber,
      salesOrder: input.salesOrder.trim(),
      recipientName: input.recipientName.trim(),
      chainId: input.chainId,
      formatId: input.formatId,
      warehouseId: input.warehouseId,
      demoBatchIds: input.demoBatchIds.map((b) => b.trim()).filter(Boolean),
    };
    if (input.id) return this.store.update('pickroutes', input.id, row);
    return this.store.insert('pickroutes', { id: newId(), isTest: true, createdAt: now(), ...row });
  }

  async resolveFor(pickroute: Pickroute): Promise<Resolution> {
    return this.rules.resolve({ chainId: pickroute.chainId, formatId: pickroute.formatId, warehouseId: pickroute.warehouseId });
  }

  // ------------------------------------------------------------- Paller

  async listPallets(pickrouteId: string): Promise<PalletRecord[]> {
    return (await this.store.list('pallets')).filter((p) => p.pickrouteId === pickrouteId).sort((a, b) => a.number - b.number);
  }

  async startPallet(pickrouteId: string, user: DemoUserV5, ssccInput?: string): Promise<PalletRecord> {
    const pickroute = await this.store.get('pickroutes', pickrouteId);
    if (!pickroute) throw new NotFoundError('Plukrute');
    const all = await this.store.list('pallets');
    const mine = all.filter((p) => p.pickrouteId === pickrouteId);
    const number = mine.reduce((m, p) => Math.max(m, p.number), 0) + 1;

    let palletId = `${pickroute.routeNumber}-${String(number).padStart(2, '0')}`;
    let palletIdKind: PalletRecord['palletIdKind'] = 'auto';
    if (ssccInput && ssccInput.trim()) {
      const sscc = parseSscc(ssccInput);
      if (!sscc) throw new ValidationError('Ugyldig SSCC. Den skal være 18 cifre med korrekt kontrolciffer.');
      palletId = sscc;
      palletIdKind = 'sscc';
    }
    if (all.some((p) => p.palletId === palletId)) throw new ValidationError(`Palle-ID ${palletId} er allerede brugt.`);

    const resolution = await this.resolveFor(pickroute);
    return this.store.insert('pallets', {
      id: newId(),
      pickrouteId,
      palletId,
      palletIdKind,
      number,
      status: 'in_progress',
      checks: checksFrom(resolution),
      deviationReason: null,
      snapshot: null,
      createdAt: now(),
      createdBy: user.id,
      registeredAt: null,
      registeredBy: null,
    });
  }

  async setCheck(palletRecordId: string, key: CheckResult['key'], ok: boolean | null): Promise<PalletRecord> {
    const p = await this.mustPallet(palletRecordId);
    if (p.status !== 'in_progress') throw new ValidationError('Pallen er registreret og kan ikke ændres.');
    return this.store.update('pallets', p.id, { checks: p.checks.map((c) => (c.key === key ? { ...c, ok } : c)) });
  }

  /** Hvad mangler, før pallen kan godkendes til forsendelse? (tom liste = klar) */
  async approvalBlockers(palletRecordId: string): Promise<string[]> {
    const p = await this.mustPallet(palletRecordId);
    const pickroute = await this.store.get('pickroutes', p.pickrouteId);
    if (!pickroute) throw new NotFoundError('Plukrute');
    const resolution = await this.resolveFor(pickroute);
    const blockers: string[] = [];
    if (resolution.status === 'awaiting') blockers.push('Der er ingen godkendt officiel vejledning for modtageren.');
    if (resolution.status === 'stop') blockers.push('Pakkekravene er modstridende.');
    if (resolution.status === 'clarify') blockers.push('Pakkekravene skal afklares.');
    // Kontrolpunkterne skal svare til de krav, der gælder NU
    const current = checksFrom(resolution).map((c) => c.key).sort().join('|');
    if (current !== p.checks.map((c) => c.key).sort().join('|')) blockers.push('Pakkekravene er ændret, siden pallen blev startet. Start kontrollen igen.');
    if (p.checks.some((c) => c.ok === false)) blockers.push('Et eller flere kontrolpunkter er ikke opfyldt.');
    if (p.checks.some((c) => c.ok === null)) blockers.push('Alle kontrolpunkter skal gennemgås.');
    const photos = (await this.listPhotos(p.pickrouteId)).filter((ph) => ph.palletRecordId === p.id);
    if (photos.length < CONFIG.minPhotosPerPallet) blockers.push(`Tag mindst ${CONFIG.minPhotosPerPallet} foto af pallen.`);
    return blockers;
  }

  async registerApproved(palletRecordId: string, user: DemoUserV5): Promise<PalletRecord> {
    const p = await this.mustPallet(palletRecordId);
    if (p.status !== 'in_progress') throw new ValidationError('Pallen er allerede registreret.');
    const blockers = await this.approvalBlockers(palletRecordId);
    if (blockers.length) throw new ValidationError(blockers[0]!);
    return this.finish(p, 'approved', null, user);
  }

  async registerDeviation(palletRecordId: string, reason: string, user: DemoUserV5): Promise<PalletRecord> {
    const p = await this.mustPallet(palletRecordId);
    if (p.status !== 'in_progress') throw new ValidationError('Pallen er allerede registreret.');
    if (reason.trim().length < 5) throw new ValidationError('Skriv en kort begrundelse for afvigelsen.');
    const photos = (await this.listPhotos(p.pickrouteId)).filter((ph) => ph.palletRecordId === p.id);
    if (photos.length < 1) throw new ValidationError('En afvigelse skal dokumenteres med mindst ét foto.');
    return this.finish(p, 'deviation', reason.trim(), user);
  }

  private async finish(p: PalletRecord, status: PalletStatus, reason: string | null, user: DemoUserV5): Promise<PalletRecord> {
    const pickroute = (await this.store.get('pickroutes', p.pickrouteId))!;
    const resolution = await this.resolveFor(pickroute);
    const docs = new Map((await this.store.list('documents')).map((d) => [d.id, d] as const));
    return this.store.update('pallets', p.id, {
      status,
      deviationReason: reason,
      snapshot: snapshotOf(resolution, docs),
      registeredAt: now(),
      registeredBy: user.id,
    });
  }

  /** Annullér en palle, der ikke er registreret (fx startet ved en fejl). Fotos slettes også. */
  async cancelPallet(palletRecordId: string): Promise<void> {
    const p = await this.mustPallet(palletRecordId);
    if (p.status !== 'in_progress') throw new ValidationError('En registreret palle kan ikke slettes.');
    for (const ph of (await this.listPhotos(p.pickrouteId)).filter((x) => x.palletRecordId === p.id)) {
      await this.store.blobs.delete(ph.fileId);
      await this.store.remove('photos', ph.id);
    }
    await this.store.remove('pallets', p.id);
  }

  // -------------------------------------------------------------- Fotos

  async listPhotos(pickrouteId: string): Promise<PhotoRecordV5[]> {
    return (await this.store.list('photos')).filter((p) => p.pickrouteId === pickrouteId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async remainingPhotoSlots(pickrouteId: string): Promise<number> {
    return Math.max(0, MAX_PHOTOS_PER_ORDER - (await this.listPhotos(pickrouteId)).length);
  }

  async addPhoto(input: { pickrouteId: string; palletRecordId: string | null; image: PreparedImage; user: DemoUserV5 }): Promise<PhotoRecordV5> {
    if (!(await this.store.get('pickroutes', input.pickrouteId))) throw new NotFoundError('Plukrute');
    if ((await this.remainingPhotoSlots(input.pickrouteId)) <= 0) {
      throw new ValidationError(`Der kan højst gemmes ${MAX_PHOTOS_PER_ORDER} fotos pr. ordre.`);
    }
    if (input.palletRecordId) await this.mustPallet(input.palletRecordId);
    const fileId = newId();
    await this.store.blobs.put(fileId, input.image.data);
    return this.store.insert('photos', {
      id: newId(),
      pickrouteId: input.pickrouteId,
      palletRecordId: input.palletRecordId,
      fileId,
      createdAt: now(),
      createdBy: input.user.id,
      replacedAt: null,
      replacedBy: null,
      width: input.image.width,
      height: input.image.height,
      sizeBytes: input.image.data.size,
    });
  }

  /** Erstat et foto (fx uskarpt). Tæller ikke som et ekstra foto; tidspunktet logges. */
  async replacePhoto(photoId: string, image: PreparedImage, user: DemoUserV5): Promise<PhotoRecordV5> {
    const ph = await this.store.get('photos', photoId);
    if (!ph) throw new NotFoundError('Foto');
    const fileId = newId();
    await this.store.blobs.put(fileId, image.data);
    await this.store.blobs.delete(ph.fileId);
    return this.store.update('photos', photoId, {
      fileId,
      replacedAt: now(),
      replacedBy: user.id,
      width: image.width,
      height: image.height,
      sizeBytes: image.data.size,
    });
  }

  /** Slet foto — kun på paller, der endnu ikke er registreret. Registrerede fotos kan kun erstattes. */
  async removePhoto(photoId: string): Promise<void> {
    const ph = await this.store.get('photos', photoId);
    if (!ph) return;
    if (ph.palletRecordId) {
      const p = await this.store.get('pallets', ph.palletRecordId);
      if (p && p.status !== 'in_progress') throw new ValidationError('Fotoet hører til en registreret palle og kan kun erstattes.');
    }
    await this.store.blobs.delete(ph.fileId);
    await this.store.remove('photos', photoId);
  }

  // ------------------------------------------------------------ Historik

  async history(filter: { query?: string; status?: PalletStatus | 'all' } = {}): Promise<HistoryRow[]> {
    const [pallets, routes, chains, warehouses, photos] = await Promise.all([
      this.store.list('pallets'),
      this.store.list('pickroutes'),
      this.store.list('chains'),
      this.store.list('warehouses'),
      this.store.list('photos'),
    ]);
    const q = (filter.query ?? '').trim().toLowerCase();
    return pallets
      .map((pallet) => {
        const pickroute = routes.find((r) => r.id === pallet.pickrouteId)!;
        return {
          pallet,
          pickroute,
          chainName: chains.find((c) => c.id === pickroute?.chainId)?.name ?? '',
          warehouseName: warehouses.find((w) => w.id === pickroute?.warehouseId)?.name ?? null,
          photoCount: photos.filter((p) => p.palletRecordId === pallet.id).length,
        };
      })
      .filter((r) => r.pickroute)
      .filter((r) => !filter.status || filter.status === 'all' || r.pallet.status === filter.status)
      .filter(
        (r) =>
          !q ||
          [r.pickroute.routeNumber, r.pickroute.salesOrder, r.pallet.palletId, r.pickroute.recipientName, r.chainName, r.warehouseName ?? '']
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => (b.pallet.registeredAt ?? b.pallet.createdAt).localeCompare(a.pallet.registeredAt ?? a.pallet.createdAt));
  }

  private async mustPallet(id: string): Promise<PalletRecord> {
    const p = await this.store.get('pallets', id);
    if (!p) throw new NotFoundError('Palle');
    return p;
  }
}

/**
 * Regelbank: kæder, formater, lagre, kildedokumenter og regelsæt med
 * arbejdsgangen Udkast → Afventer kontrol → Godkendt til visning → Udgået.
 *
 * Firøjne-princip: regelansvarlig opretter og sender til kontrol;
 * en ANDEN person (kontrollant) godkender og publicerer.
 * Først godkendte regelsæt indgår i det, medarbejderen ser.
 */
import { ConflictError, NotFoundError, ValidationError } from '@platform/config';

import { newId } from '../../demo/storage';

import { ForbiddenError } from './errors';
import { FIELD_BY_KEY } from './fields';
import { resolveRequirements, today } from './RuleResolver';
import type { DataStore, DemoUserV5 } from './store';
import type {
  Chain,
  ChainFormat,
  Resolution,
  RuleField,
  RuleFieldKey,
  RuleScope,
  RuleSet,
  SourceDocument,
  Warehouse,
} from './types';

const now = () => new Date().toISOString();

export class RuleService {
  constructor(private readonly store: DataStore) {}

  // ------------------------------------------------------------ Struktur

  async listChains(): Promise<Chain[]> {
    const chains = await this.store.list('chains');
    return chains.sort((a, b) => Number(a.isTest) - Number(b.isTest) || a.name.localeCompare(b.name, 'da'));
  }
  async listFormats(chainId: string): Promise<ChainFormat[]> {
    return (await this.store.list('formats')).filter((f) => f.chainId === chainId).sort((a, b) => a.name.localeCompare(b.name, 'da'));
  }
  async listWarehouses(chainId: string): Promise<Warehouse[]> {
    return (await this.store.list('warehouses')).filter((w) => w.chainId === chainId).sort((a, b) => a.name.localeCompare(b.name, 'da'));
  }

  async saveChain(input: { id?: string; name: string }): Promise<Chain> {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Kæden skal have et navn.');
    const all = await this.store.list('chains');
    if (all.some((c) => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase())) {
      throw new ValidationError('Der findes allerede en kæde med det navn.');
    }
    if (input.id) return this.store.update('chains', input.id, { name });
    return this.store.insert('chains', { id: newId(), name, isTest: false, createdAt: now() });
  }

  async saveFormat(input: { id?: string; chainId: string; name: string }): Promise<ChainFormat> {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Formatet skal have et navn.');
    if (input.id) return this.store.update('formats', input.id, { name });
    return this.store.insert('formats', { id: newId(), chainId: input.chainId, name });
  }

  async saveWarehouse(input: { id?: string; chainId: string; formatId: string | null; name: string }): Promise<Warehouse> {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Modtagelageret skal have et navn.');
    if (input.id) return this.store.update('warehouses', input.id, { name, formatId: input.formatId });
    const chain = await this.store.get('chains', input.chainId);
    return this.store.insert('warehouses', { id: newId(), chainId: input.chainId, formatId: input.formatId, name, isTest: !!chain?.isTest });
  }

  // ------------------------------------------------------- Dokumenter

  async listDocuments(chainId?: string): Promise<SourceDocument[]> {
    const docs = await this.store.list('documents');
    return docs
      .filter((d) => !chainId || d.chainId === chainId)
      .sort((a, b) => a.title.localeCompare(b.title, 'da') || b.validFrom.localeCompare(a.validFrom));
  }

  async saveDocument(
    input: {
      id?: string;
      chainId: string;
      title: string;
      docVersion: string;
      validFrom: string;
      validTo: string | null;
      file?: { data: Blob; name: string; type: string } | null;
    },
    user: DemoUserV5,
  ): Promise<SourceDocument> {
    if (user.role !== 'regelansvarlig') throw new ForbiddenError('Kun regelansvarlig kan registrere dokumenter.');
    const title = input.title.trim();
    if (!title) throw new ValidationError('Dokumentet skal have en titel.');
    if (!input.docVersion.trim()) throw new ValidationError('Angiv dokumentets version.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validFrom)) throw new ValidationError('Angiv gyldig fra-dato.');
    if (input.validTo && input.validTo < input.validFrom) throw new ValidationError('Gyldig til skal være efter gyldig fra.');

    let fileFields: Partial<SourceDocument> = {};
    if (input.file) {
      const fileId = newId();
      await this.store.blobs.put(fileId, input.file.data);
      fileFields = { fileId, fileName: input.file.name, fileType: input.file.type, fileSize: input.file.data.size };
    }
    const base = { title, docVersion: input.docVersion.trim(), validFrom: input.validFrom, validTo: input.validTo || null, ...fileFields };
    if (input.id) return this.store.update('documents', input.id, base);
    const chain = await this.store.get('chains', input.chainId);
    return this.store.insert('documents', {
      id: newId(),
      chainId: input.chainId,
      fileId: null,
      fileName: null,
      fileType: null,
      fileSize: null,
      isTest: !!chain?.isTest,
      uploadedAt: now(),
      uploadedBy: user.id,
      ...base,
    } as SourceDocument);
  }

  // -------------------------------------------------------- Regelsæt

  async listRuleSets(chainId?: string): Promise<RuleSet[]> {
    return (await this.store.list('ruleSets')).filter((r) => !chainId || r.scope.chainId === chainId);
  }

  /** Nyeste version pr. regelsæt (ét kort pr. regelsæt i admin). */
  async listCurrent(chainId?: string): Promise<RuleSet[]> {
    const all = await this.listRuleSets(chainId);
    const byLineage = new Map<string, RuleSet>();
    for (const r of all) {
      const cur = byLineage.get(r.lineageId);
      if (!cur || r.version > cur.version) byLineage.set(r.lineageId, r);
    }
    return [...byLineage.values()];
  }

  async history(lineageId: string): Promise<RuleSet[]> {
    return (await this.store.list('ruleSets')).filter((r) => r.lineageId === lineageId).sort((a, b) => b.version - a.version);
  }

  async createDraft(input: { scope: RuleScope; title: string }, user: DemoUserV5): Promise<RuleSet> {
    this.assertOwner(user);
    const title = input.title.trim();
    if (!title) throw new ValidationError('Regelsættet skal have et navn.');
    this.validateScope(input.scope);
    const chain = await this.store.get('chains', input.scope.chainId);
    const id = newId();
    return this.store.insert('ruleSets', {
      id,
      lineageId: id,
      version: 1,
      scope: input.scope,
      title,
      fields: {},
      requiredFields: [],
      referenceImage: null,
      status: 'draft',
      changeSummary: null,
      createdAt: now(),
      createdBy: user.id,
      updatedAt: now(),
      submittedAt: null,
      submittedBy: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
      isTest: !!chain?.isTest,
    });
  }

  /** Ny version af et godkendt (eller udgået) regelsæt — den gældende version er urørt, indtil den nye publiceres. */
  async newVersion(sourceId: string, user: DemoUserV5): Promise<RuleSet> {
    this.assertOwner(user);
    const source = await this.mustGet(sourceId);
    const versions = await this.history(source.lineageId);
    if (versions.some((v) => v.status === 'draft' || v.status === 'pending_review')) {
      throw new ConflictError('Der findes allerede en ny version under arbejde for dette regelsæt.');
    }
    const id = newId();
    return this.store.insert('ruleSets', {
      ...structuredCloneSafe(source),
      id,
      version: Math.max(...versions.map((v) => v.version)) + 1,
      status: 'draft',
      changeSummary: null,
      createdAt: now(),
      createdBy: user.id,
      updatedAt: now(),
      submittedAt: null,
      submittedBy: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
    });
  }

  async updateDraft(
    id: string,
    patch: Partial<Pick<RuleSet, 'title' | 'fields' | 'requiredFields' | 'referenceImage' | 'changeSummary'>>,
    user: DemoUserV5,
  ): Promise<RuleSet> {
    this.assertOwner(user);
    const rs = await this.mustGet(id);
    if (rs.status !== 'draft') throw new ValidationError('Kun udkast kan redigeres. Opret en ny version.');
    if (patch.title !== undefined && !patch.title.trim()) throw new ValidationError('Regelsættet skal have et navn.');
    return this.store.update('ruleSets', id, { ...patch, updatedAt: now() });
  }

  async deleteDraft(id: string, user: DemoUserV5): Promise<void> {
    this.assertOwner(user);
    const rs = await this.mustGet(id);
    if (rs.status !== 'draft') throw new ValidationError('Kun udkast kan slettes.');
    await this.store.remove('ruleSets', id);
  }

  /** Tjekker at hvert udfyldt felt har kilde, og at kilden hører til kæden. */
  async validateForReview(rs: RuleSet): Promise<string[]> {
    const problems: string[] = [];
    const docs = await this.listDocuments(rs.scope.chainId);
    const docIds = new Set(docs.map((d) => d.id));
    const filled = Object.entries(rs.fields) as Array<[RuleFieldKey, RuleField]>;
    if (filled.filter(([, f]) => f.value.trim() || f.unclear).length === 0) problems.push('Regelsættet indeholder ingen krav.');
    for (const [key, f] of filled) {
      const label = FIELD_BY_KEY.get(key)?.label ?? key;
      if (!f.value.trim() && !f.unclear) continue;
      if (!f.sourceDocId || !docIds.has(f.sourceDocId)) problems.push(`${label}: vælg kildedokument.`);
      if (!f.sourceRef.trim()) problems.push(`${label}: angiv afsnit eller side.`);
      const def = FIELD_BY_KEY.get(key);
      if (def?.kind === 'number' && f.value.trim() && !/^\d+([.,]\d+)?$/.test(f.value.trim())) problems.push(`${label}: skal være et tal.`);
    }
    if (rs.referenceImage && (!rs.referenceImage.sourceDocId || !rs.referenceImage.sourceRef.trim())) {
      problems.push('Referencebillede: angiv kildedokument og side.');
    }
    return problems;
  }

  async submitForReview(id: string, changeSummary: string, user: DemoUserV5): Promise<RuleSet> {
    this.assertOwner(user);
    const rs = await this.mustGet(id);
    if (rs.status !== 'draft') throw new ValidationError('Kun udkast kan sendes til kontrol.');
    const problems = await this.validateForReview(rs);
    if (problems.length) throw new ValidationError(problems.join(' '));
    return this.store.update('ruleSets', id, {
      status: 'pending_review',
      changeSummary: changeSummary.trim() || (rs.version === 1 ? 'Første version' : 'Opdateret pakkekrav'),
      submittedAt: now(),
      submittedBy: user.id,
      reviewNote: null,
    });
  }

  /** Kontrollant godkender → publiceres. Forrige gældende version bliver "Udgået". */
  async approveAndPublish(id: string, note: string, user: DemoUserV5): Promise<RuleSet> {
    this.assertReviewer(user);
    const rs = await this.mustGet(id);
    if (rs.status !== 'pending_review') throw new ValidationError('Regelsættet afventer ikke kontrol.');
    if (rs.submittedBy === user.id || rs.createdBy === user.id) {
      throw new ForbiddenError('Du kan ikke kontrollere et regelsæt, du selv har udarbejdet.');
    }
    const problems = await this.validateForReview(rs);
    if (problems.length) throw new ValidationError(problems.join(' '));
    let result: RuleSet | null = null;
    await this.store.transaction(async () => {
      for (const v of await this.history(rs.lineageId)) {
        if (v.status === 'approved') await this.store.update('ruleSets', v.id, { status: 'retired' });
      }
      result = await this.store.update('ruleSets', id, { status: 'approved', reviewedAt: now(), reviewedBy: user.id, reviewNote: note.trim() || null });
    });
    return result!;
  }

  async reject(id: string, note: string, user: DemoUserV5): Promise<RuleSet> {
    this.assertReviewer(user);
    const rs = await this.mustGet(id);
    if (rs.status !== 'pending_review') throw new ValidationError('Regelsættet afventer ikke kontrol.');
    if (!note.trim()) throw new ValidationError('Skriv hvorfor regelsættet sendes retur.');
    return this.store.update('ruleSets', id, { status: 'draft', reviewedAt: now(), reviewedBy: user.id, reviewNote: note.trim() });
  }

  /** Kontrollant kan tage et gældende regelsæt ud af brug (fx når vejledningen er trukket tilbage). */
  async retire(id: string, note: string, user: DemoUserV5): Promise<RuleSet> {
    this.assertReviewer(user);
    const rs = await this.mustGet(id);
    if (rs.status !== 'approved') throw new ValidationError('Kun gældende regelsæt kan sættes til udgået.');
    if (!note.trim()) throw new ValidationError('Skriv hvorfor regelsættet udgår.');
    return this.store.update('ruleSets', id, { status: 'retired', reviewNote: note.trim(), reviewedAt: now(), reviewedBy: user.id });
  }

  // -------------------------------------------------------- Opslag

  async resolve(input: { chainId: string; formatId: string | null; warehouseId: string | null; hypothetical?: RuleSet | null }): Promise<Resolution> {
    const [chain, ruleSets, documents] = await Promise.all([
      this.store.get('chains', input.chainId),
      this.store.list('ruleSets'),
      this.store.list('documents'),
    ]);
    if (!chain) throw new NotFoundError('Kæde');
    const warehouse = input.warehouseId ? await this.store.get('warehouses', input.warehouseId) : null;
    const formatId = input.formatId ?? warehouse?.formatId ?? null;
    const format = formatId ? await this.store.get('formats', formatId) : null;
    return resolveRequirements({ chain, format, warehouse, ruleSets, documents, today: today(), hypothetical: input.hypothetical });
  }

  private validateScope(scope: RuleScope) {
    if (scope.level === 'format' && !scope.formatId) throw new ValidationError('Vælg kædeformat.');
    if (scope.level === 'warehouse' && !scope.warehouseId) throw new ValidationError('Vælg modtagelager.');
  }

  private async mustGet(id: string): Promise<RuleSet> {
    const rs = await this.store.get('ruleSets', id);
    if (!rs) throw new NotFoundError('Regelsæt');
    return rs;
  }

  private assertOwner(user: DemoUserV5) {
    if (user.role !== 'regelansvarlig') throw new ForbiddenError('Kun regelansvarlig kan oprette og redigere pakkekrav.');
  }

  private assertReviewer(user: DemoUserV5) {
    if (user.role !== 'kontrollant') throw new ForbiddenError('Kun kontrollant kan godkende pakkekrav.');
  }
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

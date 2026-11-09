/**
 * Regelmotoren — ren logik uden UI og uden lager.
 *
 * Princip: appen viser KUN krav, der er godkendt, publiceret og dokumenteret
 * med en gyldig kilde. Den opfinder aldrig en pakkemetode.
 *
 * 1. Kun godkendte regelsæt (status "approved") for kæde, format og lager.
 * 2. Pr. felt: mest specifikke niveau, hvor feltet er angivet, vinder
 *    (lager → format → kæde).
 * 3. To godkendte regelsæt på SAMME niveau med forskellige værdier = konflikt → STOP.
 * 4. Felt markeret uklart, felt med udløbet kildedokument, eller obligatorisk
 *    felt uden værdi = AFKLARING.
 * 5. Ingen godkendte regelsæt overhovedet = AFVENTER OFFICIEL VEJLEDNING.
 */
import { FIELD_DEFS } from './fields';
import type {
  Chain,
  ChainFormat,
  Resolution,
  ResolvedField,
  RuleFieldKey,
  RuleLevel,
  RuleSet,
  SourceDocument,
  Warehouse,
} from './types';

const LEVEL_ORDER: RuleLevel[] = ['warehouse', 'format', 'chain'];

export function documentValidOn(doc: SourceDocument | undefined, day: string): boolean {
  if (!doc) return false;
  if (doc.validFrom && doc.validFrom > day) return false;
  if (doc.validTo && doc.validTo < day) return false;
  return true;
}

export interface ResolveInput {
  chain: Chain;
  format: ChainFormat | null;
  warehouse: Warehouse | null;
  ruleSets: readonly RuleSet[];
  documents: readonly SourceDocument[];
  /** YYYY-MM-DD */
  today: string;
  /** Forhåndsvisning: behandl dette udkast, som om det var publiceret. */
  hypothetical?: RuleSet | null;
}

function appliesTo(rs: RuleSet, input: ResolveInput): boolean {
  const s = rs.scope;
  if (s.chainId !== input.chain.id) return false;
  if (s.level === 'chain') return true;
  if (s.level === 'format') return !!input.format && s.formatId === input.format.id;
  return !!input.warehouse && s.warehouseId === input.warehouse.id;
}

export function resolveRequirements(input: ResolveInput): Resolution {
  let candidates = input.ruleSets.filter((r) => r.status === 'approved');
  if (input.hypothetical) {
    const h = input.hypothetical;
    candidates = candidates.filter((r) => r.lineageId !== h.lineageId);
    candidates.push({ ...h, status: 'approved' });
  }
  const active = candidates.filter((r) => appliesTo(r, input));
  const docs = new Map(input.documents.map((d) => [d.id, d] as const));

  const base: Resolution = {
    status: 'awaiting',
    chain: input.chain,
    format: input.format,
    warehouse: input.warehouse,
    fields: [],
    conflicts: [],
    missing: [],
    unclear: [],
    expired: [],
    referenceImage: null,
    ruleSetsUsed: [],
    isTest: input.chain.isTest,
  };
  if (active.length === 0) return base;

  const byLevel = (level: RuleLevel) => active.filter((r) => r.scope.level === level);
  const used = new Set<string>();

  for (const def of FIELD_DEFS) {
    const key = def.key;
    for (const level of LEVEL_ORDER) {
      const sets = byLevel(level).filter((r) => {
        const f = r.fields[key];
        return !!f && (f.value.trim() !== '' || f.unclear);
      });
      if (sets.length === 0) continue;

      sets.forEach((s) => used.add(s.id));
      if (sets.some((s) => s.fields[key]!.unclear)) {
        base.unclear.push(key);
        break;
      }
      const distinct = new Map<string, RuleSet[]>();
      for (const s of sets) {
        const v = s.fields[key]!.value.trim();
        distinct.set(v.toLowerCase(), [...(distinct.get(v.toLowerCase()) ?? []), s]);
      }
      if (distinct.size > 1) {
        base.conflicts.push({
          key,
          level,
          values: sets.map((s) => ({ value: s.fields[key]!.value.trim(), ruleSetId: s.id, title: s.title })),
        });
        break;
      }
      const winner = sets[0]!;
      const field = winner.fields[key]!;
      const doc = field.sourceDocId ? docs.get(field.sourceDocId) : undefined;
      if (!doc || !documentValidOn(doc, input.today)) {
        base.expired.push({ key, docTitle: doc ? `${doc.title} v${doc.docVersion}` : 'ukendt dokument' });
        break;
      }
      const resolved: ResolvedField = {
        key,
        value: field.value.trim(),
        level,
        ruleSetId: winner.id,
        ruleSetVersion: winner.version,
        sourceDocId: doc.id,
        sourceRef: field.sourceRef,
        checkpoint: field.checkpoint,
      };
      base.fields.push(resolved);
      break;
    }
  }

  const required = new Set<RuleFieldKey>(active.flatMap((r) => r.requiredFields));
  const have = new Set(base.fields.map((f) => f.key));
  const flagged = new Set<RuleFieldKey>([...base.unclear, ...base.conflicts.map((c) => c.key), ...base.expired.map((e) => e.key)]);
  base.missing = [...required].filter((k) => !have.has(k) && !flagged.has(k));

  for (const level of LEVEL_ORDER) {
    const withImage = byLevel(level).find((r) => r.referenceImage);
    if (withImage?.referenceImage) {
      base.referenceImage = { ...withImage.referenceImage, ruleSetId: withImage.id };
      used.add(withImage.id);
      break;
    }
  }

  base.ruleSetsUsed = active
    .filter((r) => used.has(r.id))
    .map((r) => ({ id: r.id, title: r.title, version: r.version, level: r.scope.level }));

  if (base.conflicts.length > 0) base.status = 'stop';
  else if (base.unclear.length > 0 || base.missing.length > 0 || base.expired.length > 0) base.status = 'clarify';
  else base.status = 'ok';
  return base;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

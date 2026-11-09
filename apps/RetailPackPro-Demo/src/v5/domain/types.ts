/**
 * RetailPackPro v0.5 — regelbank for detailkædernes pakkekrav.
 *
 * Kravene kommer fra detailkæderne, ikke fra leverandøren. Strukturen er:
 *   Detailkæde → (Kædeformat) → Modtagelager → Pakkekrav (regelsæt)
 * Regelsæt kan ligge på alle tre niveauer; det mest specifikke DOKUMENTEREDE
 * krav har forrang. Alt er klar til en senere Supabase-migration
 * (uuid-id'er, tidsstempler, fremmednøgler).
 */

export type RuleLevel = 'chain' | 'format' | 'warehouse';

export interface Chain {
  id: string;
  name: string;
  /** Fiktiv testkæde til afprøvning af regelmotoren — aldrig en rigtig kæde. */
  isTest: boolean;
  createdAt: string;
}

export interface ChainFormat {
  id: string;
  chainId: string;
  name: string;
}

export interface Warehouse {
  id: string;
  chainId: string;
  formatId: string | null;
  name: string;
  isTest: boolean;
}

export interface SourceDocument {
  id: string;
  chainId: string;
  title: string;
  /** Kædens egen versionsbetegnelse, fx "3.1". */
  docVersion: string;
  validFrom: string; // YYYY-MM-DD
  validTo: string | null;
  /** Vedhæftet fil i lokalt billedlager (IndexedDB). */
  fileId: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  isTest: boolean;
  uploadedAt: string;
  uploadedBy: string;
}

export type RuleFieldKey =
  | 'palletType'
  | 'palletShare'
  | 'maxHeightCm'
  | 'maxWeightKg'
  | 'buildUp'
  | 'stability'
  | 'overhang'
  | 'foil'
  | 'loadSecuring'
  | 'interlayer'
  | 'cornerProtection'
  | 'labels'
  | 'labelPlacement'
  | 'specialRequirements';

export interface RuleField {
  /** Kravet som kort tekst (eller tal for højde/vægt). Tom = ikke angivet. */
  value: string;
  sourceDocId: string | null;
  /** Afsnit eller side i kildedokumentet, fx "afsnit 4.2, s. 7". */
  sourceRef: string;
  /** Markeret som uklart i kilden → medarbejderen får en afklaringsbesked. */
  unclear: boolean;
  /** Vises som kontrolpunkt for medarbejderen. */
  checkpoint: boolean;
}

export type RuleStatus = 'draft' | 'pending_review' | 'approved' | 'retired';

export interface RuleScope {
  level: RuleLevel;
  chainId: string;
  formatId: string | null;
  warehouseId: string | null;
}

export interface ReferenceImage {
  fileId: string;
  /** "reference" = billede fra den officielle vejledning; "illustration" = forklarende, ikke dokumentation. */
  kind: 'reference' | 'illustration';
  caption: string;
  sourceDocId: string | null;
  sourceRef: string;
}

export interface RuleSet {
  id: string;
  /** Binder versioner af samme regelsæt sammen (som v0.3.0's lineage_id). */
  lineageId: string;
  version: number;
  scope: RuleScope;
  title: string;
  fields: Partial<Record<RuleFieldKey, RuleField>>;
  /** Hvilke felter den officielle vejledning gør obligatoriske. */
  requiredFields: RuleFieldKey[];
  referenceImage: ReferenceImage | null;
  status: RuleStatus;
  changeSummary: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  isTest: boolean;
}

// ------------------------------------------------------------ Regelmotor

export type ResolutionStatus = 'ok' | 'clarify' | 'stop' | 'awaiting';

export interface ResolvedField {
  key: RuleFieldKey;
  value: string;
  level: RuleLevel;
  ruleSetId: string;
  ruleSetVersion: number;
  sourceDocId: string;
  sourceRef: string;
  checkpoint: boolean;
}

export interface Resolution {
  status: ResolutionStatus;
  chain: Chain;
  format: ChainFormat | null;
  warehouse: Warehouse | null;
  fields: ResolvedField[];
  conflicts: Array<{ key: RuleFieldKey; level: RuleLevel; values: Array<{ value: string; ruleSetId: string; title: string }> }>;
  missing: RuleFieldKey[];
  unclear: RuleFieldKey[];
  /** Felter hvis kildedokument ikke er gyldigt i dag. */
  expired: Array<{ key: RuleFieldKey; docTitle: string }>;
  referenceImage: (ReferenceImage & { ruleSetId: string }) | null;
  ruleSetsUsed: Array<{ id: string; title: string; version: number; level: RuleLevel }>;
  isTest: boolean;
}

// ------------------------------------------------- Plukruter og paller

/**
 * Lokal testordre. I drift kommer disse oplysninger fra pluklisten i
 * Microsoft Dynamics AX 2009 — RetailPackPro kopierer ikke ordrer, varer,
 * antal eller partier fra AX.
 */
export interface Pickroute {
  id: string;
  /** Plukrutenummer — den ØVERSTE stregkode på pluklisten. */
  routeNumber: string;
  salesOrder: string;
  recipientName: string;
  chainId: string;
  formatId: string | null;
  warehouseId: string | null;
  /** Kun i demoen: parti-ID'er fra test-pluklisten, så appen kan advare, hvis de scannes. */
  demoBatchIds: string[];
  isTest: true;
  createdAt: string;
}

export type PalletStatus = 'in_progress' | 'approved' | 'deviation';

export interface CheckResult {
  key: RuleFieldKey;
  label: string;
  requirement: string;
  ok: boolean | null;
}

export interface RuleSnapshot {
  status: ResolutionStatus;
  ruleSets: Array<{ id: string; title: string; version: number; level: RuleLevel }>;
  documents: Array<{ id: string; title: string; docVersion: string }>;
  issues: string[];
}

export interface PalletRecord {
  id: string;
  pickrouteId: string;
  /** Entydigt palle-ID: automatisk (plukrute-løbenr.) eller scannet SSCC. */
  palletId: string;
  palletIdKind: 'auto' | 'sscc';
  number: number;
  status: PalletStatus;
  checks: CheckResult[];
  deviationReason: string | null;
  snapshot: RuleSnapshot | null;
  createdAt: string;
  createdBy: string;
  registeredAt: string | null;
  registeredBy: string | null;
}

export interface PhotoRecordV5 {
  id: string;
  pickrouteId: string;
  palletRecordId: string | null;
  fileId: string;
  createdAt: string;
  createdBy: string;
  replacedAt: string | null;
  replacedBy: string | null;
  width: number;
  height: number;
  sizeBytes: number;
}

export const MAX_PHOTOS_PER_ORDER = 35;

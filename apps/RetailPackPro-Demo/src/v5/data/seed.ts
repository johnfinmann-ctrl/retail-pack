/**
 * Testdata for v0.5.
 *
 * RIGTIGE KÆDER (Salling Group, Coop, Dagrofa, Reitan, Lidl) får INGEN
 * pakkeregler — de står som "Afventer officiel vejledning", indtil de
 * officielle dokumenter er gennemgået og indlæst.
 *
 * Regelmotoren afprøves på en FIKTIV "Testkæde" med fiktive dokumenter.
 * Plukrute 204874 / salgsordre 334327 / SuperBrugsen Vig er eksemplet fra
 * Carletti — her som LOKAL testordre (ikke hentet fra AX).
 */
import type { CollectionName, Collections, DemoUserV5 } from '../domain/store';
import type { OrderLine, Pickroute, RuleField, RuleFieldKey, RuleSet } from '../domain/types';

export const SCHEMA_VERSION = 2;

export const USERS_V5 = {
  employee: { id: 'u-employee', fullName: 'Demo-medarbejder', role: 'medarbejder' },
  owner: { id: 'u-owner', fullName: 'Demo-regelansvarlig', role: 'regelansvarlig' },
  reviewer: { id: 'u-reviewer', fullName: 'Demo-kontrollant', role: 'kontrollant' },
} as const satisfies Record<string, DemoUserV5>;

export type StateV5 = { schemaVersion: number; seededAt: string; users: DemoUserV5[] } & {
  [C in CollectionName]: Collections[C][];
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

function field(value: string, sourceDocId: string, sourceRef: string, extra: Partial<RuleField> = {}): RuleField {
  return { value, sourceDocId, sourceRef, unclear: false, checkpoint: true, ...extra };
}

function ruleSet(
  p: Pick<RuleSet, 'id' | 'title' | 'scope'> & Partial<RuleSet> & { fields: Partial<Record<RuleFieldKey, RuleField>> },
  publishedDaysAgo: number,
): RuleSet {
  return {
    lineageId: p.id,
    version: 1,
    requiredFields: [],
    referenceImage: null,
    status: 'approved',
    changeSummary: 'Første version',
    createdAt: daysAgo(publishedDaysAgo + 2),
    createdBy: USERS_V5.owner.id,
    updatedAt: daysAgo(publishedDaysAgo + 1),
    submittedAt: daysAgo(publishedDaysAgo + 1),
    submittedBy: USERS_V5.owner.id,
    reviewedAt: daysAgo(publishedDaysAgo),
    reviewedBy: USERS_V5.reviewer.id,
    reviewNote: null,
    isTest: true,
    ...p,
  };
}

export function createSeedV5(): StateV5 {
  const created = daysAgo(30);
  const T = 'ch-test';
  const scopeW = (warehouseId: string) => ({ level: 'warehouse' as const, chainId: T, formatId: 'fmt-test', warehouseId });

  return {
    schemaVersion: SCHEMA_VERSION,
    seededAt: new Date().toISOString(),
    users: [USERS_V5.employee, USERS_V5.owner, USERS_V5.reviewer],

    chains: [
      { id: 'ch-salling', name: 'Salling Group', isTest: false, createdAt: created },
      { id: 'ch-coop', name: 'Coop', isTest: false, createdAt: created },
      { id: 'ch-dagrofa', name: 'Dagrofa', isTest: false, createdAt: created },
      { id: 'ch-reitan', name: 'Reitan', isTest: false, createdAt: created },
      { id: 'ch-lidl', name: 'Lidl', isTest: false, createdAt: created },
      { id: T, name: 'Testkæde (fiktiv)', isTest: true, createdAt: created },
    ],
    formats: [
      { id: 'fmt-netto', chainId: 'ch-salling', name: 'Netto' },
      { id: 'fmt-superbrugsen', chainId: 'ch-coop', name: 'SuperBrugsen' },
      { id: 'fmt-test', chainId: T, name: 'Testformat' },
    ],
    warehouses: [
      { id: 'wh-netto-aarslev', chainId: 'ch-salling', formatId: 'fmt-netto', name: 'Netto Årslev', isTest: false },
      { id: 'wh-netto-koege', chainId: 'ch-salling', formatId: 'fmt-netto', name: 'Netto Køge', isTest: false },
      { id: 'wh-test-nord', chainId: T, formatId: 'fmt-test', name: 'Testlager Nord', isTest: true },
      { id: 'wh-test-syd', chainId: T, formatId: 'fmt-test', name: 'Testlager Syd', isTest: true },
      { id: 'wh-test-vest', chainId: T, formatId: 'fmt-test', name: 'Testlager Vest', isTest: true },
      { id: 'wh-test-oest', chainId: T, formatId: 'fmt-test', name: 'Testlager Øst', isTest: true },
    ],

    documents: [
      {
        id: 'doc-test-1', chainId: T, title: 'Fiktivt testdokument – Testkædens pakkekrav', docVersion: '1.0',
        validFrom: '2026-01-01', validTo: null, fileId: null, fileName: null, fileType: null, fileSize: null,
        isTest: true, uploadedAt: created, uploadedBy: USERS_V5.owner.id,
      },
      {
        id: 'doc-test-2', chainId: T, title: 'Fiktivt tillæg – Testkædens modtagelagre', docVersion: '2.0',
        validFrom: '2026-03-01', validTo: null, fileId: null, fileName: null, fileType: null, fileSize: null,
        isTest: true, uploadedAt: created, uploadedBy: USERS_V5.owner.id,
      },
      {
        id: 'doc-test-old', chainId: T, title: 'Fiktivt tillæg – Testlager Øst (udløbet)', docVersion: '0.9',
        validFrom: '2025-01-01', validTo: '2026-06-30', fileId: null, fileName: null, fileType: null, fileSize: null,
        isTest: true, uploadedAt: daysAgo(400), uploadedBy: USERS_V5.owner.id,
      },
    ],

    ruleSets: [
      ruleSet(
        {
          id: 'rs-test-chain',
          title: 'Testkæde – generelle pakkekrav',
          scope: { level: 'chain', chainId: T, formatId: null, warehouseId: null },
          requiredFields: ['palletType', 'maxHeightCm', 'maxWeightKg', 'labels', 'labelPlacement'],
          fields: {
            palletType: field('EUR-palle 120 × 80 cm', 'doc-test-1', 'afsnit 2.1, s. 3'),
            palletShare: field('Hel- og halvpaller modtages', 'doc-test-1', 'afsnit 2.2, s. 3', { checkpoint: false }),
            maxHeightCm: field('160', 'doc-test-1', 'afsnit 3.1, s. 4'),
            maxWeightKg: field('750', 'doc-test-1', 'afsnit 3.2, s. 4'),
            buildUp: field('Tungeste kolli nederst. Lige lag uden huller.', 'doc-test-1', 'afsnit 4.1, s. 5'),
            stability: field('Pallen skal stå stabilt uden folie.', 'doc-test-1', 'afsnit 4.2, s. 5'),
            overhang: field('Intet overhæng over pallens kant', 'doc-test-1', 'afsnit 4.3, s. 5'),
            foil: field('Strækfilm, mindst 3 omgange, bundet til pallen', 'doc-test-1', 'afsnit 5.1, s. 6'),
            labels: field('SSCC-pallelabel (GS1-128)', 'doc-test-1', 'afsnit 6.1, s. 8'),
            labelPlacement: field('Kortside og langside', 'doc-test-1', 'afsnit 6.2, s. 8'),
          },
        },
        40,
      ),
      ruleSet(
        {
          id: 'rs-test-nord',
          title: 'Testlager Nord – lokale krav',
          scope: scopeW('wh-test-nord'),
          fields: {
            maxHeightCm: field('180', 'doc-test-2', 'Testlager Nord, s. 2'),
            specialRequirements: field('Levering kun kl. 06–10. Kølevarer på særskilt palle.', 'doc-test-2', 'Testlager Nord, s. 2'),
          },
        },
        20,
      ),
      // Afventer kontrol — må IKKE vises for medarbejderen endnu
      ruleSet(
        {
          id: 'rs-test-nord-v2',
          lineageId: 'rs-test-nord',
          version: 2,
          status: 'pending_review',
          changeSummary: 'Maks. højde sænkes fra 180 til 170 cm',
          reviewedAt: null,
          reviewedBy: null,
          title: 'Testlager Nord – lokale krav',
          scope: scopeW('wh-test-nord'),
          fields: {
            maxHeightCm: field('170', 'doc-test-2', 'Testlager Nord, s. 2'),
            specialRequirements: field('Levering kun kl. 06–10. Kølevarer på særskilt palle.', 'doc-test-2', 'Testlager Nord, s. 2'),
          },
        },
        1,
      ),
      ruleSet(
        {
          id: 'rs-test-syd',
          title: 'Testlager Syd – lokale krav',
          scope: scopeW('wh-test-syd'),
          fields: {
            palletType: field('Halvpalle 80 × 60 cm', 'doc-test-2', 'Testlager Syd, s. 3'),
            maxHeightCm: field('120', 'doc-test-2', 'Testlager Syd, s. 3'),
            labelPlacement: field('Kun kortside, øverst til højre', 'doc-test-2', 'Testlager Syd, s. 3'),
          },
        },
        15,
      ),
      // To godkendte regelsæt på samme lager med forskellig højde → konflikt
      ruleSet(
        {
          id: 'rs-test-vest-a',
          title: 'Testlager Vest – krav A',
          scope: scopeW('wh-test-vest'),
          fields: { maxHeightCm: field('150', 'doc-test-2', 'Testlager Vest, s. 4') },
        },
        10,
      ),
      ruleSet(
        {
          id: 'rs-test-vest-b',
          title: 'Testlager Vest – krav B',
          scope: scopeW('wh-test-vest'),
          fields: { maxHeightCm: field('140', 'doc-test-2', 'Testlager Vest, s. 5') },
        },
        8,
      ),
      // Uklart krav + krav fra udløbet dokument → afklaring
      ruleSet(
        {
          id: 'rs-test-oest',
          title: 'Testlager Øst – lokale krav',
          scope: scopeW('wh-test-oest'),
          fields: {
            labelPlacement: field('Kun langside', 'doc-test-old', 's. 2'),
            specialRequirements: field('', 'doc-test-2', 'Testlager Øst, s. 6', { unclear: true }),
          },
        },
        200,
      ),
      // Udkast — ikke sendt til kontrol
      ruleSet(
        {
          id: 'rs-test-format-draft',
          title: 'Testformat – krav til mellemlæg',
          scope: { level: 'format', chainId: T, formatId: 'fmt-test', warehouseId: null },
          status: 'draft',
          changeSummary: null,
          submittedAt: null,
          submittedBy: null,
          reviewedAt: null,
          reviewedBy: null,
          fields: { interlayer: field('Mellemlæg mellem hvert 2. lag', 'doc-test-1', 'afsnit 5.3, s. 7') },
        },
        0,
      ),
    ],

    pickroutes: [
      ...([
      {
        id: 'pr-204874', routeNumber: '204874', salesOrder: '334327', recipientName: 'SuperBrugsen Vig',
        chainId: 'ch-coop', formatId: 'fmt-superbrugsen', warehouseId: null,
        demoBatchIds: ['P26110471', 'P26110472', 'P26110488'], isTest: true, createdAt: daysAgo(1),
      },
      {
        id: 'pr-204901', routeNumber: '204901', salesOrder: '334410', recipientName: 'Netto Årslev',
        chainId: 'ch-salling', formatId: 'fmt-netto', warehouseId: 'wh-netto-aarslev',
        demoBatchIds: ['P26110501'], isTest: true, createdAt: daysAgo(1),
      },
      {
        id: 'pr-204902', routeNumber: '204902', salesOrder: '334411', recipientName: 'Netto Køge',
        chainId: 'ch-salling', formatId: 'fmt-netto', warehouseId: 'wh-netto-koege',
        demoBatchIds: ['P26110502'], isTest: true, createdAt: daysAgo(1),
      },
      {
        id: 'pr-205001', routeNumber: '205001', salesOrder: '900101', recipientName: 'Testbutik Nord',
        chainId: T, formatId: 'fmt-test', warehouseId: 'wh-test-nord', demoBatchIds: ['P90000101'], isTest: true, createdAt: daysAgo(0),
      },
      {
        id: 'pr-205002', routeNumber: '205002', salesOrder: '900102', recipientName: 'Testbutik Syd',
        chainId: T, formatId: 'fmt-test', warehouseId: 'wh-test-syd', demoBatchIds: ['P90000102'], isTest: true, createdAt: daysAgo(0),
      },
      {
        id: 'pr-205003', routeNumber: '205003', salesOrder: '900103', recipientName: 'Testbutik Vest',
        chainId: T, formatId: 'fmt-test', warehouseId: 'wh-test-vest', demoBatchIds: ['P90000103'], isTest: true, createdAt: daysAgo(0),
      },
      {
        id: 'pr-205004', routeNumber: '205004', salesOrder: '900104', recipientName: 'Testbutik Øst',
        chainId: T, formatId: 'fmt-test', warehouseId: 'wh-test-oest', demoBatchIds: ['P90000104'], isTest: true, createdAt: daysAgo(0),
      },
      ] as LegacyPickroute[]).map(withSplitDefaults),
      ...splitTestRoutes(),
    ],
    pallets: [],
    photos: [],
    axEvents: [],
    axInbound: [],
  };
}

// ------------------------------------------------ v0.5.1: delte ordrer

/** Plukrute som i v0.5.0 (før felterne for delte ordrer). */
export type LegacyPickroute = Omit<
  Pickroute,
  'lines' | 'carlettiStatus' | 'carlettiCompletedAt' | 'carlettiCompletedBy' | 'deliveryDecision' | 'deliveryDecisionAt' | 'axConfirmedComplete' | 'axConfirmedAt'
>;

export function withSplitDefaults(p: LegacyPickroute & Partial<Pickroute>): Pickroute {
  return {
    lines: [],
    carlettiStatus: 'not_started',
    carlettiCompletedAt: null,
    carlettiCompletedBy: null,
    deliveryDecision: 'not_applicable',
    deliveryDecisionAt: null,
    axConfirmedComplete: false,
    axConfirmedAt: null,
    ...p,
  };
}

const line = (id: string, itemNumber: string, description: string, site: 'H5' | 'FL'): OrderLine => ({
  id,
  itemNumber,
  description,
  site,
  location: site === 'H5' ? 'PLUK1' : 'FL',
  status: 'open',
});

/** Tre fiktive testordrer til delte ordrer — TESTDATA, ikke fra AX. */
export function splitTestRoutes(): Pickroute[] {
  const base = { chainId: 'ch-test', formatId: 'fmt-test', warehouseId: 'wh-test-nord', isTest: true as const, createdAt: daysAgo(0) };
  return [
    withSplitDefaults({
      ...base,
      id: 'pr-205101',
      routeNumber: '205101',
      salesOrder: '900201',
      recipientName: 'Testbutik Nord – kun H5',
      demoBatchIds: ['P90000201'],
      lines: [line('l-205101-1', 'TEST-1001', 'Testvare A (fiktiv)', 'H5'), line('l-205101-2', 'TEST-1002', 'Testvare B (fiktiv)', 'H5')],
    }),
    withSplitDefaults({
      ...base,
      id: 'pr-205102',
      routeNumber: '205102',
      salesOrder: '900202',
      recipientName: 'Testbutik Nord – konsolidering',
      demoBatchIds: ['P90000202'],
      lines: [
        line('l-205102-1', 'TEST-1001', 'Testvare A (fiktiv)', 'H5'),
        line('l-205102-2', 'TEST-2001', 'Testvare C – fjernlager (fiktiv)', 'FL'),
        line('l-205102-3', 'TEST-2002', 'Testvare D – fjernlager (fiktiv)', 'FL'),
      ],
      deliveryDecision: 'consolidation',
      deliveryDecisionAt: daysAgo(0),
    }),
    withSplitDefaults({
      ...base,
      id: 'pr-205103',
      routeNumber: '205103',
      salesOrder: '900203',
      recipientName: 'Testbutik Nord – delt levering',
      demoBatchIds: ['P90000203'],
      lines: [
        line('l-205103-1', 'TEST-1002', 'Testvare B (fiktiv)', 'H5'),
        line('l-205103-2', 'TEST-2001', 'Testvare C – fjernlager (fiktiv)', 'FL'),
      ],
      deliveryDecision: 'split',
      deliveryDecisionAt: daysAgo(0),
    }),
  ];
}

/**
 * Løfter en gemt v0.5.0-tilstand (schema 1) til v0.5.1 (schema 2) UDEN at
 * miste registreringer, fotos, dokumenter eller regeländringer.
 */
export function migrateState(old: Partial<StateV5> & { schemaVersion: number }): StateV5 {
  const fresh = createSeedV5();
  if (old.schemaVersion === SCHEMA_VERSION) return old as StateV5;
  if (old.schemaVersion !== 1) return fresh;
  const routes = ((old.pickroutes ?? []) as Array<LegacyPickroute & Partial<Pickroute>>).map(withSplitDefaults);
  // Carlettis status afledes af eksisterende paller
  for (const r of routes) {
    if ((old.pallets ?? []).some((p) => p.pickrouteId === r.id)) r.carlettiStatus = 'in_progress';
  }
  for (const add of splitTestRoutes()) if (!routes.some((r) => r.id === add.id || r.routeNumber === add.routeNumber)) routes.push(add);
  return {
    ...fresh,
    ...old,
    schemaVersion: SCHEMA_VERSION,
    pickroutes: routes,
    axEvents: [],
    axInbound: [],
  } as StateV5;
}

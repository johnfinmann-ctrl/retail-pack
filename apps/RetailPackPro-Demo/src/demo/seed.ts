/**
 * Fiktive demodata. INGEN rigtige Carletti-data og ingen personoplysninger.
 * Stregkoder bruger GS1-præfiks 20–29 (reserveret til intern brug), så de
 * aldrig kan forveksles med rigtige handelsvarer.
 */
import type {
  PackagingItem,
  PackFlowStep,
  PackSession,
  ReferenceImage,
} from '@rpp/data/types';

import type { CustomerV4, Order, PackProfileV4, Pallet, PhotoRecord, ProductV4 } from '../domain/types';

export const DEMO_SCHEMA_VERSION = 3;
export const COMPANY_ID = 'demo-company';

export interface DemoUser {
  id: string;
  fullName: string;
  role: 'medarbejder' | 'admin';
}

export interface DemoState {
  schemaVersion: number;
  seededAt: string;
  companyName: string;
  users: DemoUser[];
  customers: CustomerV4[];
  products: ProductV4[];
  packaging: PackagingItem[];
  profiles: PackProfileV4[];
  productLinks: Record<string, string[]>;
  flowSteps: PackFlowStep[];
  referenceImages: ReferenceImage[];
  sessions: PackSession[];
  orders: Order[];
  pallets: Pallet[];
  photos: PhotoRecord[];
}

export const USERS = {
  employee: { id: 'u-employee', fullName: 'Demo-medarbejder', role: 'medarbejder' },
  admin: { id: 'u-admin', fullName: 'Demo-administrator', role: 'admin' },
} as const satisfies Record<string, DemoUser>;

/** Beregner EAN-13-kontrolciffer, så alle demokoder kan scannes. */
export function ean13(first12: string): string {
  const digits = first12.split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return first12 + String((10 - (sum % 10)) % 10);
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function product(id: string, itemNumber: string, eanBody: string, name: string, image: string, category: string): ProductV4 {
  return {
    id,
    companyId: COMPANY_ID,
    ean: ean13(eanBody),
    itemNumber,
    name,
    description: null,
    imageUrl: image,
    category,
  };
}

function profile(
  p: Partial<PackProfileV4> & Pick<PackProfileV4, 'id' | 'customerId' | 'name'>,
  publishedDaysAgo: number,
): PackProfileV4 {
  const publishedAt = new Date(Date.now() - publishedDaysAgo * 86_400_000).toISOString();
  return {
    companyId: COMPANY_ID,
    boxItemId: null,
    innerPackagingItemId: null,
    dividerItemId: null,
    cornerProtectorItemId: null,
    palletItemId: 'pk-eur',
    placementPatternImageUrl: null,
    maxHeightCm: null,
    maxWeightKg: null,
    layerCount: null,
    unitsPerLayer: null,
    mixedPalletAllowed: null,
    labelPosition: null,
    ssccLabelRequired: true,
    foilType: null,
    overhangAllowed: false,
    specialInstructions: null,
    version: 1,
    status: 'published',
    effectiveFrom: null,
    createdBy: USERS.admin.id,
    updatedBy: USERS.admin.id,
    lockedBy: null,
    lockedAt: null,
    publishedAt,
    lineageId: p.id,
    changeSummary: 'Første version',
    ...p,
  };
}

export function createSeed(): DemoState {
  const products: ProductV4[] = [
    product('p-ch1001', 'CH-1001', '200000100100', 'Mørk chokolade 70 % · 100 g', 'illustration:bar:#4a2c1d', 'Chokolade'),
    product('p-ch1002', 'CH-1002', '200000100200', 'Mælkechokolade · 100 g', 'illustration:bar:#8a5a3b', 'Chokolade'),
    product('p-kb2001', 'KB-2001', '200000200100', 'Karamelbar · display 24 stk', 'illustration:box:#c8862a', 'Bars'),
    product('p-lk3001', 'LK-3001', '200000300100', 'Lakridskugler · 250 g', 'illustration:bag:#1f1f24', 'Slik'),
    product('p-vg4001', 'VG-4001', '200000400100', 'Vingummi mix · 500 g', 'illustration:bag:#d13b5a', 'Slik'),
    product('p-jk5001', 'JK-5001', '200000500100', 'Julekalender med chokolade', 'illustration:box:#2f6b3a', 'Sæson'),
    product('p-pn6001', 'PN-6001', '200000600100', 'Pebernødder · 300 g', 'illustration:bag:#b5651d', 'Sæson'),
    product('p-gp7001', 'GP-7001', '200000700100', 'Gaveæske praliner · 200 g', 'illustration:box:#6d2e46', 'Gaver'),
  ];

  const packaging: PackagingItem[] = [
    { id: 'pk-eur', companyId: COMPANY_ID, type: 'pallet_type', name: 'EUR-palle 120 × 80', imageUrl: 'illustration:pallet:eur', dimensions: '120 × 80 cm', notes: null },
    { id: 'pk-half', companyId: COMPANY_ID, type: 'pallet_type', name: 'Halvpalle 80 × 60', imageUrl: 'illustration:pallet:half', dimensions: '80 × 60 cm', notes: null },
    { id: 'pk-quarter', companyId: COMPANY_ID, type: 'pallet_type', name: 'Kvartpalle 60 × 40', imageUrl: 'illustration:pallet:quarter', dimensions: '60 × 40 cm', notes: null },
    { id: 'pk-box', companyId: COMPANY_ID, type: 'box', name: 'Transportkarton', imageUrl: 'illustration:carton:#b08850', dimensions: '40 × 30 × 20 cm', notes: null },
    { id: 'pk-divider', companyId: COMPANY_ID, type: 'divider', name: 'Mellemlæg (pap)', imageUrl: 'illustration:divider:#c9a96e', dimensions: null, notes: null },
    { id: 'pk-corner', companyId: COMPANY_ID, type: 'corner_protector', name: 'Hjørnebeskyttere', imageUrl: 'illustration:corner:#8c6d3f', dimensions: null, notes: null },
  ];

  const customers: CustomerV4[] = [
    { id: 'c-carletti', companyId: COMPANY_ID, name: 'Carletti', logoUrl: null, notes: 'Testkunde — kun fiktive data', packFlowMode: null, active: true, isTestCustomer: true },
    { id: 'c-nordhavn', companyId: COMPANY_ID, name: 'Nordhavn Supermarked', logoUrl: null, notes: null, packFlowMode: null, active: true, isTestCustomer: false },
    { id: 'c-fjordby', companyId: COMPANY_ID, name: 'Fjordby Grossist', logoUrl: null, notes: null, packFlowMode: null, active: true, isTestCustomer: false },
  ];

  const profiles: PackProfileV4[] = [
    profile(
      {
        id: 'pp-carletti-std',
        customerId: 'c-carletti',
        name: 'Chokolade · EUR-palle',
        boxItemId: 'pk-box',
        dividerItemId: 'pk-divider',
        layerCount: 6,
        unitsPerLayer: 12,
        maxHeightCm: 160,
        maxWeightKg: 600,
        mixedPalletAllowed: true,
        labelPosition: 'Kortside, øverst til højre',
        foilType: 'Klar strækfilm · 3 omgange',
      },
      30,
    ),
    profile(
      {
        id: 'pp-nordhavn-std',
        customerId: 'c-nordhavn',
        name: 'Standard · EUR-palle',
        layerCount: 5,
        unitsPerLayer: 10,
        maxHeightCm: 180,
        maxWeightKg: 750,
        mixedPalletAllowed: true,
        labelPosition: 'Langside og kortside',
        foilType: 'Sort strækfilm · 4 omgange',
        cornerProtectorItemId: 'pk-corner',
      },
      40,
    ),
    profile(
      {
        id: 'pp-nordhavn-heat',
        customerId: 'c-nordhavn',
        name: 'Varmefølsom chokolade',
        boxItemId: 'pk-box',
        dividerItemId: 'pk-divider',
        cornerProtectorItemId: 'pk-corner',
        layerCount: 5,
        unitsPerLayer: 10,
        maxHeightCm: 150,
        maxWeightKg: 500,
        mixedPalletAllowed: false,
        labelPosition: 'Kortside, øverst til højre',
        foilType: 'Hvid UV-folie · 3 omgange',
        specialInstructions: 'Varmefølsom vare: Pak i kølezonen og folier straks. Højst 15 minutter uden for køl.',
      },
      12,
    ),
    profile(
      {
        id: 'pp-fjordby-half',
        customerId: 'c-fjordby',
        name: 'Slik · halvpalle',
        palletItemId: 'pk-half',
        layerCount: 4,
        unitsPerLayer: 8,
        maxHeightCm: 120,
        maxWeightKg: 300,
        mixedPalletAllowed: true,
        labelPosition: 'Langside, midt',
        foilType: 'Klar strækfilm · 2 omgange',
      },
      20,
    ),
    // Versionshistorik-eksempel: v1 (arkiveret) → v2 (publiceret)
    profile(
      {
        id: 'pp-carletti-season-v1',
        lineageId: 'pp-carletti-season-v1',
        customerId: 'c-carletti',
        name: 'Sæsonvarer · EUR-palle',
        layerCount: 4,
        unitsPerLayer: 6,
        maxHeightCm: 160,
        maxWeightKg: 400,
        mixedPalletAllowed: false,
        labelPosition: 'Kortside, midt',
        foilType: 'Klar strækfilm · 3 omgange',
        status: 'archived',
      },
      60,
    ),
    profile(
      {
        id: 'pp-carletti-season-v2',
        lineageId: 'pp-carletti-season-v1',
        version: 2,
        customerId: 'c-carletti',
        name: 'Sæsonvarer · EUR-palle',
        cornerProtectorItemId: 'pk-corner',
        layerCount: 4,
        unitsPerLayer: 6,
        maxHeightCm: 140,
        maxWeightKg: 400,
        mixedPalletAllowed: false,
        labelPosition: 'Kortside, øverst til højre',
        foilType: 'Klar strækfilm · 3 omgange',
        changeSummary: 'Maks. højde ændret fra 160 til 140 cm og hjørnebeskyttere tilføjet',
      },
      5,
    ),
  ];

  const productLinks: Record<string, string[]> = {
    'pp-carletti-std': ['p-ch1001', 'p-ch1002', 'p-gp7001'],
    'pp-nordhavn-std': [], // tom = gælder alle kundens produkter (v0.3.0-reglen)
    'pp-nordhavn-heat': ['p-ch1001', 'p-ch1002', 'p-gp7001'],
    'pp-fjordby-half': ['p-lk3001', 'p-vg4001', 'p-pn6001'],
    'pp-carletti-season-v1': ['p-jk5001', 'p-kb2001'],
    'pp-carletti-season-v2': ['p-jk5001', 'p-kb2001'],
  };

  const flowSteps: PackFlowStep[] = [
    { id: 'fs-1', companyId: COMPANY_ID, stepKey: 'packaging', sortOrder: 1, enabled: true },
    { id: 'fs-2', companyId: COMPANY_ID, stepKey: 'pallet', sortOrder: 2, enabled: true },
    { id: 'fs-3', companyId: COMPANY_ID, stepKey: 'photo', sortOrder: 3, enabled: false },
    { id: 'fs-4', companyId: COMPANY_ID, stepKey: 'approve', sortOrder: 4, enabled: true },
  ];

  const referenceImages: ReferenceImage[] = [
    { id: 'ri-1', packProfileId: 'pp-nordhavn-heat', url: 'illustration:label:right', caption: 'Label: kortside, øverst til højre', sortOrder: 1, relatedStep: 'pallet' },
    { id: 'ri-2', packProfileId: 'pp-carletti-std', url: 'illustration:layer:12', caption: 'Lagmønster: 12 kolli pr. lag', sortOrder: 1, relatedStep: 'pallet' },
  ];

  const orders: Order[] = [
    {
      id: 'o-10421',
      companyId: COMPANY_ID,
      orderNumber: 'ORD-10421',
      customerId: 'c-nordhavn',
      deliveryDate: isoDay(1),
      status: 'open',
      note: 'Flere paller · varmefølsom chokolade',
      lines: [
        { id: 'ol-1', productId: 'p-ch1001', quantity: 100 },
        { id: 'ol-2', productId: 'p-ch1002', quantity: 60 },
        { id: 'ol-3', productId: 'p-gp7001', quantity: 30 },
      ],
      completedAt: null,
      completedBy: null,
    },
    {
      id: 'o-10422',
      companyId: COMPANY_ID,
      orderNumber: 'ORD-10422',
      customerId: 'c-carletti',
      deliveryDate: isoDay(1),
      status: 'open',
      note: 'Testkunde',
      lines: [
        { id: 'ol-4', productId: 'p-ch1001', quantity: 48 },
        { id: 'ol-5', productId: 'p-ch1002', quantity: 24 },
        { id: 'ol-6', productId: 'p-jk5001', quantity: 24 },
      ],
      completedAt: null,
      completedBy: null,
    },
    {
      id: 'o-10423',
      companyId: COMPANY_ID,
      orderNumber: 'ORD-10423',
      customerId: 'c-fjordby',
      deliveryDate: isoDay(0),
      status: 'in_progress',
      note: null,
      lines: [
        { id: 'ol-7', productId: 'p-lk3001', quantity: 40 },
        { id: 'ol-8', productId: 'p-vg4001', quantity: 24 },
        { id: 'ol-9', productId: 'p-pn6001', quantity: 20 },
      ],
      completedAt: null,
      completedBy: null,
    },
  ];

  const pallets: Pallet[] = [
    {
      id: 'pl-10423-1',
      orderId: 'o-10423',
      number: 1,
      lines: [{ productId: 'p-lk3001', quantity: 32 }],
      registeredAt: new Date(Date.now() - 45 * 60_000).toISOString(),
      registeredBy: USERS.employee.id,
    },
  ];

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    seededAt: new Date().toISOString(),
    companyName: 'RetailPackPro Demo-lager',
    users: [USERS.employee, USERS.admin],
    customers,
    products,
    packaging,
    profiles,
    productLinks,
    flowSteps,
    referenceImages,
    sessions: [],
    orders,
    pallets,
    photos: [],
  };
}

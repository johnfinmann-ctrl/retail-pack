/**
 * Demo-datalaget: implementerer v0.3.0's repository-interfaces (UÆNDREDE) og
 * v0.4.0-udvidelserne mod lokal testlagring. Dette er den ENESTE del af
 * demoen, der erstatter Supabase — services og forretningsregler er de samme.
 *
 * Kan aldrig skrive til en produktionsdatabase: der er ingen netværkskald.
 */
import { ConflictError, NotFoundError, ValidationError } from '@platform/config';
import type {
  CustomerRepository,
  PackagingRepository,
  PackProfileRepository,
  PackSessionRepository,
  ProductRepository,
} from '@rpp/data/repositories/interfaces';
import type {
  NewCustomer,
  NewPackagingItem,
  NewPackProfile,
  NewPackSession,
  NewProduct,
  PackagingItem,
  PackagingItemType,
  PackProfileVersionSummary,
  PackSession,
  ReferenceImage,
} from '@rpp/data/types';

import { createSeed, DEMO_SCHEMA_VERSION, type DemoState } from '../demo/seed';
import { newId, type BlobStore, type JsonStorage } from '../demo/storage';
import type {
  CatalogAdminRepository,
  OrderRepository,
  PhotoRepository,
  ReferenceImageAdminRepository,
  RepositoriesV4,
} from '../domain/interfaces';
import type {
  CustomerV4,
  Order,
  OrderStatus,
  PackProfileV4,
  PackProfileV4Fields,
  Pallet,
  PalletLine,
  PhotoRecord,
  ProductV4,
  ReferenceImageInput,
} from '../domain/types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Fælles tilstand + persistens for alle demo-repositories. */
export class DemoDatabase {
  state: DemoState;
  /** false hvis seneste gem blev afvist (fx fuld kvote). */
  lastSaveOk = true;
  private listeners = new Set<() => void>();

  constructor(
    private readonly storage: JsonStorage<DemoState>,
    readonly blobs: BlobStore,
  ) {
    const stored = storage.read();
    this.state = stored && stored.schemaVersion === DEMO_SCHEMA_VERSION ? stored : createSeed();
    if (!stored || stored.schemaVersion !== DEMO_SCHEMA_VERSION) this.save();
  }

  get persistent(): boolean {
    return this.storage.persistent && this.blobs.persistent;
  }

  save(): void {
    this.lastSaveOk = this.storage.write(this.state);
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async reset(): Promise<void> {
    this.storage.clear();
    await this.blobs.clear();
    this.state = createSeed();
    this.save();
  }

  userName(userId: string): string | null {
    return this.state.users.find((u) => u.id === userId)?.fullName ?? null;
  }
}

// ------------------------------------------------------------------ Kunder

export class DemoCustomerRepository implements CustomerRepository {
  constructor(private readonly db: DemoDatabase) {}
  async listActive(companyId: string) {
    return clone(
      this.db.state.customers
        .filter((c) => c.companyId === companyId && c.active)
        .sort((a, b) => a.name.localeCompare(b.name, 'da')),
    );
  }
  async getById(customerId: string) {
    const c = this.db.state.customers.find((x) => x.id === customerId);
    return c ? clone(c) : null;
  }
  async create(input: NewCustomer) {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Kunden skal have et navn.');
    const created: CustomerV4 = {
      id: newId(),
      companyId: input.companyId,
      name,
      logoUrl: input.logoUrl ?? null,
      notes: null,
      packFlowMode: null,
      active: true,
      isTestCustomer: false,
    };
    this.db.state.customers.push(created);
    this.db.save();
    return clone(created);
  }
}

// ---------------------------------------------------------------- Produkter

export class DemoProductRepository implements ProductRepository {
  constructor(private readonly db: DemoDatabase) {}
  async findByEan(companyId: string, ean: string) {
    const p = this.db.state.products.find((x) => x.companyId === companyId && x.ean === ean);
    return p ? clone(p) : null;
  }
  async searchByName(companyId: string, query: string) {
    const q = query.trim().toLowerCase();
    return clone(
      this.db.state.products.filter(
        (p) => p.companyId === companyId && (p.name.toLowerCase().includes(q) || p.itemNumber.toLowerCase().includes(q)),
      ),
    );
  }
  async getById(productId: string) {
    const p = this.db.state.products.find((x) => x.id === productId);
    return p ? clone(p) : null;
  }
  async listAll(companyId: string) {
    return clone(
      this.db.state.products
        .filter((p) => p.companyId === companyId)
        .sort((a, b) => a.itemNumber.localeCompare(b.itemNumber, 'da')),
    );
  }
  async create(input: NewProduct) {
    // v0.3.0-kontrakten har intet varenummer — demoens admin bruger createProductV4.
    return new DemoCatalogRepository(this.db).createProductV4({ ...input, itemNumber: input.ean, imageUrl: input.imageUrl ?? null });
  }
}

// --------------------------------------------------------------- Emballage

export class DemoPackagingRepository implements PackagingRepository {
  constructor(private readonly db: DemoDatabase) {}
  async listByIds(ids: readonly string[]) {
    return clone(this.db.state.packaging.filter((i) => ids.includes(i.id)));
  }
  async listByType(companyId: string, type: PackagingItemType) {
    return clone(this.db.state.packaging.filter((i) => i.companyId === companyId && i.type === type));
  }
  async create(input: NewPackagingItem) {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Navn mangler.');
    const created: PackagingItem = {
      id: newId(),
      companyId: input.companyId,
      type: input.type,
      name,
      imageUrl: input.imageUrl ?? null,
      dimensions: null,
      notes: null,
    };
    this.db.state.packaging.push(created);
    this.db.save();
    return clone(created);
  }
}

// ------------------------------------------------------- Pakkevejledninger

const EDITABLE_FIELDS = [
  'name',
  'palletItemId',
  'maxHeightCm',
  'maxWeightKg',
  'layerCount',
  'mixedPalletAllowed',
  'labelPosition',
  'foilType',
  'specialInstructions',
  // v0.4.0
  'unitsPerLayer',
  'placementPatternImageUrl',
  'overhangAllowed',
  'ssccLabelRequired',
  'boxItemId',
  'innerPackagingItemId',
  'dividerItemId',
  'cornerProtectorItemId',
] as const;

type EditableInput = Partial<NewPackProfile> & PackProfileV4Fields & Partial<Pick<PackProfileV4, 'boxItemId' | 'innerPackagingItemId' | 'dividerItemId' | 'cornerProtectorItemId'>>;

export class DemoPackProfileRepository implements PackProfileRepository {
  constructor(private readonly db: DemoDatabase) {}

  private get profiles() {
    return this.db.state.profiles;
  }

  async findPublishedForCustomerAndProduct(customerId: string, productId: string) {
    const published = this.profiles.filter((p) => p.customerId === customerId && p.status === 'published');
    const links = (p: PackProfileV4) => this.db.state.productLinks[p.id] ?? [];
    // En vejledning for netop denne vare går forud for en "alle varer"-vejledning.
    const specific = published.find((p) => links(p).includes(productId));
    const general = published.find((p) => links(p).length === 0);
    const match = specific ?? general;
    return match ? clone(match) : null;
  }

  async listFlowSteps(companyId: string) {
    return clone(this.db.state.flowSteps.filter((s) => s.companyId === companyId));
  }

  async listReferenceImages(packProfileId: string) {
    return clone(
      this.db.state.referenceImages
        .filter((r) => r.packProfileId === packProfileId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }

  async listAllForCompany(companyId: string) {
    return clone(this.profiles.filter((p) => p.companyId === companyId));
  }

  async create(input: NewPackProfile & EditableInput) {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Pakkevejledningen skal have et navn.');
    const id = newId();
    const created: PackProfileV4 = {
      id,
      companyId: input.companyId,
      customerId: input.customerId,
      name,
      boxItemId: input.boxItemId ?? null,
      innerPackagingItemId: input.innerPackagingItemId ?? null,
      dividerItemId: input.dividerItemId ?? null,
      cornerProtectorItemId: input.cornerProtectorItemId ?? null,
      palletItemId: input.palletItemId ?? null,
      placementPatternImageUrl: input.placementPatternImageUrl ?? null,
      maxHeightCm: input.maxHeightCm ?? null,
      maxWeightKg: input.maxWeightKg ?? null,
      layerCount: input.layerCount ?? null,
      unitsPerLayer: input.unitsPerLayer ?? null,
      mixedPalletAllowed: input.mixedPalletAllowed ?? null,
      labelPosition: input.labelPosition ?? null,
      ssccLabelRequired: input.ssccLabelRequired ?? true,
      foilType: input.foilType ?? null,
      overhangAllowed: input.overhangAllowed ?? null,
      specialInstructions: input.specialInstructions ?? null,
      version: 1,
      status: 'draft',
      effectiveFrom: null,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      lockedBy: null,
      lockedAt: null,
      publishedAt: null,
      lineageId: id,
      changeSummary: null,
    };
    this.profiles.push(created);
    this.db.state.productLinks[id] = input.productIds ? [...input.productIds] : [];
    this.db.save();
    return clone(created);
  }

  async publish(profileId: string, publishedByUserId: string) {
    const p = this.profiles.find((x) => x.id === profileId);
    if (!p) throw new NotFoundError('Pakkevejledning');
    p.status = 'published';
    p.publishedAt = new Date().toISOString();
    p.updatedBy = publishedByUserId;
    p.changeSummary = p.changeSummary ?? 'Første version';
    this.db.save();
    return clone(p);
  }

  async setProductLinks(profileId: string, productIds: readonly string[]) {
    this.db.state.productLinks[profileId] = [...productIds];
    this.db.save();
  }

  async findDraftForLineage(lineageId: string) {
    const d = this.profiles.find((p) => p.lineageId === lineageId && p.status === 'draft');
    return d ? clone(d) : null;
  }

  async createDraftFromVersion(sourceVersionId: string, editingUserId: string) {
    const source = this.profiles.find((p) => p.id === sourceVersionId);
    if (!source) throw new NotFoundError('Version');
    if (this.profiles.some((p) => p.lineageId === source.lineageId && p.status === 'draft')) {
      throw new ConflictError('Der findes allerede en kladde for denne pakkevejledning', { lineageId: source.lineageId });
    }
    const maxVersion = Math.max(...this.profiles.filter((p) => p.lineageId === source.lineageId).map((p) => p.version));
    const id = newId();
    const draft: PackProfileV4 = {
      ...clone(source),
      id,
      version: maxVersion + 1,
      status: 'draft',
      createdBy: editingUserId,
      updatedBy: editingUserId,
      lockedBy: editingUserId,
      lockedAt: new Date().toISOString(),
      publishedAt: null,
      changeSummary: null,
    };
    this.profiles.push(draft);
    this.db.state.productLinks[id] = [...(this.db.state.productLinks[sourceVersionId] ?? [])];
    // Billedreferencer følger med til den nye version (originalens bevares urørt).
    const refs = this.db.state.referenceImages.filter((r) => r.packProfileId === sourceVersionId);
    for (const r of refs) this.db.state.referenceImages.push({ ...r, id: newId(), packProfileId: id });
    this.db.save();
    return clone(draft);
  }

  async updateDraft(draftId: string, fields: EditableInput) {
    const draft = this.profiles.find((p) => p.id === draftId && p.status === 'draft');
    if (!draft) throw new NotFoundError('Kladde');
    const target = draft as unknown as Record<string, unknown>;
    const source = fields as Record<string, unknown>;
    for (const key of EDITABLE_FIELDS) {
      if (key in source && source[key] !== undefined) target[key] = source[key] ?? null;
    }
    if (typeof fields.name === 'string' && !fields.name.trim()) {
      throw new ValidationError('Pakkevejledningen skal have et navn.');
    }
    draft.updatedBy = draft.lockedBy ?? draft.updatedBy;
    this.db.save();
    return clone(draft);
  }

  async publishDraft(draftId: string, publisherUserId: string, changeSummary?: string | null) {
    const draft = this.profiles.find((p) => p.id === draftId && p.status === 'draft');
    if (!draft) throw new NotFoundError('Kladde');
    // Atomisk i demoen: alle ændringer sker i samme synkrone blok og gemmes samlet.
    for (const p of this.profiles) {
      if (p.lineageId === draft.lineageId && p.status === 'published') p.status = 'archived';
    }
    const trimmed = changeSummary?.trim();
    draft.changeSummary = trimmed ? trimmed : 'Opdateret pakkemetode';
    draft.status = 'published';
    draft.publishedAt = new Date().toISOString();
    draft.updatedBy = publisherUserId;
    draft.lockedBy = null;
    draft.lockedAt = null;
    this.db.save();
    return clone(draft);
  }

  async discardDraft(draftId: string) {
    const index = this.profiles.findIndex((p) => p.id === draftId && p.status === 'draft');
    if (index < 0) return;
    this.profiles.splice(index, 1);
    delete this.db.state.productLinks[draftId];
    this.db.state.referenceImages = this.db.state.referenceImages.filter((r) => r.packProfileId !== draftId);
    this.db.save();
  }

  async listVersionSummaries(lineageId: string): Promise<PackProfileVersionSummary[]> {
    return this.profiles
      .filter((p) => p.lineageId === lineageId && p.status !== 'draft')
      .sort((a, b) => b.version - a.version)
      .map((p) => ({
        id: p.id,
        version: p.version,
        isCurrent: p.status === 'published',
        date: p.publishedAt ?? '',
        userName: p.updatedBy ? this.db.userName(p.updatedBy) : null,
        changeSummary: p.changeSummary,
      }));
  }

  async getUserFullName(userId: string) {
    return this.db.userName(userId);
  }
}

// ------------------------------------------------------------ Godkendelser

export class DemoPackSessionRepository implements PackSessionRepository {
  constructor(private readonly db: DemoDatabase) {}
  async create(session: NewPackSession) {
    const created: PackSession = {
      id: newId(),
      companyId: session.companyId,
      userId: session.userId,
      customerId: session.customerId,
      productId: session.productId,
      packProfileId: session.packProfileId,
      scannedCode: session.scannedCode ?? null,
      stepsCompleted: session.stepsCompleted ?? null,
      approvedAt: new Date().toISOString(),
      deviceInfo: session.deviceInfo ?? null,
    };
    this.db.state.sessions.push(created);
    this.db.save();
    return clone(created);
  }
  async listOwn(userId: string) {
    return clone(this.db.state.sessions.filter((s) => s.userId === userId));
  }
}

// ------------------------------------------------- v0.4.0: Katalog-admin

export class DemoCatalogRepository implements CatalogAdminRepository {
  constructor(private readonly db: DemoDatabase) {}

  async listAllCustomers(companyId: string) {
    return clone(
      this.db.state.customers.filter((c) => c.companyId === companyId).sort((a, b) => a.name.localeCompare(b.name, 'da')),
    );
  }

  async createCustomerV4(input: { companyId: string; name: string; logoUrl: string | null; notes: string | null }) {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Kunden skal have et navn.');
    if (this.db.state.customers.some((c) => c.companyId === input.companyId && c.name.toLowerCase() === name.toLowerCase())) {
      throw new ValidationError('Der findes allerede en kunde med det navn.');
    }
    const created: CustomerV4 = {
      id: newId(),
      companyId: input.companyId,
      name,
      logoUrl: input.logoUrl,
      notes: input.notes,
      packFlowMode: null,
      active: true,
      isTestCustomer: false,
    };
    this.db.state.customers.push(created);
    this.db.save();
    return clone(created);
  }

  async updateCustomer(customerId: string, fields: Partial<Pick<CustomerV4, 'name' | 'logoUrl' | 'active' | 'notes'>>) {
    const c = this.db.state.customers.find((x) => x.id === customerId);
    if (!c) throw new NotFoundError('Kunde');
    if (fields.name !== undefined) {
      const name = fields.name.trim();
      if (!name) throw new ValidationError('Kunden skal have et navn.');
      c.name = name;
    }
    if (fields.logoUrl !== undefined) c.logoUrl = fields.logoUrl;
    if (fields.notes !== undefined) c.notes = fields.notes;
    if (fields.active !== undefined) c.active = fields.active;
    this.db.save();
    return clone(c);
  }

  async findByItemNumber(companyId: string, itemNumber: string) {
    const q = itemNumber.trim().toLowerCase();
    const p = this.db.state.products.find((x) => x.companyId === companyId && x.itemNumber.toLowerCase() === q);
    return p ? clone(p) : null;
  }

  private assertUnique(companyId: string, ean: string, itemNumber: string, exceptId?: string) {
    const others = this.db.state.products.filter((p) => p.companyId === companyId && p.id !== exceptId);
    if (ean && others.some((p) => p.ean === ean)) throw new ValidationError('Stregkoden bruges allerede af en anden vare.');
    if (others.some((p) => p.itemNumber.toLowerCase() === itemNumber.toLowerCase())) {
      throw new ValidationError('Varenummeret bruges allerede af en anden vare.');
    }
  }

  async createProductV4(input: Omit<ProductV4, 'id' | 'description' | 'category'> & { category?: string | null }) {
    const name = input.name.trim();
    const itemNumber = input.itemNumber.trim();
    const ean = input.ean.trim();
    if (!name) throw new ValidationError('Varen skal have et navn.');
    if (!itemNumber) throw new ValidationError('Varenummer mangler.');
    if (ean && !/^\d{8,14}$/.test(ean)) throw new ValidationError('Stregkoden må kun indeholde 8–14 cifre.');
    this.assertUnique(input.companyId, ean, itemNumber);
    const created: ProductV4 = {
      id: newId(),
      companyId: input.companyId,
      ean,
      itemNumber,
      name,
      description: null,
      imageUrl: input.imageUrl,
      category: input.category ?? null,
    };
    this.db.state.products.push(created);
    this.db.save();
    return clone(created);
  }

  async updateProduct(productId: string, fields: Partial<Pick<ProductV4, 'name' | 'ean' | 'itemNumber' | 'imageUrl' | 'category'>>) {
    const p = this.db.state.products.find((x) => x.id === productId);
    if (!p) throw new NotFoundError('Vare');
    const next = { ...p, ...fields };
    next.name = next.name.trim();
    next.itemNumber = next.itemNumber.trim();
    next.ean = next.ean.trim();
    if (!next.name) throw new ValidationError('Varen skal have et navn.');
    if (!next.itemNumber) throw new ValidationError('Varenummer mangler.');
    if (next.ean && !/^\d{8,14}$/.test(next.ean)) throw new ValidationError('Stregkoden må kun indeholde 8–14 cifre.');
    this.assertUnique(p.companyId, next.ean, next.itemNumber, p.id);
    Object.assign(p, next);
    this.db.save();
    return clone(p);
  }

  async getProductLinks(packProfileId: string) {
    return [...(this.db.state.productLinks[packProfileId] ?? [])];
  }
}

export class DemoReferenceImageRepository implements ReferenceImageAdminRepository {
  constructor(private readonly db: DemoDatabase) {}
  async addReferenceImage(input: ReferenceImageInput) {
    const existing = this.db.state.referenceImages.filter((r) => r.packProfileId === input.packProfileId);
    const created: ReferenceImage = {
      id: newId(),
      packProfileId: input.packProfileId,
      url: input.url,
      caption: input.caption,
      sortOrder: existing.length + 1,
      relatedStep: 'pallet',
    };
    this.db.state.referenceImages.push(created);
    this.db.save();
    return clone(created);
  }
  async removeReferenceImage(referenceImageId: string) {
    this.db.state.referenceImages = this.db.state.referenceImages.filter((r) => r.id !== referenceImageId);
    this.db.save();
  }
}

// ---------------------------------------------------------- v0.4.0: Ordrer

const normalizeOrderNo = (v: string) => v.replace(/[\s-]/g, '').toUpperCase();

export class DemoOrderRepository implements OrderRepository {
  constructor(private readonly db: DemoDatabase) {}
  async listForCompany(companyId: string) {
    return clone(
      this.db.state.orders
        .filter((o) => o.companyId === companyId)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.orderNumber.localeCompare(b.orderNumber)),
    );
  }
  async findByNumber(companyId: string, orderNumber: string) {
    const wanted = normalizeOrderNo(orderNumber);
    const o = this.db.state.orders.find(
      (x) =>
        x.companyId === companyId &&
        (normalizeOrderNo(x.orderNumber) === wanted || normalizeOrderNo(x.orderNumber) === `ORD${wanted}`),
    );
    return o ? clone(o) : null;
  }
  async getById(orderId: string) {
    const o = this.db.state.orders.find((x) => x.id === orderId);
    return o ? clone(o) : null;
  }
  async setStatus(orderId: string, status: OrderStatus, completedBy?: string | null): Promise<Order> {
    const o = this.db.state.orders.find((x) => x.id === orderId);
    if (!o) throw new NotFoundError('Ordre');
    o.status = status;
    o.completedAt = status === 'completed' ? new Date().toISOString() : null;
    o.completedBy = status === 'completed' ? (completedBy ?? null) : null;
    this.db.save();
    return clone(o);
  }
  async listPallets(orderId: string) {
    return clone(this.db.state.pallets.filter((p) => p.orderId === orderId).sort((a, b) => a.number - b.number));
  }
  async addPallet(orderId: string, lines: PalletLine[], registeredBy: string) {
    const existing = this.db.state.pallets.filter((p) => p.orderId === orderId);
    const pallet: Pallet = {
      id: newId(),
      orderId,
      number: existing.reduce((max, p) => Math.max(max, p.number), 0) + 1,
      lines: lines.map((l) => ({ ...l })),
      registeredAt: new Date().toISOString(),
      registeredBy,
    };
    this.db.state.pallets.push(pallet);
    this.db.save();
    return clone(pallet);
  }
  async removePallet(palletId: string) {
    this.db.state.pallets = this.db.state.pallets.filter((p) => p.id !== palletId);
    this.db.save();
  }
}

// ------------------------------------------------------------ v0.4.0: Foto

export class DemoPhotoRepository implements PhotoRepository {
  constructor(private readonly db: DemoDatabase) {}
  async listForOrder(orderId: string) {
    return clone(
      this.db.state.photos.filter((p) => p.orderId === orderId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }
  async add(record: Omit<PhotoRecord, 'id' | 'createdAt'>, data: Blob) {
    const created: PhotoRecord = { ...record, id: newId(), createdAt: new Date().toISOString() };
    await this.db.blobs.put(created.id, data); // billedet først — så findes der aldrig en post uden billede
    this.db.state.photos.push(created);
    this.db.save();
    return clone(created);
  }
  async getData(photoId: string) {
    return this.db.blobs.get(photoId);
  }
  async remove(photoId: string) {
    await this.db.blobs.delete(photoId);
    this.db.state.photos = this.db.state.photos.filter((p) => p.id !== photoId);
    this.db.save();
  }
}

export function createDemoRepositories(db: DemoDatabase): RepositoriesV4 {
  return {
    customers: new DemoCustomerRepository(db),
    products: new DemoProductRepository(db),
    packaging: new DemoPackagingRepository(db),
    packProfiles: new DemoPackProfileRepository(db),
    packSessions: new DemoPackSessionRepository(db),
    catalog: new DemoCatalogRepository(db),
    referenceImages: new DemoReferenceImageRepository(db),
    orders: new DemoOrderRepository(db),
    photos: new DemoPhotoRepository(db),
  };
}

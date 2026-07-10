/**
 * In-memory fake-implementeringer af repository-interfaces — BEVISET på at
 * databasen kan mockes helt uden Supabase/netværk (dit krav til Trin 4).
 * Bruges kun i tests, aldrig i den rigtige app.
 */
import { ConflictError } from '@platform/config';

import type {
  Customer,
  NewCustomer,
  NewPackagingItem,
  NewPackProfile,
  NewPackSession,
  NewProduct,
  PackagingItem,
  PackagingItemType,
  PackFlowStep,
  PackProfile,
  PackProfileVersionSummary,
  PackSession,
  Product,
  ReferenceImage,
} from '../../types';
import type {
  CustomerRepository,
  PackagingRepository,
  PackProfileRepository,
  PackSessionRepository,
  ProductRepository,
} from '../interfaces';

export class FakeCustomerRepository implements CustomerRepository {
  private nextId = 1;
  constructor(private readonly customers: Customer[] = []) {}
  async listActive(companyId: string) {
    return this.customers.filter((c) => c.companyId === companyId);
  }
  async getById(id: string) {
    return this.customers.find((c) => c.id === id) ?? null;
  }
  async create(input: NewCustomer): Promise<Customer> {
    const created: Customer = {
      id: `fake-customer-${this.nextId++}`,
      companyId: input.companyId,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      notes: null,
      packFlowMode: null,
    };
    this.customers.push(created);
    return created;
  }
}

export class FakeProductRepository implements ProductRepository {
  private nextId = 1;
  constructor(private readonly products: Product[] = []) {}
  async findByEan(companyId: string, ean: string) {
    return this.products.find((p) => p.companyId === companyId && p.ean === ean) ?? null;
  }
  async searchByName(companyId: string, query: string) {
    return this.products.filter(
      (p) => p.companyId === companyId && p.name.toLowerCase().includes(query.toLowerCase()),
    );
  }
  async getById(id: string) {
    return this.products.find((p) => p.id === id) ?? null;
  }
  async listAll(companyId: string) {
    return this.products.filter((p) => p.companyId === companyId);
  }
  async create(input: NewProduct): Promise<Product> {
    const created: Product = {
      id: `fake-product-${this.nextId++}`,
      companyId: input.companyId,
      ean: input.ean,
      name: input.name,
      description: null,
      imageUrl: input.imageUrl ?? null,
      category: null,
    };
    this.products.push(created);
    return created;
  }
}

export class FakePackagingRepository implements PackagingRepository {
  private nextId = 1;
  constructor(private readonly items: PackagingItem[] = []) {}
  async listByIds(ids: readonly string[]) {
    return this.items.filter((i) => ids.includes(i.id));
  }
  async listByType(companyId: string, type: PackagingItemType) {
    return this.items.filter((i) => i.companyId === companyId && i.type === type);
  }
  async create(input: NewPackagingItem): Promise<PackagingItem> {
    const created: PackagingItem = {
      id: `fake-packaging-${this.nextId++}`,
      companyId: input.companyId,
      type: input.type,
      name: input.name,
      imageUrl: input.imageUrl ?? null,
      dimensions: null,
      notes: null,
    };
    this.items.push(created);
    return created;
  }
}

export class FakePackProfileRepository implements PackProfileRepository {
  private nextId = 1;
  public readonly productLinksWritten: Record<string, string[]> = {};

  constructor(
    private readonly profiles: PackProfile[] = [],
    private readonly productLinks: Record<string, string[]> = {}, // profileId -> productIds
    private readonly flowSteps: PackFlowStep[] = [],
    private readonly referenceImages: ReferenceImage[] = [],
    private readonly userNames: Record<string, string> = {}, // userId -> full name (til laase-visning)
  ) {}

  async findPublishedForCustomerAndProduct(customerId: string, productId: string) {
    const candidates = this.profiles.filter((p) => p.customerId === customerId && p.status === 'published');
    const match = candidates.find((p) => {
      const links = this.productLinks[p.id];
      return !links || links.length === 0 || links.includes(productId);
    });
    return match ?? null;
  }

  async listFlowSteps(companyId: string) {
    return this.flowSteps.filter((s) => s.companyId === companyId);
  }

  async listReferenceImages(packProfileId: string) {
    return this.referenceImages.filter((r) => r.packProfileId === packProfileId);
  }

  async listAllForCompany(companyId: string) {
    return this.profiles.filter((p) => p.companyId === companyId);
  }

  async create(input: NewPackProfile): Promise<PackProfile> {
    const id = `fake-profile-${this.nextId++}`;
    const created: PackProfile = {
      id,
      companyId: input.companyId,
      customerId: input.customerId,
      name: input.name,
      boxItemId: null,
      innerPackagingItemId: null,
      dividerItemId: null,
      cornerProtectorItemId: null,
      palletItemId: input.palletItemId ?? null,
      placementPatternImageUrl: null,
      maxHeightCm: input.maxHeightCm ?? null,
      maxWeightKg: input.maxWeightKg ?? null,
      layerCount: input.layerCount ?? null,
      mixedPalletAllowed: input.mixedPalletAllowed ?? null,
      labelPosition: input.labelPosition ?? null,
      ssccLabelRequired: false,
      foilType: input.foilType ?? null,
      overhangAllowed: null,
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
    return created;
  }

  async publish(profileId: string, publishedByUserId: string): Promise<PackProfile> {
    const profile = this.profiles.find((p) => p.id === profileId);
    if (!profile) throw new Error(`Fake: profil ${profileId} findes ikke`);
    profile.status = 'published';
    profile.publishedAt = new Date().toISOString();
    profile.updatedBy = publishedByUserId;
    return profile;
  }

  async setProductLinks(profileId: string, productIds: readonly string[]): Promise<void> {
    this.productLinksWritten[profileId] = [...productIds];
  }

  // ---- Redigering af en allerede publiceret pakkemetode ----

  async findDraftForLineage(lineageId: string): Promise<PackProfile | null> {
    return this.profiles.find((p) => p.lineageId === lineageId && p.status === 'draft') ?? null;
  }

  async createDraftFromVersion(sourceVersionId: string, editingUserId: string): Promise<PackProfile> {
    const source = this.profiles.find((p) => p.id === sourceVersionId);
    if (!source) throw new Error(`Fake: version ${sourceVersionId} findes ikke`);

    const existingDraft = this.profiles.find((p) => p.lineageId === source.lineageId && p.status === 'draft');
    if (existingDraft) {
      throw new ConflictError('En anden admin er allerede i gang med at redigere denne pakkemetode', {
        lineageId: source.lineageId,
      });
    }

    const currentPublished = this.profiles.find((p) => p.lineageId === source.lineageId && p.status === 'published');
    const nextVersion = (currentPublished?.version ?? source.version) + 1;

    const id = `fake-profile-${this.nextId++}`;
    const draft: PackProfile = {
      ...source,
      id,
      version: nextVersion,
      status: 'draft',
      createdBy: editingUserId,
      updatedBy: editingUserId,
      lockedBy: editingUserId,
      lockedAt: new Date().toISOString(),
      publishedAt: null,
      changeSummary: null,
    };
    this.profiles.push(draft);

    const links = this.productLinks[sourceVersionId];
    if (links && links.length > 0) {
      this.productLinksWritten[id] = [...links];
    }

    return draft;
  }

  async updateDraft(draftId: string, fields: Partial<NewPackProfile>): Promise<PackProfile> {
    const draft = this.profiles.find((p) => p.id === draftId && p.status === 'draft');
    if (!draft) throw new Error(`Fake: kladde ${draftId} findes ikke`);
    if (fields.name !== undefined) draft.name = fields.name;
    if (fields.palletItemId !== undefined) draft.palletItemId = fields.palletItemId ?? null;
    if (fields.maxHeightCm !== undefined) draft.maxHeightCm = fields.maxHeightCm ?? null;
    if (fields.maxWeightKg !== undefined) draft.maxWeightKg = fields.maxWeightKg ?? null;
    if (fields.layerCount !== undefined) draft.layerCount = fields.layerCount ?? null;
    if (fields.mixedPalletAllowed !== undefined) draft.mixedPalletAllowed = fields.mixedPalletAllowed ?? null;
    if (fields.labelPosition !== undefined) draft.labelPosition = fields.labelPosition ?? null;
    if (fields.foilType !== undefined) draft.foilType = fields.foilType ?? null;
    if (fields.specialInstructions !== undefined) draft.specialInstructions = fields.specialInstructions ?? null;
    return draft;
  }

  async publishDraft(draftId: string, publisherUserId: string, changeSummary?: string | null): Promise<PackProfile> {
    const draft = this.profiles.find((p) => p.id === draftId && p.status === 'draft');
    if (!draft) throw new Error(`Fake: kladde ${draftId} findes ikke`);

    // Arkivér den tidligere publicerede version — UDEN at røre dens egen
    // historik (samme rettelse som i den ægte Postgres-funktion).
    for (const p of this.profiles) {
      if (p.lineageId === draft.lineageId && p.status === 'published') {
        p.status = 'archived';
      }
    }

    const trimmed = changeSummary?.trim();
    draft.changeSummary = trimmed && trimmed.length > 0 ? trimmed : 'Opdateret pakkemetode';
    draft.status = 'published';
    draft.publishedAt = new Date().toISOString();
    draft.updatedBy = publisherUserId;
    draft.lockedBy = null;
    draft.lockedAt = null;
    return draft;
  }

  async discardDraft(draftId: string): Promise<void> {
    const index = this.profiles.findIndex((p) => p.id === draftId && p.status === 'draft');
    if (index >= 0) this.profiles.splice(index, 1);
  }

  async listVersionSummaries(lineageId: string): Promise<PackProfileVersionSummary[]> {
    return this.profiles
      .filter((p) => p.lineageId === lineageId)
      .sort((a, b) => b.version - a.version)
      .map((p) => ({
        id: p.id,
        version: p.version,
        isCurrent: p.status === 'published',
        date: p.publishedAt ?? '',
        userName: p.updatedBy ? (this.userNames[p.updatedBy] ?? null) : null,
        changeSummary: p.changeSummary,
      }));
  }

  async getUserFullName(userId: string): Promise<string | null> {
    return this.userNames[userId] ?? null;
  }

  /** Test-bekvemmelighed: sæt et brugernavn efter konstruktion. */
  setUserName(userId: string, fullName: string): void {
    this.userNames[userId] = fullName;
  }
}

export class FakePackSessionRepository implements PackSessionRepository {
  public readonly created: PackSession[] = [];
  constructor(private readonly existing: PackSession[] = []) {}

  async create(session: NewPackSession): Promise<PackSession> {
    const created: PackSession = {
      id: `fake-${this.created.length + 1}`,
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
    this.created.push(created);
    return created;
  }

  async listOwn(userId: string) {
    return [...this.existing, ...this.created].filter((s) => s.userId === userId);
  }
}

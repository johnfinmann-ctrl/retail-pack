/**
 * In-memory fake-implementeringer af repository-interfaces — BEVISET på at
 * databasen kan mockes helt uden Supabase/netværk (dit krav til Trin 4).
 * Bruges kun i tests, aldrig i den rigtige app.
 */
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
    const created: PackProfile = {
      id: `fake-profile-${this.nextId++}`,
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

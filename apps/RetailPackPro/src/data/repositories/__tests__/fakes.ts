/**
 * In-memory fake-implementeringer af repository-interfaces — BEVISET på at
 * databasen kan mockes helt uden Supabase/netværk (dit krav til Trin 4).
 * Bruges kun i tests, aldrig i den rigtige app.
 */
import type {
  Customer,
  NewPackSession,
  PackagingItem,
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
  constructor(private readonly customers: Customer[] = []) {}
  async listActive(companyId: string) {
    return this.customers.filter((c) => c.companyId === companyId);
  }
  async getById(id: string) {
    return this.customers.find((c) => c.id === id) ?? null;
  }
}

export class FakeProductRepository implements ProductRepository {
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
}

export class FakePackagingRepository implements PackagingRepository {
  constructor(private readonly items: PackagingItem[] = []) {}
  async listByIds(ids: readonly string[]) {
    return this.items.filter((i) => ids.includes(i.id));
  }
}

export class FakePackProfileRepository implements PackProfileRepository {
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

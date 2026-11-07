/**
 * Ordre- og palleforretningslogik (v0.4.0). Ingen UI, ingen lagringsdetaljer —
 * kun regler. Kan flyttes uændret ind i apps/RetailPackPro/src/services.
 *
 * Regler:
 * - En palle skal indeholde mindst én vare med antal > 0.
 * - Der kan ikke pakkes flere kolli af en vare, end ordren mangler.
 * - En ordre kan kun afsluttes, når alle kolli er pakket på registrerede paller.
 * - En afsluttet ordre kan ikke ændres.
 */
import { NotFoundError, ValidationError } from '@platform/config';

import type { RepositoriesV4 } from './interfaces';
import type { CustomerV4, Order, OrderProgress, Pallet, PalletLine, PackProfileV4, ProductV4 } from './types';

export interface OrderOverview {
  order: Order;
  customer: CustomerV4 | null;
  products: Map<string, ProductV4>;
  /** Pakkevejledning pr. produkt-id (null = ingen publiceret vejledning). */
  guides: Map<string, PackProfileV4 | null>;
  pallets: Pallet[];
  progress: OrderProgress;
  photoCount: number;
}

export function capacityOf(profile: PackProfileV4 | null | undefined): number | null {
  if (!profile || !profile.layerCount || !profile.unitsPerLayer) return null;
  return profile.layerCount * profile.unitsPerLayer;
}

/** Ren beregning — eksporteret separat, så den kan testes uden lager. */
export function computeProgress(
  order: Order,
  pallets: readonly Pallet[],
  guides: ReadonlyMap<string, PackProfileV4 | null>,
): OrderProgress {
  const packedByProduct = new Map<string, number>();
  for (const pallet of pallets) {
    for (const line of pallet.lines) {
      packedByProduct.set(line.productId, (packedByProduct.get(line.productId) ?? 0) + line.quantity);
    }
  }

  // Skøn: varer der må blandes (mixpalle) deler paller forholdsmæssigt;
  // varer der ikke må blandes, får hver deres hele antal paller.
  let estimateKnown = true;
  let separatePallets = 0;
  let mixedFraction = 0;

  const lines = order.lines.map((line) => {
    const packed = Math.min(packedByProduct.get(line.productId) ?? 0, line.quantity);
    const guide = guides.get(line.productId);
    const capacity = capacityOf(guide);
    if (!capacity) estimateKnown = false;
    else if (guide?.mixedPalletAllowed === true) mixedFraction += line.quantity / capacity;
    else separatePallets += Math.ceil(line.quantity / capacity);
    return { line, packed, remaining: line.quantity - packed, capacityPerPallet: capacity };
  });
  const estimatedPallets = separatePallets + Math.ceil(mixedFraction - 1e-9);

  const totalQuantity = lines.reduce((sum, l) => sum + l.line.quantity, 0);
  const packedQuantity = lines.reduce((sum, l) => sum + l.packed, 0);
  const remainingQuantity = totalQuantity - packedQuantity;

  return {
    totalQuantity,
    packedQuantity,
    remainingQuantity,
    palletsDone: pallets.length,
    palletsEstimated: estimateKnown ? Math.max(estimatedPallets, pallets.length) : null,
    lines,
    canComplete: order.status !== 'completed' && remainingQuantity === 0 && pallets.length > 0,
  };
}

/**
 * Forslag til næste palle: fyld med den første vare, der mangler, op til
 * pallens kapacitet. Er mixpalle tilladt for BÅDE den første og den næste
 * vare, fyldes resterende plads op forholdsmæssigt med næste vare.
 * Medarbejderen kan altid rette antallet, før pallen registreres.
 */
export function suggestNextPallet(
  progress: OrderProgress,
  guides: ReadonlyMap<string, PackProfileV4 | null>,
): PalletLine[] {
  const open = progress.lines.filter((l) => l.remaining > 0);
  const first = open[0];
  if (!first) return [];

  const suggestion: PalletLine[] = [];
  const firstCapacity = first.capacityPerPallet;
  const firstQty = firstCapacity ? Math.min(first.remaining, firstCapacity) : first.remaining;
  suggestion.push({ productId: first.line.productId, quantity: firstQty });

  if (!firstCapacity) return suggestion;
  let usedFraction = firstQty / firstCapacity;
  const firstMixed = guides.get(first.line.productId)?.mixedPalletAllowed === true;

  for (const next of open.slice(1)) {
    if (!firstMixed || usedFraction >= 1) break;
    const nextGuide = guides.get(next.line.productId);
    if (nextGuide?.mixedPalletAllowed !== true || !next.capacityPerPallet) continue;
    const qty = Math.min(next.remaining, Math.floor((1 - usedFraction) * next.capacityPerPallet));
    if (qty <= 0) continue;
    suggestion.push({ productId: next.line.productId, quantity: qty });
    usedFraction += qty / next.capacityPerPallet;
  }
  return suggestion;
}

/**
 * Tjekker en palle mod pakkevejledningerne:
 * - fyldningsgrad (sum af antal / kapacitet) må ikke overstige 100 %
 * - flere forskellige varer kræver, at mixpalle er tilladt for dem alle
 */
export function checkPallet(
  lines: readonly PalletLine[],
  guides: ReadonlyMap<string, PackProfileV4 | null>,
  products: ReadonlyMap<string, ProductV4>,
): { fill: number | null; error: string | null } {
  const used = lines.filter((l) => l.quantity > 0);
  let fill: number | null = 0;
  for (const l of used) {
    const cap = capacityOf(guides.get(l.productId));
    if (!cap) fill = null;
    else if (fill !== null) fill += l.quantity / cap;
  }
  if (used.length > 1) {
    const blocked = used.find((l) => guides.get(l.productId)?.mixedPalletAllowed !== true);
    if (blocked) {
      const name = products.get(blocked.productId)?.name ?? 'en af varerne';
      return { fill, error: `Mixpalle er ikke tilladt for ${name}. Pak varen på sin egen palle.` };
    }
  }
  if (fill !== null && fill > 1 + 1e-9) {
    return { fill, error: 'Pallen rummer mere end pakkevejledningen tillader. Fordel varerne på flere paller.' };
  }
  return { fill, error: null };
}

export class OrderService {
  constructor(private readonly repos: Pick<RepositoriesV4, 'orders' | 'products' | 'customers' | 'packProfiles' | 'photos'>) {}

  listOrders(companyId: string): Promise<Order[]> {
    return this.repos.orders.listForCompany(companyId);
  }

  /** Accepterer ordrenummer med eller uden mellemrum/bindestreger og store/små bogstaver. */
  async findOrder(companyId: string, code: string): Promise<Order | null> {
    const normalized = code.trim();
    if (!normalized) return null;
    return this.repos.orders.findByNumber(companyId, normalized);
  }

  async getOverview(orderId: string): Promise<OrderOverview> {
    const order = await this.repos.orders.getById(orderId);
    if (!order) throw new NotFoundError('Ordre');

    const [customer, pallets, photos] = await Promise.all([
      this.repos.customers.getById(order.customerId) as Promise<CustomerV4 | null>,
      this.repos.orders.listPallets(orderId),
      this.repos.photos.listForOrder(orderId),
    ]);

    const products = new Map<string, ProductV4>();
    const guides = new Map<string, PackProfileV4 | null>();
    await Promise.all(
      order.lines.map(async (line) => {
        const [product, guide] = await Promise.all([
          this.repos.products.getById(line.productId),
          this.repos.packProfiles.findPublishedForCustomerAndProduct(order.customerId, line.productId),
        ]);
        if (product) products.set(product.id, product as ProductV4);
        guides.set(line.productId, (guide as PackProfileV4 | null) ?? null);
      }),
    );

    return {
      order,
      customer,
      products,
      guides,
      pallets,
      progress: computeProgress(order, pallets, guides),
      photoCount: photos.length,
    };
  }

  async registerPallet(orderId: string, lines: PalletLine[], userId: string): Promise<Pallet> {
    const overview = await this.getOverview(orderId);
    if (overview.order.status === 'completed') {
      throw new ValidationError('Ordren er afsluttet og kan ikke ændres.');
    }
    const cleaned = lines.filter((l) => l.quantity > 0);
    if (cleaned.length === 0) {
      throw new ValidationError('Pallen skal indeholde mindst én vare.');
    }
    for (const line of cleaned) {
      const progressLine = overview.progress.lines.find((l) => l.line.productId === line.productId);
      if (!progressLine) throw new ValidationError('Varen findes ikke på ordren.');
      if (!Number.isInteger(line.quantity)) throw new ValidationError('Antal skal være et helt tal.');
      if (line.quantity > progressLine.remaining) {
        throw new ValidationError(`Der mangler kun ${progressLine.remaining} kolli af denne vare.`);
      }
    }
    const check = checkPallet(cleaned, overview.guides, overview.products);
    if (check.error) throw new ValidationError(check.error);
    const pallet = await this.repos.orders.addPallet(orderId, cleaned, userId);
    if (overview.order.status === 'open') await this.repos.orders.setStatus(orderId, 'in_progress');
    return pallet;
  }

  /** Fortryd seneste palle (fx ved fejlregistrering). Pallens billeder slettes også. */
  async undoLastPallet(orderId: string): Promise<void> {
    const overview = await this.getOverview(orderId);
    if (overview.order.status === 'completed') {
      throw new ValidationError('Ordren er afsluttet og kan ikke ændres.');
    }
    const last = [...overview.pallets].sort((a, b) => b.number - a.number)[0];
    if (!last) return;
    const photos = await this.repos.photos.listForOrder(orderId);
    await Promise.all(photos.filter((p) => p.palletId === last.id).map((p) => this.repos.photos.remove(p.id)));
    await this.repos.orders.removePallet(last.id);
    if (overview.pallets.length === 1) await this.repos.orders.setStatus(orderId, 'open');
  }

  async completeOrder(orderId: string, userId: string): Promise<Order> {
    const overview = await this.getOverview(orderId);
    if (overview.order.status === 'completed') return overview.order;
    if (!overview.progress.canComplete) {
      throw new ValidationError(`Ordren mangler stadig ${overview.progress.remainingQuantity} kolli.`);
    }
    return this.repos.orders.setStatus(orderId, 'completed', userId);
  }
}

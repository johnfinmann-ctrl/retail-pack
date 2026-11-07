/**
 * ÉT søgefelt til alt (videreført fra v0.3.0's ScanScreen-princip):
 * stregkode (EAN), varenummer eller varenavn. Udvidet i v0.4.0 med varenummer
 * og genkendelse af ordrenumre, så en medarbejder, der scanner en ordre i
 * pakkevejledningen, sendes det rigtige sted hen i stedet for "ikke fundet".
 */
import type { RepositoriesV4 } from './interfaces';
import type { Order, ProductV4 } from './types';

export type LookupResult =
  | { kind: 'product'; product: ProductV4 }
  | { kind: 'multiple'; products: ProductV4[] }
  | { kind: 'order'; order: Order }
  | { kind: 'none' };

const DIGITS = /^\d{6,14}$/;

/** Fjerner AIM-præfiks (fx "]E0") og GS1 "(01)"-notation, som nogle scannere sender med. */
export function normalizeScannedCode(raw: string): string {
  let value = raw.trim();
  value = value.replace(/^\][A-Za-z]\d/, '');
  const gtin = /^\(?01\)?(\d{14})/.exec(value);
  if (gtin?.[1]) {
    value = gtin[1].replace(/^0/, ''); // GTIN-14 med indikator 0 → EAN-13
  }
  return value;
}

export class ProductLookupService {
  constructor(private readonly repos: Pick<RepositoriesV4, 'products' | 'catalog' | 'orders'>) {}

  async lookup(companyId: string, raw: string): Promise<LookupResult> {
    const code = normalizeScannedCode(raw);
    if (!code) return { kind: 'none' };

    if (DIGITS.test(code)) {
      const byEan = await this.repos.products.findByEan(companyId, code);
      if (byEan) return { kind: 'product', product: byEan as ProductV4 };
    }

    const byItemNumber = await this.repos.catalog.findByItemNumber(companyId, code);
    if (byItemNumber) return { kind: 'product', product: byItemNumber };

    const order = await this.repos.orders.findByNumber(companyId, code);
    if (order) return { kind: 'order', order };

    if (code.length < 2) return { kind: 'none' };
    const matches = (await this.repos.products.searchByName(companyId, code)) as ProductV4[];
    if (matches.length === 1 && matches[0]) return { kind: 'product', product: matches[0] };
    if (matches.length > 1) return { kind: 'multiple', products: matches };
    return { kind: 'none' };
  }
}

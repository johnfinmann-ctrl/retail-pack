import { describe, expect, it } from 'vitest';

import { FakePackagingRepository } from '../../data/repositories/__tests__/fakes';
import type { PackagingItem } from '../../data/types';
import { PackagingService } from '../PackagingService';

const items: PackagingItem[] = [
  { id: 'p1', companyId: 'company-1', type: 'pallet_type', name: 'EUR-palle', imageUrl: null, dimensions: null, notes: null },
  { id: 'p2', companyId: 'company-1', type: 'box', name: 'Kasse A', imageUrl: null, dimensions: null, notes: null },
];

describe('PackagingService', () => {
  it('lister KUN palletyper, ikke andre emballagetyper', async () => {
    const service = new PackagingService({ packaging: new FakePackagingRepository(items) });
    const result = await service.listPalletTypes('company-1');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('EUR-palle');
  });

  it('opretter en ny palletype med type sat automatisk', async () => {
    const service = new PackagingService({ packaging: new FakePackagingRepository([]) });
    const created = await service.createPalletType({ companyId: 'company-1', name: 'Halvpalle' });
    expect(created.type).toBe('pallet_type');
  });
});

import { describe, expect, it } from 'vitest';

import { FakePackSessionRepository } from '../../data/repositories/__tests__/fakes';
import { PackSessionService } from '../PackSessionService';

describe('PackSessionService (helt uden Supabase)', () => {
  it('opretter en godkendt session', async () => {
    const repo = new FakePackSessionRepository();
    const service = new PackSessionService({ packSessions: repo });

    const session = await service.approve({
      companyId: 'company-1',
      userId: 'user-1',
      customerId: 'customer-1',
      productId: 'product-1',
      packProfileId: 'profile-1',
    });

    expect(session.id).toBeDefined();
    expect(session.approvedAt).toBeDefined();
    expect(repo.created).toHaveLength(1);
  });

  it('henter kun egen historik', async () => {
    const repo = new FakePackSessionRepository();
    const service = new PackSessionService({ packSessions: repo });

    await service.approve({ companyId: 'c1', userId: 'user-1', customerId: 'k1', productId: 'p1', packProfileId: 'pp1' });
    await service.approve({ companyId: 'c1', userId: 'user-2', customerId: 'k1', productId: 'p1', packProfileId: 'pp1' });

    const history = await service.myHistory('user-1');
    expect(history).toHaveLength(1);
    expect(history[0]?.userId).toBe('user-1');
  });
});

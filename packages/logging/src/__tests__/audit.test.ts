import { describe, expect, it } from 'vitest';

import { InMemoryAuditLogger } from '../audit';

describe('InMemoryAuditLogger', () => {
  it('registrerer et audit-event med tidsstempel', async () => {
    const audit = new InMemoryAuditLogger();
    await audit.record({
      companyId: 'company-1',
      appKey: 'retailpackpro',
      userId: 'user-1',
      action: 'pack_profile.published',
      entityType: 'pack_profile',
      entityId: 'profile-1',
      before: { status: 'draft' },
      after: { status: 'published' },
    });

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]?.action).toBe('pack_profile.published');
    expect(audit.events[0]?.recordedAt).toBeDefined();
  });
});

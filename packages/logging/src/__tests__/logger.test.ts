import { describe, expect, it } from 'vitest';

import { InMemoryLogger } from '../logger';

describe('InMemoryLogger', () => {
  it('registrerer log-kald med niveau og felter', () => {
    const logger = new InMemoryLogger();
    logger.info('bruger logget ind', { companyId: 'company-1', appKey: 'retailpackpro' });
    logger.error('scan fejlede');

    expect(logger.entries).toHaveLength(2);
    expect(logger.entries[0]?.level).toBe('info');
    expect(logger.entries[0]?.fields?.companyId).toBe('company-1');
    expect(logger.entries[1]?.level).toBe('error');
  });
});

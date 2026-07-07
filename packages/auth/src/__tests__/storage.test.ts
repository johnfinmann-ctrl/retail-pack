import type { AppKey, CompanyId } from '@platform/shared-types';
import { describe, expect, it } from 'vitest';

import { buildStoragePath } from '../storage';

describe('buildStoragePath', () => {
  it('bygger stien efter det faste mønster', () => {
    const path = buildStoragePath({
      companyId: 'company-123' as CompanyId,
      appKey: 'retailpackpro' as AppKey,
      entityType: 'reference_images',
      entityId: 'profile-1',
      fileName: 'palle-1.jpg',
    });
    expect(path).toBe('company-123/retailpackpro/reference_images/profile-1/palle-1.jpg');
  });

  it('saniterer filnavne med ugyldige tegn', () => {
    const path = buildStoragePath({
      companyId: 'company-123' as CompanyId,
      appKey: 'retailpackpro' as AppKey,
      entityType: 'documents',
      entityId: 'doc-1',
      fileName: 'leverandørguide (2026)?.pdf',
    });
    expect(path).toBe('company-123/retailpackpro/documents/doc-1/leverand_rguide__2026__.pdf');
  });
});

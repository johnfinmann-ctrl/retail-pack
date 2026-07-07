import type { PlatformSession } from '@platform/shared-types';
import { describe, expect, it } from 'vitest';

import { hasAppPermission, hasAtLeastRole, requireAtLeastRole } from '../permissions';

function makeSession(role: PlatformSession['role']): PlatformSession {
  return {
    userId: 'user-1' as PlatformSession['userId'],
    companyId: 'company-1' as PlatformSession['companyId'],
    role,
    teamId: null,
    enabledApps: ['retailpackpro'],
  };
}

describe('hasAtLeastRole', () => {
  it('en admin opfylder minimumskravet "teamleder"', () => {
    expect(hasAtLeastRole(makeSession('admin'), 'teamleder')).toBe(true);
  });

  it('en medarbejder opfylder IKKE minimumskravet "admin"', () => {
    expect(hasAtLeastRole(makeSession('medarbejder'), 'admin')).toBe(false);
  });
});

describe('requireAtLeastRole', () => {
  it('kaster UnauthorizedError hvis rollen er for lav', () => {
    expect(() => requireAtLeastRole(makeSession('medarbejder'), 'admin')).toThrow();
  });

  it('kaster ikke hvis rollen er tilstrækkelig', () => {
    expect(() => requireAtLeastRole(makeSession('superadmin'), 'admin')).not.toThrow();
  });
});

describe('hasAppPermission', () => {
  it('superadmin har altid adgang, uanset lookup-resultat', () => {
    const lookup = () => false;
    expect(hasAppPermission(lookup, 'retailpackpro', makeSession('superadmin'), 'anything')).toBe(
      true,
    );
  });

  it('bruger lookup-funktionen for øvrige roller', () => {
    const lookup = (_appKey: string, role: string, permissionKey: string) =>
      role === 'teamleder' && permissionKey === 'approve_ai_suggestion';
    expect(
      hasAppPermission(lookup, 'retailpackpro', makeSession('teamleder'), 'approve_ai_suggestion'),
    ).toBe(true);
    expect(
      hasAppPermission(lookup, 'retailpackpro', makeSession('teamleder'), 'edit_branding'),
    ).toBe(false);
  });
});

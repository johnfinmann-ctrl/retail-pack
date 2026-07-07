import { describe, expect, it } from 'vitest';

import { filterNavByRole, type NavSection } from '../navigation/types';

const sections: NavSection[] = [
  {
    key: 'main',
    items: [
      { key: 'dashboard', labelKey: 'core.nav.dashboard', path: '/dashboard' },
      {
        key: 'settings',
        labelKey: 'core.nav.settings',
        path: '/settings',
        visibleTo: ['admin', 'superadmin'],
      },
      {
        key: 'my-team',
        labelKey: 'core.nav.my_team',
        path: '/my-team',
        visibleTo: ['teamleder'],
      },
    ],
  },
];

describe('filterNavByRole', () => {
  it('medarbejder ser kun punkter uden rollebegrænsning', () => {
    const result = filterNavByRole(sections, 'medarbejder');
    expect(result[0]?.items.map((i) => i.key)).toEqual(['dashboard']);
  });

  it('admin ser dashboard og settings, men ikke teamleder-specifikke punkter', () => {
    const result = filterNavByRole(sections, 'admin');
    expect(result[0]?.items.map((i) => i.key)).toEqual(['dashboard', 'settings']);
  });

  it('fjerner en sektion helt, hvis ingen punkter er synlige for rollen', () => {
    const onlyRestricted: NavSection[] = [
      { key: 'admin-only', items: [{ key: 'x', labelKey: 'x', path: '/x', visibleTo: ['admin'] }] },
    ];
    expect(filterNavByRole(onlyRestricted, 'medarbejder')).toEqual([]);
  });
});

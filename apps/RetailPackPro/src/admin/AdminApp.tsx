/**
 * Pladsholder — Admin grundstruktur (navigation + rigtige sektioner) bygges
 * i Trin 6. Her bevises kun: routing endte korrekt her for admin/teamleder/
 * superadmin, og @platform/ui's AdminShell kan monteres med rollefiltreret nav.
 */
import type { PlatformSession } from '@platform/shared-types';
import { filterNavByRole, AdminShell, type NavSection } from '@platform/ui';

const sections: NavSection[] = [
  {
    key: 'main',
    items: [
      { key: 'dashboard', labelKey: 'core.nav.dashboard', path: '/dashboard' },
      { key: 'customers', labelKey: 'core.nav.customers', path: '/customers' },
      { key: 'products', labelKey: 'core.nav.products', path: '/products' },
      { key: 'pack_profiles', labelKey: 'core.nav.pack_profiles', path: '/pack-profiles' },
    ],
  },
];

export function AdminApp({ session }: { session: PlatformSession }) {
  const filtered = filterNavByRole(sections, session.role);
  const renderedSections = filtered.map((section) => ({
    ...section,
    renderedItems: section.items.map((item) => ({
      label: item.key, // rigtig i18n-opslag + routing kommer i Trin 6
      path: item.path,
      active: false,
      onClick: () => {
        /* rigtig navigation kommer i Trin 6 */
      },
    })),
  }));

  return (
    <AdminShell sections={renderedSections} companyName="RetailPackPro">
      <p>Admin grundstruktur bygges færdig i Trin 6.</p>
    </AdminShell>
  );
}

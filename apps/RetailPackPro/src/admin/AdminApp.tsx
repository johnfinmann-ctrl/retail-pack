/**
 * Admin grundstruktur (PRS §9/§37). Navigation sker som simpel React-
 * tilstand (ikke en URL-router) — Sprint 2 har kun fire faste sektioner,
 * så en fuld routing-afhængighed ville være overdrevet for dette omfang.
 * Rollefiltrering (filterNavByRole) er allerede Core's ansvar, genbrugt
 * uændret her.
 */
import type { PlatformSession } from '@platform/shared-types';
import { AdminShell, filterNavByRole, type NavSection } from '@platform/ui';
import { useState } from 'react';

import { useT } from '../i18n/I18nProvider';

import { CustomersScreen } from './screens/CustomersScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PackProfilesScreen } from './screens/PackProfilesScreen';
import { ProductsScreen } from './screens/ProductsScreen';

type AdminSectionKey = 'dashboard' | 'customers' | 'products' | 'pack_profiles';

const sections: NavSection[] = [
  {
    key: 'main',
    items: [
      { key: 'dashboard', labelKey: 'retailpackpro.admin.nav.dashboard', path: '/dashboard' },
      { key: 'customers', labelKey: 'retailpackpro.admin.nav.customers', path: '/customers' },
      { key: 'products', labelKey: 'retailpackpro.admin.nav.products', path: '/products' },
      { key: 'pack_profiles', labelKey: 'retailpackpro.admin.nav.pack_profiles', path: '/pack-profiles' },
    ],
  },
];

export function AdminApp({ session }: { session: PlatformSession }) {
  const { t } = useT();
  const [active, setActive] = useState<AdminSectionKey>('dashboard');

  const filtered = filterNavByRole(sections, session.role);
  const renderedSections = filtered.map((section) => ({
    ...section,
    renderedItems: section.items.map((item) => ({
      label: t(item.labelKey),
      path: item.path,
      active: item.key === active,
      onClick: () => setActive(item.key as AdminSectionKey),
    })),
  }));

  return (
    <AdminShell sections={renderedSections} companyName="RetailPackPro">
      {active === 'dashboard' && <DashboardScreen companyId={session.companyId} />}
      {active === 'customers' && <CustomersScreen session={session} />}
      {active === 'products' && <ProductsScreen session={session} />}
      {active === 'pack_profiles' && <PackProfilesScreen session={session} />}
    </AdminShell>
  );
}

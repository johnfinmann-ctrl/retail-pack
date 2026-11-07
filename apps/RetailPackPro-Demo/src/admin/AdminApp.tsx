import { useState } from 'react';

import type { DemoSession } from '../demo/session';
import { t } from '../i18n';
import { Icon } from '../ui/Icon';

import { CustomersAdmin } from './CustomersAdmin';
import { DashboardAdmin } from './DashboardAdmin';
import { GuidesAdmin } from './GuidesAdmin';
import { ProductsAdmin } from './ProductsAdmin';

type Section = 'dashboard' | 'guides' | 'products' | 'customers';

const NAV: Array<{ key: Section; icon: string }> = [
  { key: 'dashboard', icon: 'home' },
  { key: 'guides', icon: 'pallet' },
  { key: 'products', icon: 'box' },
  { key: 'customers', icon: 'customers' },
];

export function AdminApp({ session }: { session: DemoSession }) {
  const [section, setSection] = useState<Section>('dashboard');
  return (
    <div className="admin">
      <nav className="side" aria-label={t('demo.admin.nav_aria')}>
        {NAV.map((n) => (
          <button key={n.key} aria-current={section === n.key ? 'page' : undefined} onClick={() => setSection(n.key)}>
            <Icon name={n.icon} size={20} /> {t(`demo.admin.nav.${n.key}`)}
          </button>
        ))}
      </nav>
      <main className="admin-main">
        <div className="page wide">
          {section === 'dashboard' && <DashboardAdmin session={session} onGo={setSection} />}
          {section === 'guides' && <GuidesAdmin session={session} />}
          {section === 'products' && <ProductsAdmin session={session} />}
          {section === 'customers' && <CustomersAdmin session={session} />}
        </div>
      </main>
    </div>
  );
}

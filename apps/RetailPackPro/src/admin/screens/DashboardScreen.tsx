/**
 * Admin grundstruktur — bevidst enkelt (PRS §20: "Dashboard skal være
 * enkelt. Ikke mange grafer."). Kun tre grundtal, ingen grafer/trends
 * endnu — det kommer i en senere, "avanceret dashboard"-leverance.
 */
import { StatCard } from '@platform/ui';
import { useEffect, useState } from 'react';

import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export function DashboardScreen({ companyId }: { companyId: string }) {
  const { t } = useT();
  const [counts, setCounts] = useState<{ customers: number; products: number; profiles: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const services = getServices();
    Promise.all([
      services.customers.listActiveCustomers(companyId),
      services.products.listAll(companyId),
      services.packGuide.listProfilesForCompany(companyId),
    ]).then(([customers, products, profiles]) => {
      if (isMounted) {
        setCounts({ customers: customers.length, products: products.length, profiles: profiles.length });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.admin.nav.dashboard')}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard
          title={t('retailpackpro.admin.dashboard.customers_count')}
          widget={{ key: 'customers', titleKey: '', value: counts?.customers ?? '…' }}
        />
        <StatCard
          title={t('retailpackpro.admin.dashboard.products_count')}
          widget={{ key: 'products', titleKey: '', value: counts?.products ?? '…' }}
        />
        <StatCard
          title={t('retailpackpro.admin.dashboard.profiles_count')}
          widget={{ key: 'profiles', titleKey: '', value: counts?.profiles ?? '…' }}
        />
      </div>
    </div>
  );
}

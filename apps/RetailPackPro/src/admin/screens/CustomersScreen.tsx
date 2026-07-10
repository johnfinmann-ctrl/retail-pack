/**
 * Admin grundstruktur — read-only oversigt. Oprettelse/redigering af
 * kunder er IKKE i Sprint 2's scope (kun "grundstruktur"), kommer i en
 * senere leverance.
 */
import { Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { Customer } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export function CustomersScreen({ companyId }: { companyId: string }) {
  const { t } = useT();
  const [customers, setCustomers] = useState<Customer[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    getServices()
      .customers.listActiveCustomers(companyId)
      .then((result) => {
        if (isMounted) setCustomers(result);
      });
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.admin.nav.customers')}</h1>
      {customers && customers.length === 0 && <p>{t('retailpackpro.admin.empty.customers')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {customers?.map((customer) => (
          <Card key={customer.id}>
            <strong>{customer.name}</strong>
            {customer.notes && <p style={{ fontSize: 13, color: '#5c5c66', marginTop: 4 }}>{customer.notes}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

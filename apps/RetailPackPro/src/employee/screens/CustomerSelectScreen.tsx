/**
 * Første skærm i medarbejderflowet. Henter kunder UDELUKKENDE via
 * CustomerService — aldrig CustomerRepository eller Supabase direkte.
 *
 * Automatik (design-princip 5): findes der kun ÉN aktiv kunde, springes
 * hele skærmen over — medarbejderen skal ikke vælge noget, der ikke er
 * et reelt valg.
 */
import { Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { Customer } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export interface CustomerSelectScreenProps {
  companyId: string;
  onSelect: (customer: Customer) => void;
}

export function CustomerSelectScreen({ companyId, onSelect }: CustomerSelectScreenProps) {
  const { t } = useT();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getServices()
      .customers.listActiveCustomers(companyId)
      .then((result) => {
        if (!isMounted) return;
        if (result.length === 1) {
          onSelect(result[0]!); // kun ét valg findes — det er ikke et valg
          return;
        }
        setCustomers(result);
      })
      .catch(() => {
        if (isMounted) setError(t('core.errors.generic'));
      });
    return () => {
      isMounted = false;
    };
  }, [companyId, t]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.customer_select.title')}</h1>

      {error && <p style={{ color: '#d93025' }}>{error}</p>}

      {!error && customers === null && <p>…</p>}

      {customers && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {customers.map((customer) => (
            <Card
              key={customer.id}
              onClick={() => onSelect(customer)}
              role="button"
              style={{ cursor: 'pointer', textAlign: 'center', padding: 24, minHeight: 120 }}
            >
              {customer.logoUrl && (
                <img
                  src={customer.logoUrl}
                  alt=""
                  style={{ width: '100%', height: 56, objectFit: 'contain', marginBottom: 8 }}
                />
              )}
              <strong style={{ fontSize: 18 }}>{customer.name}</strong>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

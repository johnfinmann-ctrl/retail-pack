/**
 * Kunde-oversigt + oprettelse. Bevidst ét felt (navn) — logo er valgfrit
 * og kan tilføjes senere. Ingen teknisk jargon: ingen "company_id",
 * ingen status. Formularen er inline, ikke en separat side.
 */
import type { PlatformSession } from '@platform/shared-types';
import { Button, Card } from '@platform/ui';
import { useEffect, useState, type FormEvent } from 'react';

import type { Customer } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export function CustomersScreen({ session }: { session: PlatformSession }) {
  const { t } = useT();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    getServices()
      .customers.listActiveCustomers(session.companyId)
      .then(setCustomers);
  }

  useEffect(load, [session.companyId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await getServices().customers.createCustomer({
        companyId: session.companyId,
        name,
        logoUrl: logoUrl || null,
      });
      setName('');
      setLogoUrl('');
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>{t('retailpackpro.admin.nav.customers')}</h1>
        {!showForm && (
          <Button variant="primary" size="admin" onClick={() => setShowForm(true)}>
            {t('retailpackpro.admin.customers.new')}
          </Button>
        )}
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <form onSubmit={handleCreate}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              {t('retailpackpro.admin.customers.name_label')}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              {t('retailpackpro.admin.customers.logo_label')}
            </label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" size="admin" disabled={saving}>
                {t('core.actions.save')}
              </Button>
              <Button variant="secondary" size="admin" onClick={() => setShowForm(false)}>
                {t('core.actions.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {customers && customers.length === 0 && <p>{t('retailpackpro.admin.empty.customers')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {customers?.map((customer) => (
          <Card key={customer.id}>
            <strong>{customer.name}</strong>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { CustomerV4 } from '../domain/types';
import { t } from '../i18n';
import { getServices } from '../services';
import { errorText, Loading, Monogram, Sheet, useAsync, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';

export function CustomersAdmin({ session }: { session: DemoSession }) {
  const { data, reload } = useAsync(() => getServices().repos.catalog.listAllCustomers(session.companyId), [session.companyId]);
  const [editing, setEditing] = useState<CustomerV4 | 'new' | null>(null);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>{t('demo.admin.nav.customers')}</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>
          <Icon name="plus" /> {t('demo.admin.customers.new')}
        </button>
      </div>
      {!data ? (
        <Loading />
      ) : (
        <div className="choice-list">
          {data.map((c) => (
            <button className="choice" key={c.id} onClick={() => setEditing(c)}>
              <Monogram name={c.name} />
              <span className="grow">
                <span className="title">{c.name}</span>
                {c.notes && <span className="sub">{c.notes}</span>}
              </span>
              {c.isTestCustomer && <span className="pill test">{t('demo.common.test_customer')}</span>}
              <span className={`pill ${c.active ? 'go' : 'neutral'}`}>{c.active ? t('demo.admin.customers.active') : t('demo.admin.customers.inactive')}</span>
            </button>
          ))}
        </div>
      )}
      {editing && (
        <CustomerForm
          session={session}
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function CustomerForm({ session, customer, onClose, onSaved }: { session: DemoSession; customer: CustomerV4 | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(customer?.name ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [active, setActive] = useState(customer?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const catalog = getServices().repos.catalog;
      if (customer) await catalog.updateCustomer(customer.id, { name, notes: notes.trim() || null, active });
      else await catalog.createCustomerV4({ companyId: session.companyId, name, logoUrl: null, notes: notes.trim() || null });
      toast(t('demo.admin.saved'));
      onSaved();
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={customer ? t('demo.admin.customers.edit') : t('demo.admin.customers.new')} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="field">
          <label htmlFor="c-name">{t('retailpackpro.admin.customers.name_label')}</label>
          <input id="c-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="c-notes">{t('demo.admin.customers.notes')}</label>
          <input id="c-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {customer && (
          <div className="field">
            <span className="label">{t('demo.admin.customers.status')}</span>
            <div className="seg" role="group">
              <button type="button" aria-pressed={active} onClick={() => setActive(true)}>
                {t('demo.admin.customers.active')}
              </button>
              <button type="button" aria-pressed={!active} onClick={() => setActive(false)}>
                {t('demo.admin.customers.inactive')}
              </button>
            </div>
            <span className="help">{t('demo.admin.customers.inactive_help')}</span>
          </div>
        )}
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('demo.common.cancel')}
          </button>
          <button className="btn primary" disabled={busy}>
            {t('demo.admin.save')}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

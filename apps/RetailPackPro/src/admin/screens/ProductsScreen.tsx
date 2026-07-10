import type { PlatformSession } from '@platform/shared-types';
import { Button, Card } from '@platform/ui';
import { useEffect, useState, type FormEvent } from 'react';

import type { Product } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export function ProductsScreen({ session }: { session: PlatformSession }) {
  const { t } = useT();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [ean, setEan] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    getServices()
      .products.listAll(session.companyId)
      .then(setProducts);
  }

  useEffect(load, [session.companyId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await getServices().products.createProduct({
        companyId: session.companyId,
        ean,
        name,
        imageUrl: imageUrl || null,
      });
      setName('');
      setEan('');
      setImageUrl('');
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>{t('retailpackpro.admin.nav.products')}</h1>
        {!showForm && (
          <Button variant="primary" size="admin" onClick={() => setShowForm(true)}>
            {t('retailpackpro.admin.products.new')}
          </Button>
        )}
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <form onSubmit={handleCreate}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              {t('retailpackpro.admin.products.name_label')}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              {t('retailpackpro.admin.products.barcode_label')}
            </label>
            <input
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              required
              inputMode="numeric"
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              {t('retailpackpro.admin.products.image_label')}
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
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

      {products && products.length === 0 && <p>{t('retailpackpro.admin.empty.products')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products?.map((product) => (
          <Card key={product.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{product.name}</span>
            <span style={{ color: '#5c5c66', fontSize: 13 }}>{product.ean}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

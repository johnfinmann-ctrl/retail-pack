import { useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { ProductV4 } from '../domain/types';
import { t } from '../i18n';
import { getServices } from '../services';
import { errorText, Loading, Sheet, useAsync, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';
import { PRODUCT_ILLUSTRATIONS } from '../ui/illustrations';
import { Img, pickImageFile, storeUploadedImage } from '../ui/media';

export function ProductsAdmin({ session }: { session: DemoSession }) {
  const { data, reload } = useAsync(() => getServices().products.listAll(session.companyId) as Promise<ProductV4[]>, [session.companyId]);
  const [editing, setEditing] = useState<ProductV4 | 'new' | null>(null);
  const [q, setQ] = useState('');
  const shown = (data ?? []).filter((p) => !q || `${p.name} ${p.itemNumber} ${p.ean}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>{t('demo.admin.nav.products')}</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>
          <Icon name="plus" /> {t('demo.admin.products.new')}
        </button>
      </div>
      <div className="field">
        <label htmlFor="p-search" className="sr">
          {t('demo.admin.products.search')}
        </label>
        <input id="p-search" type="text" placeholder={t('demo.admin.products.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!data ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="list">
            <thead>
              <tr>
                <th style={{ width: 60 }} aria-label={t('demo.common.image')} />
                <th>{t('demo.admin.products.name')}</th>
                <th>{t('demo.admin.products.item_no')}</th>
                <th>EAN</th>
                <th>{t('demo.admin.products.category')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="click" onClick={() => setEditing(p)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditing(p)}>
                  <td>
                    <Img className="thumb-sm" src={p.imageUrl} alt="" />
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td className="num">{p.itemNumber}</td>
                  <td className="num code">{p.ean}</td>
                  <td>{p.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <ProductForm
          session={session}
          product={editing === 'new' ? null : editing}
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

function ProductForm({ session, product, onClose, onSaved }: { session: DemoSession; product: ProductV4 | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [itemNumber, setItemNumber] = useState(product?.itemNumber ?? '');
  const [ean, setEan] = useState(product?.ean ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? PRODUCT_ILLUSTRATIONS[0]!.value);
  const [busy, setBusy] = useState(false);

  async function upload() {
    const files = await pickImageFile({ capture: true });
    if (!files[0]) return;
    try {
      setImageUrl(await storeUploadedImage(files[0]));
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  async function save() {
    setBusy(true);
    try {
      const catalog = getServices().repos.catalog;
      if (product) await catalog.updateProduct(product.id, { name, itemNumber, ean, category: category || null, imageUrl });
      else await catalog.createProductV4({ companyId: session.companyId, name, itemNumber, ean, category: category || null, imageUrl });
      toast(t('demo.admin.saved'));
      onSaved();
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  const isIllustration = imageUrl?.startsWith('illustration:');

  return (
    <Sheet title={product ? t('demo.admin.products.edit') : t('demo.admin.products.new')} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="field">
          <label htmlFor="p-name">{t('demo.admin.products.name')}</label>
          <input id="p-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="p-item">{t('demo.admin.products.item_no')}</label>
            <input id="p-item" type="text" value={itemNumber} onChange={(e) => setItemNumber(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="p-ean">{t('demo.admin.products.ean')}</label>
            <input id="p-ean" type="text" inputMode="numeric" value={ean} onChange={(e) => setEan(e.target.value.replace(/\D/g, ''))} />
            <span className="help">{t('demo.admin.products.ean_help')}</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="p-cat">{t('demo.admin.products.category')}</label>
          <input id="p-cat" type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">{t('demo.admin.products.image')}</span>
          <div className="upload-row">
            <Img src={imageUrl} alt="" />
            <button type="button" className="btn secondary small" onClick={() => void upload()}>
              <Icon name="camera" size={18} /> {t('demo.admin.upload_photo')}
            </button>
            <select
              aria-label={t('demo.admin.products.illustration')}
              value={isIllustration ? imageUrl! : ''}
              onChange={(e) => e.target.value && setImageUrl(e.target.value)}
              style={{ minHeight: 44, borderRadius: 8, border: '2px solid var(--line-strong)', padding: '0 10px', background: 'var(--surface)' }}
            >
              <option value="">{t('demo.admin.products.illustration')}</option>
              {PRODUCT_ILLUSTRATIONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        </div>
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

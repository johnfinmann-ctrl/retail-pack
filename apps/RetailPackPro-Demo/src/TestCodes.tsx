/**
 * Testkoder til scanning: alle demovarers EAN-13 og ordrenumre (Code 128).
 * Vis siden på en anden skærm (eller udskriv den derfra) og scan med
 * håndscanner eller kamera.
 */
import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

import type { ProductV4 } from './domain/types';
import { t } from './i18n';
import { getServices } from './services';
import { useAsync } from './ui/common';

function Barcode({ value, format }: { value: string; format: 'EAN13' | 'CODE128' }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, { format, displayValue: true, fontSize: 16, height: 70, margin: 8, background: '#ffffff', lineColor: '#000000' });
    } catch {
      ref.current.innerHTML = '';
    }
  }, [value, format]);
  return <svg ref={ref} role="img" aria-label={value} />;
}

export function TestCodes() {
  const s = getServices();
  const companyId = s.db.state.products[0]?.companyId ?? 'demo-company';
  const { data: products } = useAsync(() => s.products.listAll(companyId) as Promise<ProductV4[]>, []);
  const { data: orders } = useAsync(() => s.orders.listOrders(companyId), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="muted">{t('demo.codes.lead')}</p>
      <div className="eyebrow">{t('demo.codes.orders')}</div>
      <div className="codes">
        {(orders ?? []).map((o) => (
          <div className="codecard" key={o.id}>
            <Barcode value={o.orderNumber} format="CODE128" />
          </div>
        ))}
      </div>
      <div className="eyebrow">{t('demo.codes.products')}</div>
      <div className="codes">
        {(products ?? []).map((p) => (
          <div className="codecard" key={p.id}>
            <Barcode value={p.ean} format={p.ean.length === 13 ? 'EAN13' : 'CODE128'} />
            <strong>{p.name}</strong>
            <span className="code">{p.itemNumber}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

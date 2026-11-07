/**
 * Palleopbygning: forslag til næste palle (OrderService.suggestNextPallet),
 * medarbejderen kan rette antal, ser pakkevejledningen for varerne på pallen
 * og registrerer pallen. Reglerne (kapacitet, mixpalle) tjekkes af servicen.
 */
import type { PackGuide } from '@rpp/services';
import { useEffect, useMemo, useState } from 'react';

import type { DemoSession } from '../demo/session';
import { checkPallet, suggestNextPallet, type OrderOverview } from '../domain/OrderService';
import type { Pallet } from '../domain/types';
import { PackGuideView } from '../employee/PackGuideView';
import { t } from '../i18n';
import { getServices } from '../services';
import { errorText, Loading, Stepper, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/media';

export function PalletBuilder({
  session,
  orderId,
  onRegistered,
  onCancel,
}: {
  session: DemoSession;
  orderId: string;
  onRegistered: (pallet: Pallet) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [o, setO] = useState<OrderOverview | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [focus, setFocus] = useState<string | null>(null);
  const [guides, setGuides] = useState<Record<string, PackGuide | null>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getServices()
      .orders.getOverview(orderId)
      .then(async (overview) => {
        setO(overview);
        const suggestion = suggestNextPallet(overview.progress, overview.guides);
        const initial: Record<string, number> = {};
        for (const l of overview.progress.lines) initial[l.line.productId] = 0;
        for (const s of suggestion) initial[s.productId] = s.quantity;
        setQty(initial);
        setFocus(suggestion[0]?.productId ?? null);
        const entries = await Promise.all(
          overview.progress.lines.map(
            async (l) =>
              [l.line.productId, await getServices().packGuide.getGuideFor(overview.order.companyId, overview.order.customerId, l.line.productId)] as const,
          ),
        );
        setGuides(Object.fromEntries(entries));
      })
      .catch((e: unknown) => toast(errorText(e), 'err'));
  }, [orderId, toast]);

  const lines = useMemo(() => Object.entries(qty).map(([productId, quantity]) => ({ productId, quantity })), [qty]);
  const check = useMemo(() => (o ? checkPallet(lines, o.guides, o.products) : { fill: null, error: null }), [lines, o]);

  if (!o) return <Loading />;
  const open = o.progress.lines.filter((l) => l.remaining > 0);
  const total = lines.reduce((s, l) => s + l.quantity, 0);
  const nextNo = o.pallets.length + 1;
  const focusGuide = focus ? guides[focus] : null;
  const focusProduct = focus ? (o.products.get(focus) ?? null) : null;
  const fillPct = check.fill !== null ? Math.round(check.fill * 100) : null;

  async function register() {
    setBusy(true);
    try {
      const pallet = await getServices().orders.registerPallet(orderId, lines, session.userId);
      onRegistered(pallet);
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="order-head">
        <span className="eyebrow num">{o.order.orderNumber}</span>
        <h1>{t('demo.pallet.title', { n: nextNo })}</h1>
        <p className="muted">{t('demo.pallet.intro')}</p>
      </div>

      <section className="panel" aria-label={t('demo.pallet.contents')}>
        {open.map(({ line, remaining, capacityPerPallet }) => {
          const product = o.products.get(line.productId);
          const value = qty[line.productId] ?? 0;
          return (
            <div key={line.id} className="line-item" style={{ gridTemplateColumns: '56px 1fr', alignItems: 'start' }}>
              <Img src={product?.imageUrl} alt="" />
              <div className="grow">
                <span className="name">{product?.name}</span>
                <span className="code num">
                  {product?.itemNumber} · {t('demo.pallet.left_on_order', { n: remaining })}
                  {capacityPerPallet && ` · ${t('demo.order.per_pallet', { n: capacityPerPallet })}`}
                </span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Stepper
                    id={`qty-${line.productId}`}
                    label={product?.name ?? ''}
                    value={value}
                    max={remaining}
                    onChange={(v) => {
                      const next = { ...qty, [line.productId]: v };
                      setQty(next);
                      if (v > 0) setFocus(line.productId);
                      else if (focus === line.productId) setFocus(Object.keys(next).find((id) => (next[id] ?? 0) > 0) ?? null);
                    }}
                  />
                  {value > 0 && guides[line.productId] && focus !== line.productId && (
                    <button className="btn ghost small" onClick={() => setFocus(line.productId)}>
                      <Icon name="eye" size={18} /> {t('demo.pallet.show_guide')}
                    </button>
                  )}
                  {!guides[line.productId] && guides[line.productId] !== undefined && <span className="pill stop">{t('demo.order.no_guide')}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {fillPct !== null && total > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="small">
              <span>{t('demo.pallet.fill')}</span>
              <strong className="num">{fillPct} %</strong>
            </div>
            <div className={`meter${fillPct >= 100 && !check.error ? ' done' : ''}`}>
              <i style={{ width: `${Math.min(100, fillPct)}%`, background: check.error ? 'var(--stop)' : undefined }} />
            </div>
          </div>
        )}
        {check.error && total > 0 && (
          <div className="notice err" role="alert">
            <Icon name="warn" />
            <div className="grow">{check.error}</div>
          </div>
        )}
      </section>

      {focusGuide && focusProduct && (
        <PackGuideView
          guide={focusGuide}
          product={focusProduct}
          customer={o.customer}
          quantityNote={
            <div className="notice info">
              <Icon name="pallet" />
              <div className="grow">
                <strong>{t('demo.pallet.on_this', { n: qty[focusProduct.id] ?? 0 })}</strong>
              </div>
            </div>
          }
        />
      )}

      <div className="sticky-actions">
        <div className="btn-row">
          <button className="btn ghost" style={{ flex: '0 1 160px' }} onClick={onCancel} disabled={busy}>
            {t('demo.common.cancel')}
          </button>
          <button className="btn go xl" onClick={() => void register()} disabled={busy || total === 0 || !!check.error}>
            <Icon name="check" size={28} /> {t('demo.pallet.register', { n: nextNo, colli: total })}
          </button>
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { OrderOverview } from '../domain/OrderService';
import type { ProductV4 } from '../domain/types';
import { PackGuideView } from '../employee/PackGuideView';
import { formatDateTime, relativeDay, t } from '../i18n';
import { PhotoPanel } from '../photos/PhotoPanel';
import { getServices } from '../services';
import { ConfirmSheet, errorText, Loading, Sheet, useAsync, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/media';

import { PalletPhotoButton } from './OrderFlow';

export function OrderDetail({ session, orderId, onBuild }: { session: DemoSession; orderId: string; onBuild: () => void }) {
  const toast = useToast();
  const [photoVersion, setPhotoVersion] = useState(0);
  const { data: o, reload, error } = useAsync(() => getServices().orders.getOverview(orderId), [orderId, photoVersion]);
  const [confirm, setConfirm] = useState<'complete' | 'undo' | null>(null);
  const [guideFor, setGuideFor] = useState<ProductV4 | null>(null);

  if (error) return <div className="notice err">{errorText(error)}</div>;
  if (!o) return <Loading />;

  const { order, progress } = o;
  const completed = order.status === 'completed';
  const pct = progress.totalQuantity ? Math.round((progress.packedQuantity / progress.totalQuantity) * 100) : 0;

  return (
    <>
      <div className="order-head">
        <span className="eyebrow">{t('demo.order.order')}</span>
        <h1 className="num">{order.orderNumber}</h1>
        <div className="row">
          {o.customer && <span className="pill info">{o.customer.name}</span>}
          {o.customer?.isTestCustomer && <span className="pill test">{t('demo.common.test_customer')}</span>}
          <span className="pill neutral">
            {t('demo.order.delivery')} {relativeDay(order.deliveryDate)}
          </span>
        </div>
        {order.note && <p className="muted">{order.note}</p>}
      </div>

      {completed && (
        <div className="notice ok" role="status">
          <Icon name="check" />
          <div className="grow">
            <strong>{t('demo.order.completed_banner')}</strong>
            <span>{order.completedAt && formatDateTime(order.completedAt)}</span>
          </div>
        </div>
      )}

      <section className="panel" aria-label={t('demo.order.status_aria')}>
        <div className="progress-big">
          <div>
            <div className="eyebrow">{t('demo.order.pallets')}</div>
            <div className="counter" style={{ fontSize: 34 }}>
              {progress.palletsDone}
              {progress.palletsEstimated !== null && (
                <span className="muted" style={{ fontSize: 20 }}>
                  {' '}
                  {t('demo.order.of_about', { n: progress.palletsEstimated })}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="eyebrow">{t('demo.common.colli')}</div>
            <div className="counter" style={{ fontSize: 34 }}>
              {progress.packedQuantity}
              <span className="muted" style={{ fontSize: 20 }}>
                {' '}
                / {progress.totalQuantity}
              </span>
            </div>
          </div>
        </div>
        <div className={`meter${progress.remainingQuantity === 0 ? ' done' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small">
          {progress.remainingQuantity > 0 ? t('demo.order.remaining', { n: progress.remainingQuantity }) : t('demo.order.all_packed')}
        </p>

        {!completed &&
          (progress.remainingQuantity > 0 ? (
            <button className="btn primary xl block" onClick={onBuild}>
              <Icon name="pallet" size={28} /> {t('demo.order.pack_next', { n: progress.palletsDone + 1 })}
            </button>
          ) : (
            <button className="btn go xl block" onClick={() => setConfirm('complete')} disabled={!progress.canComplete}>
              <Icon name="flag" size={28} /> {t('demo.order.complete')}
            </button>
          ))}
      </section>

      <section className="panel" aria-labelledby="lines-h">
        <h2 id="lines-h">{t('demo.order.lines')}</h2>
        <div>
          {progress.lines.map(({ line, packed, remaining, capacityPerPallet }) => {
            const product = o.products.get(line.productId);
            const guide = o.guides.get(line.productId);
            return (
              <div className="line-item" key={line.id}>
                <Img src={product?.imageUrl} alt="" />
                <div className="grow">
                  <span className="name">{product?.name}</span>
                  <span className="code num">
                    {product?.itemNumber}
                    {capacityPerPallet && ` · ${t('demo.order.per_pallet', { n: capacityPerPallet })}`}
                  </span>
                  <div className={`meter${remaining === 0 ? ' done' : ''}`}>
                    <i style={{ width: `${(packed / line.quantity) * 100}%` }} />
                  </div>
                  {guide ? (
                    <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => product && setGuideFor(product)}>
                      <Icon name="eye" size={18} /> {t('demo.order.see_guide')}
                    </button>
                  ) : (
                    <span className="pill stop" style={{ alignSelf: 'flex-start' }}>
                      {t('demo.order.no_guide')}
                    </span>
                  )}
                </div>
                <div className="qty">
                  {packed}/{line.quantity}
                  <small>{remaining === 0 ? t('demo.order.line_done') : t('demo.order.line_left', { n: remaining })}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" aria-labelledby="pallets-h">
        <h2 id="pallets-h">{t('demo.order.registered_pallets')}</h2>
        {o.pallets.length === 0 ? (
          <p className="muted">{t('demo.order.no_pallets')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {o.pallets.map((p) => (
              <PalletCard key={p.id} overview={o} palletId={p.id} session={session} readOnly={completed} onPhoto={() => setPhotoVersion((v) => v + 1)} toast={toast} />
            ))}
          </div>
        )}
        {!completed && o.pallets.length > 0 && (
          <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirm('undo')}>
            <Icon name="undo" size={18} /> {t('demo.order.undo_last')}
          </button>
        )}
      </section>

      <PhotoPanel session={session} orderId={orderId} pallets={o.pallets} readOnly={completed} version={photoVersion} onChanged={reload} />

      {guideFor && (
        <GuideSheet overview={o} product={guideFor} onClose={() => setGuideFor(null)} />
      )}

      {confirm === 'complete' && (
        <ConfirmSheet
          title={t('demo.order.complete_title', { order: order.orderNumber })}
          body={t('demo.order.complete_body', { pallets: o.pallets.length, colli: progress.packedQuantity, photos: o.photoCount })}
          confirmLabel={t('demo.order.complete')}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await getServices().orders.completeOrder(orderId, session.userId);
              toast(t('demo.order.completed_toast', { order: order.orderNumber }));
              reload();
            } catch (e) {
              toast(errorText(e), 'err');
            }
            setConfirm(null);
          }}
        />
      )}
      {confirm === 'undo' && (
        <ConfirmSheet
          title={t('demo.order.undo_title', { n: o.pallets.length })}
          body={t('demo.order.undo_body')}
          confirmLabel={t('demo.order.undo_confirm')}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await getServices().orders.undoLastPallet(orderId);
              toast(t('demo.order.undone'));
              reload();
              setPhotoVersion((v) => v + 1);
            } catch (e) {
              toast(errorText(e), 'err');
            }
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}

function PalletCard({
  overview,
  palletId,
  session,
  readOnly,
  onPhoto,
  toast,
}: {
  overview: OrderOverview;
  palletId: string;
  session: DemoSession;
  readOnly: boolean;
  onPhoto: () => void;
  toast: (m: string, k?: 'ok' | 'err' | 'info') => void;
}) {
  const pallet = overview.pallets.find((p) => p.id === palletId)!;
  const total = pallet.lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <div className="pallet-card">
      <span className="pallet-no" aria-label={t('demo.pallet.number_aria', { n: pallet.number })}>
        {pallet.number}
      </span>
      <div className="grow">
        <strong>
          {total} {t('demo.common.colli')}
        </strong>
        <div className="small muted">
          {pallet.lines.map((l) => `${overview.products.get(l.productId)?.itemNumber ?? ''} × ${l.quantity}`).join(' · ')}
        </div>
        <div className="small muted">{formatDateTime(pallet.registeredAt)}</div>
      </div>
      {!readOnly && <PalletPhotoButton session={session} orderId={overview.order.id} palletId={pallet.id} toast={toast} onSaved={onPhoto} small />}
    </div>
  );
}

function GuideSheet({ overview, product, onClose }: { overview: OrderOverview; product: ProductV4; onClose: () => void }) {
  const { data: guide } = useAsync(
    () => getServices().packGuide.getGuideFor(overview.order.companyId, overview.order.customerId, product.id),
    [product.id],
  );
  return (
    <Sheet title={t('demo.order.guide_title')} onClose={onClose} wide>
      {guide ? <PackGuideView guide={guide} product={product} customer={overview.customer} /> : <Loading />}
    </Sheet>
  );
}

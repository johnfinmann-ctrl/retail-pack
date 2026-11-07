/**
 * Ordre & paller (v0.4.0): scan/søg ordre → se linjer og status → pak palle
 * for palle efter pakkevejledningen → registrér → foto → afslut ordre.
 */
import { useEffect, useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { Order, Pallet } from '../domain/types';
import { relativeDay, t } from '../i18n';
import { captureAndStore } from '../photos/PhotoPanel';
import { ScanField } from '../scanner/ScanField';
import { getServices } from '../services';
import { errorText, useAsync, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';

import { OrderDetail } from './OrderDetail';
import { PalletBuilder } from './PalletBuilder';

type View =
  | { name: 'list' }
  | { name: 'detail'; orderId: string }
  | { name: 'build'; orderId: string }
  | { name: 'registered'; orderId: string; pallet: Pallet };

export function OrderFlow({
  session,
  setBack,
  initialOrderId,
}: {
  session: DemoSession;
  setBack: (fn: (() => void) | null) => void;
  initialOrderId?: string | null;
}) {
  const [view, setView] = useState<View>(initialOrderId ? { name: 'detail', orderId: initialOrderId } : { name: 'list' });

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (view.name === 'list') setBack(null);
    else if (view.name === 'detail') setBack(() => setView({ name: 'list' }));
    else setBack(() => setView({ name: 'detail', orderId: view.orderId }));
  }, [view, setBack]);

  switch (view.name) {
    case 'list':
      return <OrderList session={session} onOpen={(o) => setView({ name: 'detail', orderId: o.id })} />;
    case 'detail':
      return <OrderDetail session={session} orderId={view.orderId} onBuild={() => setView({ name: 'build', orderId: view.orderId })} />;
    case 'build':
      return (
        <PalletBuilder
          session={session}
          orderId={view.orderId}
          onRegistered={(pallet) => setView({ name: 'registered', orderId: view.orderId, pallet })}
          onCancel={() => setView({ name: 'detail', orderId: view.orderId })}
        />
      );
    case 'registered':
      return (
        <PalletRegistered
          session={session}
          orderId={view.orderId}
          pallet={view.pallet}
          onNext={() => setView({ name: 'build', orderId: view.orderId })}
          onDone={() => setView({ name: 'detail', orderId: view.orderId })}
        />
      );
  }
}

const STATUS_PILL: Record<Order['status'], string> = { open: 'neutral', in_progress: 'draft', completed: 'go' };

function OrderList({ session, onOpen }: { session: DemoSession; onOpen: (o: Order) => void }) {
  const toast = useToast();
  const { data: orders } = useAsync(() => getServices().orders.listOrders(session.companyId), [session.companyId]);
  const { data: customers } = useAsync(() => getServices().repos.catalog.listAllCustomers(session.companyId), [session.companyId]);
  const [notFound, setNotFound] = useState<string | null>(null);
  const name = (id: string) => customers?.find((c) => c.id === id)?.name ?? '';

  async function find(code: string) {
    try {
      const order = await getServices().orders.findOrder(session.companyId, code);
      if (order) onOpen(order);
      else setNotFound(code);
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  const open = (orders ?? []).filter((o) => o.status !== 'completed');
  const done = (orders ?? []).filter((o) => o.status === 'completed');

  return (
    <>
      <h1>{t('demo.order.find_title')}</h1>
      <ScanField id="order-scan" placeholder={t('demo.scan.placeholder_order')} onSubmit={(c) => void find(c)} />
      {notFound && (
        <div className="notice warn" role="alert">
          <Icon name="warn" />
          <div className="grow">
            <strong>{t('demo.order.not_found', { code: notFound })}</strong>
            <span>{t('demo.order.not_found_hint')}</span>
          </div>
        </div>
      )}

      <div className="eyebrow">{t('demo.order.to_pack')}</div>
      <div className="choice-list">
        {open.map((o) => (
          <OrderChoice key={o.id} order={o} customerName={name(o.customerId)} onOpen={onOpen} />
        ))}
        {orders && open.length === 0 && <p className="muted">{t('demo.order.none_open')}</p>}
      </div>
      {done.length > 0 && (
        <>
          <div className="eyebrow">{t('demo.order.completed_list')}</div>
          <div className="choice-list">
            {done.map((o) => (
              <OrderChoice key={o.id} order={o} customerName={name(o.customerId)} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function OrderChoice({ order, customerName, onOpen }: { order: Order; customerName: string; onOpen: (o: Order) => void }) {
  const lines = order.lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <button className="choice" onClick={() => onOpen(order)}>
      <span className="monogram" aria-hidden="true">
        <Icon name="order" />
      </span>
      <span className="grow">
        <span className="title num">{order.orderNumber}</span>
        <span className="sub">
          {customerName} · {t('demo.order.delivery')} {relativeDay(order.deliveryDate)} · {lines} {t('demo.common.colli')}
        </span>
      </span>
      <span className={`pill ${STATUS_PILL[order.status]}`}>{t(`demo.order.status.${order.status}`)}</span>
    </button>
  );
}

function PalletRegistered({
  session,
  orderId,
  pallet,
  onNext,
  onDone,
}: {
  session: DemoSession;
  orderId: string;
  pallet: Pallet;
  onNext: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const { data: overview, reload } = useAsync(() => getServices().orders.getOverview(orderId), [orderId]);
  const [photos, setPhotos] = useState(0);
  const remaining = overview?.progress.remainingQuantity ?? 0;

  return (
    <div className="done" role="status" style={{ paddingTop: 24 }}>
      <div className="ring">
        <Icon name="check" size={64} />
      </div>
      <h1>{t('demo.pallet.registered', { n: pallet.number })}</h1>
      <p className="muted">
        {pallet.lines.reduce((s, l) => s + l.quantity, 0)} {t('demo.common.colli')}
        {overview && remaining > 0 && ` · ${t('demo.pallet.remaining', { n: remaining })}`}
      </p>
      {photos > 0 && <p className="pill go">{t('demo.pallet.photos_on_pallet', { n: photos })}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 480 }}>
        <PalletPhotoButton
          session={session}
          orderId={orderId}
          palletId={pallet.id}
          toast={toast}
          onSaved={(n) => {
            setPhotos((x) => x + n);
            reload();
          }}
        />
        {overview && remaining > 0 ? (
          <button className="btn primary xl block" onClick={onNext}>
            <Icon name="pallet" /> {t('demo.pallet.next')}
          </button>
        ) : (
          <button className="btn go xl block" onClick={onDone}>
            <Icon name="flag" /> {t('demo.pallet.all_packed')}
          </button>
        )}
        {overview && remaining > 0 && (
          <button className="btn ghost block" onClick={onDone}>
            {t('demo.pallet.to_order')}
          </button>
        )}
      </div>
    </div>
  );
}

export function PalletPhotoButton({
  session,
  orderId,
  palletId,
  toast,
  onSaved,
  small,
}: {
  session: DemoSession;
  orderId: string;
  palletId: string;
  toast: (m: string, k?: 'ok' | 'err' | 'info') => void;
  onSaved: (n: number) => void;
  small?: boolean;
}) {
  return (
    <button
      className={`btn secondary ${small ? 'small' : 'block'}`}
      onClick={() =>
        void captureAndStore({ session, orderId, palletId, toast }).then((n) => {
          if (n > 0) onSaved(n);
        })
      }
    >
      <Icon name="camera" /> {small ? t('demo.pallet.photo_short') : t('demo.pallet.photo')}
    </button>
  );
}

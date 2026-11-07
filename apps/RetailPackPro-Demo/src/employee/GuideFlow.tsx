/**
 * Medarbejderflowet "Scan → Se → Pak" — samme tilstande som v0.3.0's
 * EmployeeApp: kunde → scan/søg → pakkevejledning med Godkend → automatisk
 * tilbage til scanning. Kundevalg springes over, hvis der kun er én aktiv kunde.
 */
import type { PackGuide } from '@rpp/services';
import { useEffect, useRef, useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { CustomerV4, Order, ProductV4 } from '../domain/types';
import { t } from '../i18n';
import { ScanField } from '../scanner/ScanField';
import { getServices } from '../services';
import { errorText, Loading, Monogram, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/media';

import { PackGuideView } from './PackGuideView';

const AUTO_ADVANCE_MS = 1200; // som v0.3.0

type State =
  | { screen: 'loading' }
  | { screen: 'select-customer'; customers: CustomerV4[] }
  | { screen: 'scan'; customer: CustomerV4 }
  | { screen: 'guide'; customer: CustomerV4; product: ProductV4; guide: PackGuide }
  | { screen: 'approved'; customer: CustomerV4; product: ProductV4 };

export function GuideFlow({
  session,
  setBack,
  onOpenOrder,
}: {
  session: DemoSession;
  setBack: (fn: (() => void) | null) => void;
  onOpenOrder: (order: Order) => void;
}) {
  const toast = useToast();
  const [state, setState] = useState<State>({ screen: 'loading' });
  const [customerCount, setCustomerCount] = useState(0);
  const [scanMsg, setScanMsg] = useState<
    | { kind: 'none'; code: string }
    | { kind: 'no-guide'; product: ProductV4 }
    | { kind: 'order'; order: Order }
    | { kind: 'multiple'; products: ProductV4[] }
    | null
  >(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  useEffect(() => {
    void getServices()
      .customers.listActiveCustomers(session.companyId)
      .then((list) => {
        const customers = list as CustomerV4[];
        setCustomerCount(customers.length);
        if (customers.length === 1 && customers[0]) setState({ screen: 'scan', customer: customers[0] });
        else setState({ screen: 'select-customer', customers });
      });
  }, [session.companyId]);

  // Tilbage-knappen i topbaren følger flowet
  useEffect(() => {
    if (state.screen === 'guide') setBack(() => setState({ screen: 'scan', customer: state.customer }));
    else if (state.screen === 'scan' && customerCount > 1) {
      setBack(() => {
        setScanMsg(null);
        void getServices()
          .customers.listActiveCustomers(session.companyId)
          .then((c) => setState({ screen: 'select-customer', customers: c as CustomerV4[] }));
      });
    } else setBack(null);
  }, [state, customerCount, setBack, session.companyId]);

  async function openProduct(customer: CustomerV4, product: ProductV4) {
    const guide = await getServices().packGuide.getGuideFor(session.companyId, customer.id, product.id);
    if (!guide) {
      setScanMsg({ kind: 'no-guide', product });
      return;
    }
    setScanMsg(null);
    setState({ screen: 'guide', customer, product, guide });
    window.scrollTo({ top: 0 });
  }

  async function handleCode(customer: CustomerV4, code: string) {
    setBusy(true);
    try {
      const res = await getServices().lookup.lookup(session.companyId, code);
      if (res.kind === 'product') await openProduct(customer, res.product);
      else if (res.kind === 'multiple') setScanMsg({ kind: 'multiple', products: res.products });
      else if (res.kind === 'order') setScanMsg({ kind: 'order', order: res.order });
      else setScanMsg({ kind: 'none', code });
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (state.screen !== 'guide') return;
    const { customer, product, guide } = state;
    setBusy(true);
    try {
      // v0.3.0's PackSessionService — uændret
      await getServices().packSessions.approve({
        companyId: session.companyId,
        userId: session.userId,
        customerId: customer.id,
        productId: product.id,
        packProfileId: guide.profile.id,
      });
      setState({ screen: 'approved', customer, product });
      timer.current = setTimeout(() => setState({ screen: 'scan', customer }), AUTO_ADVANCE_MS);
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  switch (state.screen) {
    case 'loading':
      return <Loading />;

    case 'select-customer':
      return (
        <>
          <h1>{t('retailpackpro.customer_select.title')}</h1>
          <div className="choice-list">
            {state.customers.map((c) => (
              <button key={c.id} className="choice" onClick={() => setState({ screen: 'scan', customer: c })}>
                <Monogram name={c.name} />
                <span className="grow">
                  <span className="title">{c.name}</span>
                  {c.isTestCustomer && <span className="pill test">{t('demo.common.test_customer')}</span>}
                </span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </button>
            ))}
          </div>
        </>
      );

    case 'scan': {
      const { customer } = state;
      return (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="pill info">{customer.name}</span>
            {customer.isTestCustomer && <span className="pill test">{t('demo.common.test_customer')}</span>}
          </div>
          <h1>{t('retailpackpro.scan.title')}</h1>
          <ScanField
            id="guide-scan"
            placeholder={t('demo.scan.placeholder_product')}
            onSubmit={(code) => void handleCode(customer, code)}
            busy={busy}
          />
          <p className="hint">
            <Icon name="info" size={18} /> {t('demo.scan.hint')}
          </p>

          {scanMsg?.kind === 'none' && (
            <div className="notice warn" role="alert">
              <Icon name="warn" />
              <div className="grow">
                <strong>{t('retailpackpro.scan.not_found')}</strong>
                <span>{t('demo.scan.not_found_hint', { code: scanMsg.code })}</span>
              </div>
            </div>
          )}
          {scanMsg?.kind === 'no-guide' && (
            <div className="notice warn" role="alert">
              <Icon name="warn" />
              <div className="grow">
                <strong>{scanMsg.product.name}</strong>
                <span>{t('retailpackpro.no_profile_found')}</span>
                <span className="small">{t('demo.scan.ask_lead')}</span>
              </div>
            </div>
          )}
          {scanMsg?.kind === 'order' && (
            <div className="notice info" role="alert">
              <Icon name="order" />
              <div className="grow">
                <strong>{t('demo.scan.is_order', { order: scanMsg.order.orderNumber })}</strong>
                <button className="btn primary" onClick={() => onOpenOrder(scanMsg.order)}>
                  {t('demo.scan.open_order')}
                </button>
              </div>
            </div>
          )}
          {scanMsg?.kind === 'multiple' && (
            <div className="choice-list" aria-label={t('demo.scan.choose')}>
              <p className="eyebrow">{t('demo.scan.choose')}</p>
              {scanMsg.products.map((p) => (
                <button key={p.id} className="choice" onClick={() => void openProduct(customer, p)}>
                  <span className="monogram" style={{ background: 'var(--paper)', overflow: 'hidden' }}>
                    <Img src={p.imageUrl} alt="" />
                  </span>
                  <span className="grow">
                    <span className="title">{p.name}</span>
                    <span className="sub num">{p.itemNumber}</span>
                  </span>
                  <span className="chev">
                    <Icon name="chev" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      );
    }

    case 'guide':
      return (
        <PackGuideView
          guide={state.guide}
          product={state.product}
          customer={state.customer}
          actions={
            <button className="btn go xl block" onClick={() => void approve()} disabled={busy}>
              <Icon name="check" size={28} /> {t('retailpackpro.approve.button')}
            </button>
          }
        />
      );

    case 'approved':
      return (
        <div className="done" role="status">
          <div className="ring">
            <Icon name="check" size={64} />
          </div>
          <h1>{t('retailpackpro.approve.confirmation')}</h1>
          <p className="muted">{state.product.name}</p>
          <p className="small muted">{t('demo.guide.next_scan')}</p>
        </div>
      );
  }
}

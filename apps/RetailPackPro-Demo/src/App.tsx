/**
 * Demoens rod: rollevalg i stedet for Supabase-login, fælles topbar,
 * medarbejder-start (Pakkevejledning / Ordrer & paller) og admin.
 */
import { useCallback, useEffect, useState } from 'react';

import { AdminApp } from './admin/AdminApp';
import { sessionFor, type DemoSession } from './demo/session';
import type { Order } from './domain/types';
import { GuideFlow } from './employee/GuideFlow';
import { t } from './i18n';
import { OrderFlow } from './orders/OrderFlow';
import { getServices } from './services';
import { TestCodes } from './TestCodes';
import { ConfirmSheet, Sheet, useToast } from './ui/common';
import { Icon } from './ui/Icon';

const ROLE_KEY = 'retailpackpro-demo-role';

type EmployeeArea = 'home' | 'guide' | 'orders';

function readRole(): DemoSession['role'] | null {
  try {
    const v = window.localStorage.getItem(ROLE_KEY);
    return v === 'admin' || v === 'medarbejder' ? v : null;
  } catch {
    return null;
  }
}
function writeRole(v: DemoSession['role'] | null) {
  try {
    if (v) window.localStorage.setItem(ROLE_KEY, v);
    else window.localStorage.removeItem(ROLE_KEY);
  } catch {
    // ikke kritisk
  }
}

export function App() {
  const [role, setRole] = useState<DemoSession['role'] | null>(readRole);
  const [area, setArea] = useState<EmployeeArea>('home');
  const [orderToOpen, setOrderToOpen] = useState<string | null>(null);
  const [back, setBackState] = useState<(() => void) | null>(null);
  const [menu, setMenu] = useState(false);
  const [codes, setCodes] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const toast = useToast();
  const session = role ? sessionFor(role) : null;

  const setBack = useCallback((fn: (() => void) | null) => setBackState(() => fn), []);

  useEffect(() => {
    writeRole(role);
  }, [role]);

  const goHome = () => {
    setArea('home');
    setOrderToOpen(null);
    setBack(null);
  };

  // Tilbage: først flowets egen, ellers til medarbejder-start
  const backAction = back ?? (role === 'medarbejder' && area !== 'home' ? goHome : null);
  const db = getServices().db;

  return (
    <div className="app" key={resetKey}>
      <header className="topbar">
        {backAction ? (
          <button className="back" onClick={backAction}>
            <Icon name="back" /> {t('core.actions.back')}
          </button>
        ) : (
          <div className="brand">
            <Icon name="pallet" size={28} />
            <span>
              RetailPackPro
              <small>{role === 'admin' ? t('demo.shell.admin') : role === 'medarbejder' ? t('demo.shell.employee') : t('demo.shell.tagline')}</small>
            </span>
          </div>
        )}
        <span className="spacer" />
        <span className="demo-pill">{t('demo.shell.demo')}</span>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label={t('demo.shell.menu')}>
          <Icon name="settings" />
        </button>
      </header>

      {!session && (
        <main className="page">
          <RoleSelect
            onPick={(r) => {
              setRole(r);
              goHome();
            }}
            onCodes={() => setCodes(true)}
          />
        </main>
      )}

      {session?.role === 'medarbejder' && (
        <main className="page">
          {area === 'home' && (
            <EmployeeHome
              onGuide={() => setArea('guide')}
              onOrders={() => {
                setOrderToOpen(null);
                setArea('orders');
              }}
            />
          )}
          {area === 'guide' && (
            <GuideFlow
              session={session}
              setBack={setBack}
              onOpenOrder={(o: Order) => {
                setOrderToOpen(o.id);
                setArea('orders');
              }}
            />
          )}
          {area === 'orders' && <OrderFlow key={orderToOpen ?? 'list'} session={session} setBack={setBack} initialOrderId={orderToOpen} />}
        </main>
      )}

      {session?.role === 'admin' && <AdminApp session={session} />}

      <footer className="footer">{t('demo.shell.footer')}</footer>

      {menu && (
        <Sheet title={t('demo.shell.menu')} onClose={() => setMenu(false)}>
          <div className="choice-list">
            {role && (
              <button
                className="choice"
                onClick={() => {
                  setMenu(false);
                  setRole(role === 'admin' ? 'medarbejder' : 'admin');
                  goHome();
                }}
              >
                <span className="monogram">
                  <Icon name="user" />
                </span>
                <span className="grow">
                  <span className="title">{role === 'admin' ? t('demo.shell.switch_to_employee') : t('demo.shell.switch_to_admin')}</span>
                  <span className="sub">{t('demo.shell.switch_sub')}</span>
                </span>
              </button>
            )}
            <button
              className="choice"
              onClick={() => {
                setMenu(false);
                setCodes(true);
              }}
            >
              <span className="monogram">
                <Icon name="barcode" />
              </span>
              <span className="grow">
                <span className="title">{t('demo.codes.title')}</span>
                <span className="sub">{t('demo.codes.sub')}</span>
              </span>
            </button>
            <button
              className="choice"
              onClick={() => {
                setMenu(false);
                setConfirmReset(true);
              }}
            >
              <span className="monogram" style={{ background: 'var(--stop)' }}>
                <Icon name="reset" />
              </span>
              <span className="grow">
                <span className="title">{t('demo.shell.reset')}</span>
                <span className="sub">{t('demo.shell.reset_sub')}</span>
              </span>
            </button>
            {role && (
              <button
                className="choice"
                onClick={() => {
                  setMenu(false);
                  setRole(null);
                  goHome();
                }}
              >
                <span className="monogram" style={{ background: 'var(--ink-3)' }}>
                  <Icon name="back" />
                </span>
                <span className="grow">
                  <span className="title">{t('demo.shell.leave')}</span>
                </span>
              </button>
            )}
          </div>
          <div className={`notice ${db.persistent ? 'info' : 'warn'}`}>
            <Icon name="info" />
            <div className="grow small">{db.persistent ? t('demo.shell.storage_ok') : t('demo.shell.storage_memory')}</div>
          </div>
        </Sheet>
      )}

      {codes && (
        <Sheet title={t('demo.codes.title')} onClose={() => setCodes(false)} wide>
          <TestCodes />
        </Sheet>
      )}

      {confirmReset && (
        <ConfirmSheet
          title={t('demo.shell.reset_title')}
          body={t('demo.shell.reset_body')}
          confirmLabel={t('demo.shell.reset')}
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            await getServices().db.reset();
            setConfirmReset(false);
            goHome();
            setResetKey((k) => k + 1);
            toast(t('demo.shell.reset_done'));
          }}
        />
      )}
    </div>
  );
}

function RoleSelect({ onPick, onCodes }: { onPick: (r: DemoSession['role']) => void; onCodes: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="eyebrow">{t('demo.start.eyebrow')}</span>
        <h1 style={{ fontSize: 38 }}>{t('demo.start.title')}</h1>
        <p className="muted" style={{ maxWidth: 560 }}>
          {t('demo.start.lead')}
        </p>
      </div>
      <div className="tiles">
        <button className="tile" onClick={() => onPick('medarbejder')}>
          <span className="tile-icon">
            <Icon name="scan" size={30} />
          </span>
          <span className="tile-title">{t('demo.start.employee')}</span>
          <span className="tile-sub">{t('demo.start.employee_sub')}</span>
        </button>
        <button className="tile alt" onClick={() => onPick('admin')}>
          <span className="tile-icon">
            <Icon name="settings" size={30} />
          </span>
          <span className="tile-title">{t('demo.start.admin')}</span>
          <span className="tile-sub">{t('demo.start.admin_sub')}</span>
        </button>
      </div>
      <div className="notice info">
        <Icon name="info" />
        <div className="grow">
          <span>{t('demo.start.notice')}</span>
          <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={onCodes}>
            <Icon name="barcode" size={18} /> {t('demo.codes.title')}
          </button>
        </div>
      </div>
    </>
  );
}

function EmployeeHome({ onGuide, onOrders }: { onGuide: () => void; onOrders: () => void }) {
  return (
    <>
      <h1>{t('demo.home.title')}</h1>
      <div className="tiles">
        <button className="tile" onClick={onGuide}>
          <span className="tile-icon">
            <Icon name="scan" size={30} />
          </span>
          <span className="tile-title">{t('demo.home.guide')}</span>
          <span className="tile-sub">{t('demo.home.guide_sub')}</span>
        </button>
        <button className="tile alt" onClick={onOrders}>
          <span className="tile-icon">
            <Icon name="order" size={30} />
          </span>
          <span className="tile-title">{t('demo.home.orders')}</span>
          <span className="tile-sub">{t('demo.home.orders_sub')}</span>
        </button>
      </div>
    </>
  );
}

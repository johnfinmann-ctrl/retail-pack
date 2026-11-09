/**
 * RetailPackPro v0.5 — app-skal. Samme mørkeblå design som v0.4.0.
 * Roller i demoen: Medarbejder, Regelansvarlig og Kontrollant (separate).
 */
import { useCallback, useState } from 'react';

import { ConfirmSheet, Sheet, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';

import { AdminV5 } from './admin/AdminV5';
import { USERS_V5 } from './data/seed';
import type { DemoUserV5 } from './domain/store';
import { GuideLookup } from './employee/GuideLookup';
import { History } from './employee/History';
import { PickrouteFlow } from './employee/PickrouteFlow';
import { getV5 } from './services';
import { TestCodesV5 } from './TestCodesV5';

type Role = DemoUserV5['role'];
type Area = 'home' | 'guide' | 'orders' | 'history';
const ROLE_KEY = 'retailpackpro-demo-v05-role';

const ROLE_INFO: Record<Role, { label: string; sub: string; icon: string; user: DemoUserV5 }> = {
  medarbejder: { label: 'Medarbejder', sub: 'Pallevejledning, plukruter, paller og fotos', icon: 'scan', user: USERS_V5.employee },
  regelansvarlig: { label: 'Regelansvarlig', sub: 'Kæder, vejledninger og pakkekrav', icon: 'edit', user: USERS_V5.owner },
  kontrollant: { label: 'Kontrollant', sub: 'Kontrollér og publicér pakkekrav', icon: 'check', user: USERS_V5.reviewer },
};

function readRole(): Role | null {
  try {
    const v = window.localStorage.getItem(ROLE_KEY);
    return v === 'medarbejder' || v === 'regelansvarlig' || v === 'kontrollant' ? v : null;
  } catch {
    return null;
  }
}
function writeRole(v: Role | null) {
  try {
    if (v) window.localStorage.setItem(ROLE_KEY, v);
    else window.localStorage.removeItem(ROLE_KEY);
  } catch {
    // ikke kritisk
  }
}

export function AppV5() {
  const [role, setRoleState] = useState<Role | null>(readRole);
  const [area, setArea] = useState<Area>('home');
  const [openPallet, setOpenPallet] = useState<{ routeId: string; palletId?: string } | null>(null);
  const [back, setBackState] = useState<(() => void) | null>(null);
  const [menu, setMenu] = useState(false);
  const [codes, setCodes] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const toast = useToast();

  const setBack = useCallback((fn: (() => void) | null) => setBackState(() => fn), []);
  const setRole = (r: Role | null) => {
    setRoleState(r);
    writeRole(r);
    goHome();
  };
  function goHome() {
    setArea('home');
    setOpenPallet(null);
    setBack(null);
  }
  const backAction = back ?? (role === 'medarbejder' && area !== 'home' ? goHome : null);
  const user = role ? ROLE_INFO[role].user : null;
  const store = getV5().store;

  return (
    <div className="app" key={resetKey}>
      <header className="topbar">
        {backAction ? (
          <button className="back" onClick={backAction}>
            <Icon name="back" /> Tilbage
          </button>
        ) : (
          <div className="brand">
            <Icon name="pallet" size={28} />
            <span>
              RetailPackPro
              <small>{role ? ROLE_INFO[role].label : 'Kædernes pakkekrav'}</small>
            </span>
          </div>
        )}
        <span className="spacer" />
        <span className="demo-pill">Demo 0.5</span>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Menu">
          <Icon name="settings" />
        </button>
      </header>

      {!role && (
        <main className="page">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="eyebrow">Demoversion 0.5</span>
            <h1 style={{ fontSize: 38 }}>Pak efter kædens krav</h1>
            <p className="muted" style={{ maxWidth: 580 }}>
              Detailkædernes krav til palleopbygning, sikring, folie og mærkning — pr. modtagelager. Alle data ligger lokalt i browseren.
            </p>
          </div>
          <div className="tiles">
            {(Object.keys(ROLE_INFO) as Role[]).map((r, i) => (
              <button key={r} className={`tile${i === 0 ? '' : ' alt'}`} onClick={() => setRole(r)}>
                <span className="tile-icon">
                  <Icon name={ROLE_INFO[r].icon} size={30} />
                </span>
                <span className="tile-title">{ROLE_INFO[r].label}</span>
                <span className="tile-sub">{ROLE_INFO[r].sub}</span>
              </button>
            ))}
          </div>
          <div className="notice info">
            <Icon name="info" />
            <div className="grow">
              <span>De rigtige kæder står som "Afventer officiel vejledning". Regelmotoren kan afprøves på en fiktiv testkæde.</span>
              <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setCodes(true)}>
                <Icon name="barcode" size={18} /> Test-pluklister til scanning
              </button>
            </div>
          </div>
        </main>
      )}

      {role === 'medarbejder' && user && (
        <main className="page">
          {area === 'home' && (
            <>
              <h1>Hvad skal du?</h1>
              <div className="tiles">
                <button className="tile" onClick={() => setArea('guide')}>
                  <span className="tile-icon">
                    <Icon name="pallet" size={30} />
                  </span>
                  <span className="tile-title">Pallevejledning</span>
                  <span className="tile-sub">Find kædens gældende krav</span>
                </button>
                <button className="tile" onClick={() => setArea('orders')}>
                  <span className="tile-icon">
                    <Icon name="scan" size={30} />
                  </span>
                  <span className="tile-title">Ordrer & paller</span>
                  <span className="tile-sub">Scan plukrute, registrér paller og tag fotos</span>
                </button>
                <button className="tile alt" onClick={() => setArea('history')}>
                  <span className="tile-icon">
                    <Icon name="history" size={30} />
                  </span>
                  <span className="tile-title">Historik</span>
                  <span className="tile-sub">Find tidligere registreringer</span>
                </button>
              </div>
            </>
          )}
          {area === 'guide' && <GuideLookup setBack={setBack} />}
          {area === 'orders' && <PickrouteFlow key={JSON.stringify(openPallet)} user={user} setBack={setBack} initial={openPallet} />}
          {area === 'history' && (
            <History
              onOpen={(routeId, palletId) => {
                setOpenPallet({ routeId, palletId });
                setArea('orders');
              }}
            />
          )}
        </main>
      )}

      {role && role !== 'medarbejder' && user && <AdminV5 key={user.id} user={user} />}

      <footer className="footer">Udviklet af Nordic Operations · Demoversion 0.5 med lokale testdata</footer>

      {menu && (
        <Sheet title="Menu" onClose={() => setMenu(false)}>
          <div className="choice-list">
            {(Object.keys(ROLE_INFO) as Role[])
              .filter((r) => r !== role)
              .map((r) => (
                <button
                  key={r}
                  className="choice"
                  onClick={() => {
                    setMenu(false);
                    setRole(r);
                  }}
                >
                  <span className="monogram">
                    <Icon name={ROLE_INFO[r].icon} />
                  </span>
                  <span className="grow">
                    <span className="title">Skift til {ROLE_INFO[r].label.toLowerCase()}</span>
                    <span className="sub">{ROLE_INFO[r].sub}</span>
                  </span>
                </button>
              ))}
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
                <span className="title">Test-pluklister</span>
                <span className="sub">Stregkoder til scanning</span>
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
                <span className="title">Nulstil demo</span>
                <span className="sub">Gendan de oprindelige testdata</span>
              </span>
            </button>
            {role && (
              <button
                className="choice"
                onClick={() => {
                  setMenu(false);
                  setRole(null);
                }}
              >
                <span className="monogram" style={{ background: 'var(--ink-3)' }}>
                  <Icon name="back" />
                </span>
                <span className="grow">
                  <span className="title">Tilbage til rollevalg</span>
                </span>
              </button>
            )}
          </div>
          <div className={`notice ${store.persistent ? 'info' : 'warn'}`}>
            <Icon name="info" />
            <div className="grow small">
              {store.persistent
                ? 'Data gemmes kun i denne browser på denne enhed og bevares ved genindlæsning, indtil du nulstiller demoen. Intet sendes til AX eller en database.'
                : 'Browseren tillader ikke lagring her (fx privat vindue). Alt forsvinder ved genindlæsning.'}
            </div>
          </div>
        </Sheet>
      )}

      {codes && (
        <Sheet title="Test-pluklister" onClose={() => setCodes(false)} wide>
          <TestCodesV5 />
        </Sheet>
      )}

      {confirmReset && (
        <ConfirmSheet
          title="Nulstil demoen?"
          body="Alle registreringer, fotos, dokumenter og regeländringer på denne enhed slettes, og de oprindelige testdata gendannes."
          confirmLabel="Nulstil demo"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            const s = getV5();
            await s.store.reset();
            const { seedHistory } = await import('./services');
            await seedHistory(s);
            setConfirmReset(false);
            goHome();
            setResetKey((k) => k + 1);
            toast('Demoen er nulstillet');
          }}
        />
      )}
    </div>
  );
}

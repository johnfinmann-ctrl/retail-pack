/**
 * Ordrer & paller: scan plukrute → modtager og gældende krav → paller →
 * pallekontrol, fotos og registrering. Opslaget sker i demoens lokale
 * testdata — IKKE i AX.
 */
import { useEffect, useState } from 'react';

import { formatDateTime } from '../../i18n';
import { ScanField } from '../../scanner/ScanField';
import { errorText, Loading, Sheet, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import type { PickrouteLookup } from '../domain/RegistrationService';
import type { DemoUserV5 } from '../domain/store';
import { MAX_PHOTOS_PER_ORDER, type PalletRecord, type Pickroute } from '../domain/types';
import { getV5 } from '../services';

import { PalletScreen, STATUS_LABEL } from './PalletScreen';
import { receiverLine, RequirementsView, StatusBanner } from './RequirementsView';

type View = { v: 'scan' } | { v: 'route'; id: string } | { v: 'pallet'; routeId: string; palletId: string };

export function PickrouteFlow({
  user,
  setBack,
  initial,
}: {
  user: DemoUserV5;
  setBack: (fn: (() => void) | null) => void;
  initial?: { routeId: string; palletId?: string } | null;
}) {
  const [view, setView] = useState<View>(
    initial?.palletId ? { v: 'pallet', routeId: initial.routeId, palletId: initial.palletId } : initial ? { v: 'route', id: initial.routeId } : { v: 'scan' },
  );
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (view.v === 'route') setBack(() => setView({ v: 'scan' }));
    else if (view.v === 'pallet') setBack(() => setView({ v: 'route', id: view.routeId }));
    else setBack(null);
  }, [view, setBack]);

  if (view.v === 'scan') return <ScanRoute onOpen={(p) => setView({ v: 'route', id: p.id })} />;
  if (view.v === 'route')
    return <RouteDetail user={user} routeId={view.id} onPallet={(palletId) => setView({ v: 'pallet', routeId: view.id, palletId })} />;
  return <PalletScreen user={user} routeId={view.routeId} palletRecordId={view.palletId} onDone={() => setView({ v: 'route', id: view.routeId })} />;
}

function ScanRoute({ onOpen }: { onOpen: (p: Pickroute) => void }) {
  const toast = useToast();
  const [msg, setMsg] = useState<PickrouteLookup | null>(null);
  const { data: routes } = useAsync(() => getV5().registrations.listPickroutes(), []);
  const { data: chains } = useAsync(() => getV5().rules.listChains(), []);

  async function find(code: string) {
    try {
      const res = await getV5().registrations.lookup(code);
      if (res.kind === 'pickroute') onOpen(res.pickroute);
      else setMsg(res);
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  return (
    <>
      <h1>Scan plukrute</h1>
      <ScanField id="route-scan" placeholder="Plukrutenummer, fx 204874" onSubmit={(c) => void find(c)} />
      <p className="hint">
        <Icon name="info" size={18} /> Scan den øverste stregkode på pluklisten — ikke parti-ID'erne.
      </p>

      {msg?.kind === 'batch' && (
        <div className="notice warn" role="alert">
          <Icon name="warn" />
          <div className="grow">
            <strong>Det er et parti-ID ({msg.code})</strong>
            <span>Scan plukrutens stregkode øverst på pluklisten.</span>
          </div>
        </div>
      )}
      {msg?.kind === 'salesOrder' && (
        <div className="notice info" role="alert">
          <Icon name="info" />
          <div className="grow">
            <strong>Det er salgsordrenummeret ({msg.code})</strong>
            <span>Plukruten for denne ordre er {msg.pickroute.routeNumber}.</span>
            <button className="btn primary small" style={{ alignSelf: 'flex-start' }} onClick={() => onOpen(msg.pickroute)}>
              Åbn plukrute {msg.pickroute.routeNumber}
            </button>
          </div>
        </div>
      )}
      {msg?.kind === 'none' && (
        <div className="notice warn" role="alert">
          <Icon name="warn" />
          <div className="grow">
            <strong>Plukrute {msg.code} blev ikke fundet</strong>
            <span>Demoen søger kun i lokale testordrer — ikke i AX.</span>
          </div>
        </div>
      )}

      <div className="eyebrow">Testordrer i demoen</div>
      <div className="choice-list">
        {(routes ?? []).map((r) => (
          <button key={r.id} className="choice" onClick={() => onOpen(r)}>
            <span className="monogram" aria-hidden="true">
              <Icon name="order" />
            </span>
            <span className="grow">
              <span className="title num">{r.routeNumber}</span>
              <span className="sub">
                {r.recipientName} · {chains?.find((c) => c.id === r.chainId)?.name}
              </span>
            </span>
            <span className="chev">
              <Icon name="chev" />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function RouteDetail({ user, routeId, onPallet }: { user: DemoUserV5; routeId: string; onPallet: (id: string) => void }) {
  const toast = useToast();
  const [showReq, setShowReq] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const { data } = useAsync(async () => {
    const s = getV5();
    const route = await s.store.get('pickroutes', routeId);
    if (!route) throw new Error('Plukruten findes ikke');
    const [r, pallets, photos, documents] = await Promise.all([
      s.registrations.resolveFor(route),
      s.registrations.listPallets(routeId),
      s.registrations.listPhotos(routeId),
      s.rules.listDocuments(),
    ]);
    return { route, r, pallets, photos, documents };
  }, [routeId]);

  if (!data) return <Loading />;
  const { route, r, pallets, photos } = data;

  return (
    <>
      <div className="route-card">
        <div className="kv">
          <div>
            <div className="k">Plukrute</div>
            <div className="v num">{route.routeNumber}</div>
          </div>
          <div>
            <div className="k">Salgsordre</div>
            <div className="v num">{route.salesOrder}</div>
          </div>
          <div>
            <div className="k">Modtager</div>
            <div className="v">{route.recipientName}</div>
          </div>
          <div>
            <div className="k">Kæde</div>
            <div className="v">{r.chain.name}</div>
          </div>
        </div>
        <span className="ax">Lokal testordre — ikke slået op i AX</span>
      </div>

      <section className="panel" aria-label="Pakkekrav">
        <div className="eyebrow">Pakkekrav · {receiverLine(r)}</div>
        <StatusBanner r={r} compact />
        {r.status !== 'awaiting' && (
          <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowReq(true)}>
            <Icon name="eye" size={18} /> Se pakkekrav
          </button>
        )}
      </section>

      <section className="panel" aria-label="Paller">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ flex: 1 }}>Paller</h2>
          <span className="counter" aria-label={`${photos.length} af højst ${MAX_PHOTOS_PER_ORDER} fotos`}>
            <Icon name="camera" size={20} /> {photos.length} / {MAX_PHOTOS_PER_ORDER}
          </span>
        </div>
        {pallets.length === 0 && <p className="muted">Ingen paller registreret på plukruten endnu.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pallets.map((p) => (
            <PalletRow key={p.id} p={p} photoCount={photos.filter((ph) => ph.palletRecordId === p.id).length} onOpen={() => onPallet(p.id)} />
          ))}
        </div>
        <button className="btn primary xl block" onClick={() => setNewOpen(true)}>
          <Icon name="pallet" size={28} /> Ny palle
        </button>
      </section>

      {showReq && (
        <Sheet title="Pakkekrav" onClose={() => setShowReq(false)} wide>
          <RequirementsView r={r} documents={data.documents} />
        </Sheet>
      )}
      {newOpen && (
        <NewPalletSheet
          route={route}
          nextNo={pallets.reduce((m, p) => Math.max(m, p.number), 0) + 1}
          onClose={() => setNewOpen(false)}
          onCreate={async (sscc) => {
            try {
              const p = await getV5().registrations.startPallet(route.id, user, sscc);
              setNewOpen(false);
              onPallet(p.id);
            } catch (e) {
              toast(errorText(e), 'err');
            }
          }}
        />
      )}
    </>
  );
}

export function PalletRow({ p, photoCount, onOpen, extra }: { p: PalletRecord; photoCount: number; onOpen: () => void; extra?: string }) {
  return (
    <button className="pallet-card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={onOpen}>
      <span className="pallet-no">{p.number}</span>
      <div className="grow">
        <strong className="num">{p.palletId}</strong>
        <div className="small muted">
          {formatDateTime(p.registeredAt ?? p.createdAt)} · {photoCount} foto{photoCount === 1 ? '' : 's'}
          {extra ? ` · ${extra}` : ''}
        </div>
      </div>
      <span className={`pill status-pill-${p.status}`}>{STATUS_LABEL[p.status]}</span>
    </button>
  );
}

function NewPalletSheet({
  route,
  nextNo,
  onClose,
  onCreate,
}: {
  route: Pickroute;
  nextNo: number;
  onClose: () => void;
  onCreate: (sscc?: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'auto' | 'sscc'>('auto');
  const autoId = `${route.routeNumber}-${String(nextNo).padStart(2, '0')}`;
  return (
    <Sheet title="Ny palle" onClose={onClose}>
      <div className="seg" role="group" aria-label="Palle-ID">
        <button type="button" aria-pressed={mode === 'auto'} onClick={() => setMode('auto')}>
          Automatisk ID
        </button>
        <button type="button" aria-pressed={mode === 'sscc'} onClick={() => setMode('sscc')}>
          Scan SSCC-label
        </button>
      </div>
      {mode === 'auto' ? (
        <>
          <p>
            Palle-ID: <strong className="num">{autoId}</strong>
          </p>
          <button className="btn primary xl block" onClick={() => void onCreate()}>
            Start palle {nextNo}
          </button>
        </>
      ) : (
        <>
          <p className="muted">Scan pallelabelens SSCC (18 cifre).</p>
          <ScanField id="sscc-scan" placeholder="SSCC, 18 cifre" onSubmit={(code) => void onCreate(code)} />
        </>
      )}
    </Sheet>
  );
}

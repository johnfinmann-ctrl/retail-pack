/**
 * Ordrer & paller: scan plukrute → modtager og gældende krav → paller →
 * pallekontrol, fotos og registrering. Opslaget sker i demoens lokale
 * testdata — IKKE i AX.
 */
import { useEffect, useState } from 'react';

import { formatDateTime } from '../../i18n';
import { ScanField } from '../../scanner/ScanField';
import { ConfirmSheet, errorText, Loading, Sheet, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { CONFIG } from '../domain/config';
import type { PickrouteLookup } from '../domain/RegistrationService';
import { CARLETTI_LABEL, DECISION_LABEL, EVENT_LABEL, OVERALL_LABEL, summarize } from '../domain/SplitOrderService';
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
            {summarize(r).isSplit && <span className="pill stop">Delt</span>}
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
  const [confirmDone, setConfirmDone] = useState(false);
  const [v, setV] = useState(0);
  const { data } = useAsync(async () => {
    const s = getV5();
    const route = await s.store.get('pickroutes', routeId);
    if (!route) throw new Error('Plukruten findes ikke');
    const [r, pallets, photos, documents, blockers, events] = await Promise.all([
      s.registrations.resolveFor(route),
      s.registrations.listPallets(routeId),
      s.registrations.listPhotos(routeId),
      s.rules.listDocuments(),
      s.split.completionBlockers(routeId),
      s.split.listEvents(routeId),
    ]);
    return { route, r, pallets, photos, documents, blockers, events };
  }, [routeId, v]);

  if (!data) return <Loading />;
  const { route, r, pallets, photos, blockers, events } = data;
  const sum = summarize(route);
  const done = route.carlettiStatus === 'completed';
  const own = CONFIG.sites.H5;

  return (
    <>
      <div className="route-card">
        <div className="top-pills">
          {sum.isSplit ? <span className="split-pill">DELT ORDRE · H5 + FL</span> : <span className="own-pill">Kun Carletti (H5)</span>}
        </div>
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
        <div className="kv">
          <div>
            <div className="k">Carlettis lagersted</div>
            <div className="v num">
              {own.code} · {own.location}
            </div>
          </div>
          <div>
            <div className="k">Carlettis pakning</div>
            <div className="v">{CARLETTI_LABEL[route.carlettiStatus]}</div>
          </div>
          {sum.isSplit && (
            <div>
              <div className="k">Leveringsform</div>
              <div className="v">{DECISION_LABEL[sum.decision]}</div>
            </div>
          )}
          <div>
            <div className="k">Samlet ordre</div>
            <div className="v">{OVERALL_LABEL[sum.overall]}</div>
          </div>
        </div>
        <span className="ax">Lokal testordre — ikke slået op i AX</span>
      </div>

      {sum.isSplit && (
        <div className="split-banner" role="alert">
          <Icon name="warn" size={30} />
          <div className="grow">
            <strong>DELT ORDRE</strong>
            <span>
              {sum.flLines.length} varelinje{sum.flLines.length === 1 ? '' : 'r'} hos Frode Laursen (FL)
              {sum.openFlLines.length < sum.flLines.length && ` · ${sum.flLines.length - sum.openFlLines.length} håndteret i AX`}
            </span>
            <span className="small">Afslut kun Carlettis del. Salgsordren lukkes ikke her.</span>
          </div>
        </div>
      )}

      {sum.isSplit && (
        <div className={`notice ${sum.decision === 'pending' ? 'warn' : 'info'}`} role="status">
          <Icon name={sum.decision === 'pending' ? 'info' : 'flag'} />
          <div className="grow">
            <strong>Leveringsform: {DECISION_LABEL[sum.decision]}</strong>
            <span className="small">
              {sum.decision === 'pending' && 'Frode Laursen har ikke besluttet endnu. Sæt pallerne til side, når Carlettis del er pakket.'}
              {sum.decision === 'consolidation' && 'Carlettis paller sendes til Frode Laursen, som samler ordren.'}
              {sum.decision === 'split' && 'Carletti og Frode Laursen leverer hver deres del.'}
            </span>
          </div>
        </div>
      )}

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
        {!done && (
          <button className="btn primary xl block" onClick={() => setNewOpen(true)}>
            <Icon name="pallet" size={28} /> Ny palle
          </button>
        )}
      </section>

      <section className="panel" aria-label="Carlettis pakning">
        {done ? (
          <div className="notice ok" role="status">
            <Icon name="check" />
            <div className="grow">
              <strong>Carlettis pakning er afsluttet</strong>
              <span className="small">
                {route.carlettiCompletedAt && formatDateTime(route.carlettiCompletedAt)}
                {sum.isSplit ? ' · Salgsordren er IKKE afsluttet — afventer Frode Laursen og AX.' : ' · Afventer bekræftelse fra AX.'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {blockers.length > 0 && (
              <ul className="blockers">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            <button className="btn go xl block" disabled={blockers.length > 0} onClick={() => setConfirmDone(true)}>
              <Icon name="flag" size={28} /> Afslut Carlettis pakning
            </button>
          </>
        )}
        {events.length > 0 && (
          <div>
            <div className="eyebrow">AX-hændelser (simuleret — intet sendt til AX)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {events.map((e) => (
                <div key={e.id} className="small" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`pill ${e.status === 'acknowledged' ? 'go' : 'neutral'}`}>{e.status === 'acknowledged' ? 'Kvitteret' : 'Afventer kvittering'}</span>
                  <span>{EVENT_LABEL[e.type]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {route.lines.length > 0 && (
        <section className="panel" aria-label="Varelinjer">
          <h2>Varelinjer pr. lagersted</h2>
          {[
            { title: `${own.name} · ${own.code} / ${own.location}`, lines: sum.ownLines, cls: 'own' },
            { title: `${CONFIG.sites.FL.name} · FL / FL`, lines: sum.flLines, cls: 'fl' },
          ]
            .filter((g) => g.lines.length > 0)
            .map((g) => (
              <div key={g.cls} className={`site-group ${g.cls}`}>
                <div className="eyebrow">{g.title}</div>
                {g.lines.map((l) => (
                  <div key={l.id} className="site-line">
                    <span className="code num">{l.itemNumber}</span>
                    <span className="grow">{l.description}</span>
                    {l.site === 'FL' && <span className={`pill ${l.status === 'handled' ? 'go' : 'draft'}`}>{l.status === 'handled' ? 'Håndteret (AX)' : 'Åben hos FL'}</span>}
                  </div>
                ))}
              </div>
            ))}
          <p className="small muted">Varelinjerne vises kun til orientering. Antal, partier og ordrestatus styres i AX.</p>
        </section>
      )}

      {confirmDone && (
        <ConfirmSheet
          title="Afslut Carlettis pakning?"
          body={
            sum.isSplit
              ? `Kun Carlettis del afsluttes. Salgsordre ${route.salesOrder} forbliver åben, fordi ${sum.openFlLines.length} varelinje(r) ligger hos Frode Laursen.`
              : `Carlettis pakning af plukrute ${route.routeNumber} afsluttes. Salgsordren lukkes først, når AX bekræfter.`
          }
          confirmLabel="Afslut Carlettis pakning"
          onCancel={() => setConfirmDone(false)}
          onConfirm={async () => {
            try {
              await getV5().split.completeCarlettiPacking(route.id, user);
              toast(sum.isSplit ? 'Carlettis pakning er afsluttet — ordren er delt og afventer FL' : 'Carlettis pakning er afsluttet');
              setV((x) => x + 1);
            } catch (e) {
              toast(errorText(e), 'err');
            }
            setConfirmDone(false);
          }}
        />
      )}

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

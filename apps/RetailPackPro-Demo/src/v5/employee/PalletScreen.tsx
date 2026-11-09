/**
 * Pallekontrol: kontrolpunkter fra de gældende krav, fotos og registrering.
 * "Godkendt til forsendelse" kun når alt er opfyldt. Ellers: afvigelse med
 * begrundelse og foto — aldrig godkendt.
 */
import { useState } from 'react';

import { formatDateTime } from '../../i18n';
import { ConfirmSheet, errorText, Loading, Sheet, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import type { DemoUserV5 } from '../domain/store';
import type { PalletStatus } from '../domain/types';
import { getV5 } from '../services';

import { PhotoBlock } from './Photos';
import { RequirementsView, StatusBanner, TestBanner } from './RequirementsView';

export const STATUS_LABEL: Record<PalletStatus, string> = {
  in_progress: 'Under pakning',
  approved: 'Godkendt til forsendelse',
  deviation: 'Afvigelse — ikke godkendt',
};

export function PalletScreen({
  user,
  routeId,
  palletRecordId,
  onDone,
}: {
  user: DemoUserV5;
  routeId: string;
  palletRecordId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [v, setV] = useState(0);
  const reload = () => setV((x) => x + 1);
  const { data } = useAsync(async () => {
    const s = getV5();
    const [route, pallet] = await Promise.all([s.store.get('pickroutes', routeId), s.store.get('pallets', palletRecordId)]);
    if (!route || !pallet) throw new Error('Pallen findes ikke');
    const [r, blockers, documents] = await Promise.all([
      s.registrations.resolveFor(route),
      pallet.status === 'in_progress' ? s.registrations.approvalBlockers(pallet.id) : Promise.resolve([]),
      s.rules.listDocuments(),
    ]);
    return { route, pallet, r, blockers, documents };
  }, [routeId, palletRecordId, v]);
  const [showReq, setShowReq] = useState(false);
  const [deviation, setDeviation] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!data) return <Loading />;
  const { route, pallet, r, blockers } = data;
  const open = pallet.status === 'in_progress';

  async function setCheck(key: (typeof pallet.checks)[number]['key'], ok: boolean) {
    try {
      const cur = pallet.checks.find((c) => c.key === key)?.ok;
      await getV5().registrations.setCheck(pallet.id, key, cur === ok ? null : ok);
      reload();
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  async function approve() {
    setBusy(true);
    try {
      await getV5().registrations.registerApproved(pallet.id, user);
      toast(`Palle ${pallet.palletId} er godkendt til forsendelse`);
      reload();
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div>
        <span className="eyebrow num">
          Plukrute {route.routeNumber} · {route.recipientName}
        </span>
        <h1 className="num">Palle {pallet.palletId}</h1>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <span className={`pill status-pill-${pallet.status}`}>{STATUS_LABEL[pallet.status]}</span>
          <span className="pill neutral">{pallet.palletIdKind === 'sscc' ? 'SSCC' : 'Automatisk ID'}</span>
          <span className="pill neutral">{formatDateTime(pallet.registeredAt ?? pallet.createdAt)}</span>
        </p>
      </div>

      {open ? (
        <>
          {r.isTest && <TestBanner />}
          <StatusBanner r={r} compact />
          {r.status !== 'awaiting' && (
            <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowReq(true)}>
              <Icon name="eye" size={18} /> Se pakkekrav og referencebillede
            </button>
          )}
        </>
      ) : (
        <RegisteredSummary pallet={pallet} userName={getV5().store.userName(pallet.registeredBy)} />
      )}

      {pallet.checks.length > 0 && (
        <section className="panel" aria-label="Kontrolpunkter">
          <h2>Kontrol af pallen</h2>
          <div className="req-list">
            {pallet.checks.map((c) => (
              <div className="check-row" key={c.key}>
                <div className="grow">
                  <div className="k">{c.label}</div>
                  <div className="req-text">{c.requirement}</div>
                </div>
                <div className="okno" role="group" aria-label={c.label}>
                  <button className="ok" aria-pressed={c.ok === true} disabled={!open} onClick={() => void setCheck(c.key, true)} aria-label={`${c.label}: opfyldt`}>
                    <Icon name="check" size={28} />
                  </button>
                  <button className="no" aria-pressed={c.ok === false} disabled={!open} onClick={() => void setCheck(c.key, false)} aria-label={`${c.label}: ikke opfyldt`}>
                    <Icon name="close" size={26} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <PhotoBlock pickrouteId={route.id} palletRecordId={pallet.id} canDelete={open} user={user} version={v} onChanged={reload} />

      {open && (
        <div className="sticky-actions">
          {blockers.length > 0 && (
            <ul className="blockers" aria-label="Mangler før godkendelse">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn go xl" disabled={busy || blockers.length > 0} onClick={() => void approve()}>
              <Icon name="check" size={28} /> Godkend til forsendelse
            </button>
            <button className="btn danger" onClick={() => setDeviation(true)}>
              <Icon name="warn" /> Registrér afvigelse
            </button>
          </div>
          <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setCancel(true)}>
            <Icon name="trash" size={18} /> Annullér palle
          </button>
        </div>
      )}
      {!open && (
        <button className="btn primary block" onClick={onDone}>
          Tilbage til plukruten
        </button>
      )}

      {showReq && (
        <Sheet title="Pakkekrav" onClose={() => setShowReq(false)} wide>
          <RequirementsView r={r} documents={data.documents} />
        </Sheet>
      )}
      {deviation && (
        <DeviationSheet
          onClose={() => setDeviation(false)}
          onSubmit={async (reason) => {
            try {
              await getV5().registrations.registerDeviation(pallet.id, reason, user);
              toast('Afvigelsen er registreret — pallen er ikke godkendt til forsendelse', 'info');
              setDeviation(false);
              reload();
            } catch (e) {
              toast(errorText(e), 'err');
            }
          }}
        />
      )}
      {cancel && (
        <ConfirmSheet
          title={`Annullér palle ${pallet.palletId}?`}
          body="Pallen og dens fotos slettes. Brug det, hvis pallen er startet ved en fejl."
          confirmLabel="Annullér palle"
          danger
          onCancel={() => setCancel(false)}
          onConfirm={async () => {
            await getV5().registrations.cancelPallet(pallet.id);
            toast('Pallen er annulleret');
            onDone();
          }}
        />
      )}
    </>
  );
}

function RegisteredSummary({ pallet, userName }: { pallet: { status: PalletStatus; deviationReason: string | null; snapshot: import('../domain/types').RuleSnapshot | null }; userName: string | null }) {
  const snap = pallet.snapshot;
  return (
    <section className={`notice ${pallet.status === 'approved' ? 'ok' : 'err'}`} aria-label="Registrering">
      <Icon name={pallet.status === 'approved' ? 'check' : 'warn'} />
      <div className="grow">
        <strong>{STATUS_LABEL[pallet.status]}</strong>
        {pallet.deviationReason && <span>Begrundelse: {pallet.deviationReason}</span>}
        {userName && <span className="small">Registreret af {userName}</span>}
        {snap && (
          <span className="small">
            Krav ved registrering:{' '}
            {snap.ruleSets.length ? snap.ruleSets.map((r) => `${r.title} v${r.version}`).join(', ') : 'ingen godkendte krav'}
            {snap.documents.length > 0 && ` · Kilder: ${snap.documents.map((d) => `${d.title} v${d.docVersion}`).join(', ')}`}
          </span>
        )}
        {snap && snap.issues.length > 0 && <span className="small">Forhold: {snap.issues.join(' · ')}</span>}
      </div>
    </section>
  );
}

function DeviationSheet({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Registrér afvigelse" onClose={onClose}>
      <div className="notice err">
        <Icon name="warn" />
        <div className="grow">Pallen registreres som afvigelse og bliver ikke godkendt til forsendelse.</div>
      </div>
      <div className="field">
        <label htmlFor="dev-reason">Begrundelse</label>
        <textarea id="dev-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fx: krav til label er uklart — aftalt med teamleder" />
        <span className="help">Kræver mindst ét foto af pallen.</span>
      </div>
      <div className="btn-row">
        <button className="btn ghost" onClick={onClose}>
          Annullér
        </button>
        <button
          className="btn danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSubmit(reason);
            setBusy(false);
          }}
        >
          Registrér afvigelse
        </button>
      </div>
    </Sheet>
  );
}

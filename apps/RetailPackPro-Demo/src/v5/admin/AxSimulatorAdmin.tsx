/**
 * AX-simulator (kun demo). Viser hændelser, der ER FORBEREDT til AX, og lader
 * testeren simulere svar fra AX og Frode Laursen. Intet sendes til AX.
 */
import { useState } from 'react';

import { formatDateTime } from '../../i18n';
import { errorText, Loading, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { CARLETTI_LABEL, DECISION_LABEL, EVENT_LABEL, OVERALL_LABEL, summarize } from '../domain/SplitOrderService';
import type { DemoUserV5 } from '../domain/store';
import { getV5 } from '../services';

export function AxSimulatorAdmin({ user }: { user: DemoUserV5 }) {
  const toast = useToast();
  const [v, setV] = useState(0);
  const { data } = useAsync(async () => {
    const s = getV5();
    const [routes, events, inbound] = await Promise.all([s.registrations.listPickroutes(), s.split.listEvents(), s.split.listInbound()]);
    return { routes, events, inbound };
  }, [v]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast(ok);
      setV((x) => x + 1);
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  if (!data) return <Loading />;
  const split = data.routes.filter((r) => summarize(r).isSplit || r.carlettiStatus === 'completed');

  return (
    <>
      <h1>AX-simulator</h1>
      <div className="notice warn">
        <Icon name="info" />
        <div className="grow">
          <strong>SIMULERING — ingen forbindelse til AX</strong>
          <span className="small">Hændelser lægges i en udbakke, der er klar til en senere AX-integration. Kvitteringer og beskeder fra AX og Frode Laursen simuleres her.</span>
        </div>
      </div>

      <section className="panel">
        <h2>Ordrer</h2>
        {split.length === 0 && <p className="muted">Ingen delte eller afsluttede ordrer endnu.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {split.map((r) => {
            const s = summarize(r);
            return (
              <div key={r.id} className="version" style={{ flexWrap: 'wrap' }}>
                <div className="grow">
                  <strong className="num">
                    Plukrute {r.routeNumber} · SO {r.salesOrder}
                  </strong>
                  <span className="small muted">{r.recipientName}</span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {s.isSplit && <span className="pill stop">Delt ordre</span>}
                    <span className="pill neutral">{CARLETTI_LABEL[r.carlettiStatus]}</span>
                    {s.isSplit && <span className="pill info">{DECISION_LABEL[s.decision]}</span>}
                    {s.isSplit && <span className="pill neutral">FL åbne linjer: {s.openFlLines.length}</span>}
                    <span className={`pill ${s.overall === 'completed_in_ax' ? 'go' : 'draft'}`}>{OVERALL_LABEL[s.overall]}</span>
                  </span>
                  {!r.axConfirmedComplete && (
                    <div className="btn-row" style={{ marginTop: 6 }}>
                      {s.isSplit && (
                        <>
                          <button className="btn ghost small" style={{ flex: '0 0 auto' }} onClick={() => void run(() => getV5().split.simulateFlDecision(r.id, 'consolidation', user), 'Simuleret: FL valgte konsolidering')}>
                            FL: Konsolidering
                          </button>
                          <button className="btn ghost small" style={{ flex: '0 0 auto' }} onClick={() => void run(() => getV5().split.simulateFlDecision(r.id, 'split', user), 'Simuleret: FL valgte delt levering')}>
                            FL: Delt levering
                          </button>
                          {s.openFlLines.length > 0 && (
                            <button className="btn ghost small" style={{ flex: '0 0 auto' }} onClick={() => void run(() => getV5().split.simulateAxFlLinesHandled(r.id), 'Simuleret: AX meldte FL-linjer håndteret')}>
                              AX: FL-linjer håndteret
                            </button>
                          )}
                        </>
                      )}
                      <button className="btn secondary small" style={{ flex: '0 0 auto' }} onClick={() => void run(() => getV5().split.simulateAxAllPartsHandled(r.id), 'Simuleret: AX bekræftede, at alle dele er håndteret')}>
                        AX: Alle dele håndteret
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Udbakke til AX</h2>
        {data.events.length === 0 && <p className="muted">Ingen hændelser endnu. De opstår, når Carlettis pakning afsluttes.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.events.map((e) => (
            <div key={e.id} className="pallet-card">
              <div className="grow">
                <strong>{EVENT_LABEL[e.type]}</strong>
                <div className="small muted num">
                  Plukrute {e.routeNumber} · SO {e.salesOrder} · {formatDateTime(e.createdAt)}
                </div>
                <div className="small code">{JSON.stringify(e.payload)}</div>
              </div>
              {e.status === 'acknowledged' ? (
                <span className="pill go">Kvitteret (simuleret)</span>
              ) : (
                <button className="btn secondary small" onClick={() => void run(() => getV5().split.simulateAck(e.id), 'Simuleret kvittering modtaget')}>
                  Simulér kvittering
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {data.inbound.length > 0 && (
        <section className="panel">
          <h2>Modtagne beskeder (simuleret)</h2>
          {data.inbound.map((m) => (
            <div key={m.id} className="small">
              {formatDateTime(m.receivedAt)} ·{' '}
              {m.kind === 'fl_delivery_decision'
                ? `Frode Laursen: ${DECISION_LABEL[m.value as 'consolidation' | 'split']}`
                : m.kind === 'ax_fl_lines_handled'
                  ? 'AX: FL-linjer håndteret'
                  : 'AX: alle dele håndteret'}{' '}
              · plukrute {data.routes.find((r) => r.id === m.pickrouteId)?.routeNumber}
            </div>
          ))}
        </section>
      )}
    </>
  );
}

/**
 * Lokale testordrer (plukruter). Erstatter IKKE AX — i drift kommer
 * plukruten fra pluklisten. Her kan man oprette testordrer til afprøvning.
 */
import { useState } from 'react';

import { errorText, Loading, Sheet, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import type { DemoUserV5 } from '../domain/store';
import type { Pickroute } from '../domain/types';
import { getV5 } from '../services';

export function PickroutesAdmin({ user }: { user: DemoUserV5 }) {
  const [v, setV] = useState(0);
  const [edit, setEdit] = useState<Pickroute | 'new' | null>(null);
  const { data } = useAsync(async () => {
    const s = getV5();
    const [routes, chains, formats, warehouses] = await Promise.all([s.registrations.listPickroutes(), s.store.list('chains'), s.store.list('formats'), s.store.list('warehouses')]);
    return { routes, chains, formats, warehouses };
  }, [v]);
  if (!data) return <Loading />;
  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Testordrer</h1>
        <button className="btn primary" onClick={() => setEdit('new')}>
          <Icon name="plus" /> Ny testordre
        </button>
      </div>
      <div className="notice info">
        <Icon name="info" />
        <div className="grow small">Lokale testordrer til demoen. Der er ingen forbindelse til AX — ordrer, varer, antal og partier styres fortsat i AX.</div>
      </div>
      <div className="table-wrap">
        <table className="list">
          <thead>
            <tr>
              <th>Plukrute</th>
              <th>Salgsordre</th>
              <th>Modtager</th>
              <th>Kæde</th>
              <th>Modtagelager</th>
            </tr>
          </thead>
          <tbody>
            {data.routes.map((r) => (
              <tr key={r.id} className="click" tabIndex={0} onClick={() => setEdit(r)} onKeyDown={(e) => e.key === 'Enter' && setEdit(r)}>
                <td className="num">
                  <strong>{r.routeNumber}</strong>
                </td>
                <td className="num">{r.salesOrder}</td>
                <td>{r.recipientName}</td>
                <td>{data.chains.find((c) => c.id === r.chainId)?.name}</td>
                <td>{data.warehouses.find((w) => w.id === r.warehouseId)?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <RouteForm
          user={user}
          route={edit === 'new' ? null : edit}
          lookups={data}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            setV((x) => x + 1);
          }}
        />
      )}
    </>
  );
}

function RouteForm({
  user,
  route,
  lookups,
  onClose,
  onSaved,
}: {
  user: DemoUserV5;
  route: Pickroute | null;
  lookups: { chains: Array<{ id: string; name: string }>; formats: Array<{ id: string; chainId: string; name: string }>; warehouses: Array<{ id: string; chainId: string; formatId: string | null; name: string }> };
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState({
    routeNumber: route?.routeNumber ?? '',
    salesOrder: route?.salesOrder ?? '',
    recipientName: route?.recipientName ?? '',
    chainId: route?.chainId ?? '',
    formatId: route?.formatId ?? '',
    warehouseId: route?.warehouseId ?? '',
    batches: route?.demoBatchIds.join(', ') ?? '',
    lines: (route?.lines ?? []).map((l) => `${l.site}; ${l.itemNumber}; ${l.description}`).join('\n'),
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Sheet title={route ? `Testordre ${route.routeNumber}` : 'Ny testordre'} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const wh = lookups.warehouses.find((w) => w.id === f.warehouseId);
            await getV5().registrations.savePickroute(
              {
                id: route?.id,
                routeNumber: f.routeNumber,
                salesOrder: f.salesOrder,
                recipientName: f.recipientName,
                chainId: f.chainId,
                formatId: f.formatId || wh?.formatId || null,
                warehouseId: f.warehouseId || null,
                demoBatchIds: f.batches.split(/[,\s]+/),
                lines: parseLines(f.lines),
              },
              user,
            );
            toast('Testordren er gemt');
            onSaved();
          } catch (err) {
            toast(errorText(err), 'err');
          }
        }}
      >
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pr-no">Plukrute</label>
            <input id="pr-no" type="text" inputMode="numeric" value={f.routeNumber} onChange={(e) => set('routeNumber', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pr-so">Salgsordre</label>
            <input id="pr-so" type="text" value={f.salesOrder} onChange={(e) => set('salesOrder', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pr-rcv">Modtager</label>
          <input id="pr-rcv" type="text" value={f.recipientName} onChange={(e) => set('recipientName', e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pr-chain">Kæde</label>
            <select id="pr-chain" value={f.chainId} onChange={(e) => setF((x) => ({ ...x, chainId: e.target.value, formatId: '', warehouseId: '' }))}>
              <option value="">Vælg …</option>
              {lookups.chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pr-format">Kædeformat</label>
            <select id="pr-format" value={f.formatId} onChange={(e) => set('formatId', e.target.value)}>
              <option value="">Ikke angivet</option>
              {lookups.formats
                .filter((x) => x.chainId === f.chainId)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pr-wh">Modtagelager</label>
          <select id="pr-wh" value={f.warehouseId} onChange={(e) => set('warehouseId', e.target.value)}>
            <option value="">Ikke angivet</option>
            {lookups.warehouses
              .filter((w) => w.chainId === f.chainId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pr-batch">Parti-ID'er på test-pluklisten (valgfri)</label>
          <input id="pr-batch" type="text" value={f.batches} onChange={(e) => set('batches', e.target.value)} placeholder="Adskil med komma" />
          <span className="help">Kun til demoen, så appen kan advare, hvis et parti-ID scannes i stedet for plukruten.</span>
        </div>
        <div className="field">
          <label htmlFor="pr-lines">Varelinjer med lagersted (valgfri)</label>
          <textarea id="pr-lines" value={f.lines} onChange={(e) => set('lines', e.target.value)} placeholder={'H5; TEST-1001; Testvare A\nFL; TEST-2001; Testvare C'} />
          <span className="help">Én linje pr. vare: lagersted (H5 eller FL); varenummer; tekst. Har ordren både H5 og FL, bliver den en delt ordre.</span>
        </div>
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={onClose}>
            Annullér
          </button>
          <button className="btn primary">Gem</button>
        </div>
      </form>
    </Sheet>
  );
}

function parseLines(text: string): Array<{ site: 'H5' | 'FL'; itemNumber: string; description: string }> {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const [site = '', itemNumber = '', ...rest] = l.split(';').map((x) => x.trim());
      const code = site.toUpperCase();
      if (code !== 'H5' && code !== 'FL') throw new Error(`Varelinje ${i + 1}: lagersted skal være H5 eller FL.`);
      return { site: code, itemNumber, description: rest.join('; ') };
    });
}

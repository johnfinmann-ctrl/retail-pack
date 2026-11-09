/**
 * Historik: find tidligere registreringer på plukrute, salgsordre, palle-ID,
 * modtager eller kæde. Data ligger lokalt og overlever genindlæsning.
 */
import { useState } from 'react';

import { Loading, useAsync } from '../../ui/common';
import type { PalletStatus } from '../domain/types';
import { getV5 } from '../services';

import { STATUS_LABEL } from './PalletScreen';
import { PalletRow } from './PickrouteFlow';

type Filter = PalletStatus | 'all';

export function History({ onOpen }: { onOpen: (routeId: string, palletId: string) => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data } = useAsync(() => getV5().registrations.history({ query: q, status: filter }), [q, filter]);

  return (
    <>
      <h1>Historik</h1>
      <div className="field">
        <label htmlFor="hist-q" className="sr">
          Søg
        </label>
        <input id="hist-q" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Plukrute, salgsordre, palle-ID eller modtager" />
      </div>
      <div className="filters" role="group" aria-label="Status">
        {(['all', 'approved', 'deviation', 'in_progress'] as Filter[]).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Alle' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <p className="muted">Ingen registreringer matcher.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((row) => (
            <div key={row.pallet.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="small muted num">
                Plukrute {row.pickroute.routeNumber} · SO {row.pickroute.salesOrder} · {row.pickroute.recipientName} · {row.chainName}
              </span>
              <PalletRow p={row.pallet} photoCount={row.photoCount} onOpen={() => onOpen(row.pickroute.id, row.pallet.id)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Test-pluklister: efterligner opbygningen af en plukliste med plukrutens
 * stregkode øverst og parti-ID'er nedenfor. TESTDATA — ikke udskrevet fra AX.
 */
import { Barcode } from '../TestCodes';
import { useAsync } from '../ui/common';

import { getV5 } from './services';

export function TestCodesV5() {
  const { data } = useAsync(async () => {
    const s = getV5();
    const [routes, chains] = await Promise.all([s.registrations.listPickroutes(), s.rules.listChains()]);
    return routes.map((r) => ({ r, chain: chains.find((c) => c.id === r.chainId)?.name ?? '' }));
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p className="muted">
        Vis listerne på en anden skærm og scan dem. Øverst er plukruten. Parti-ID'erne nedenfor må ikke åbne en ordre — prøv at scanne dem.
      </p>
      <div className="codes">
        {(data ?? []).map(({ r, chain }) => (
          <div className="picklist" key={r.id}>
            <span className="stamp">TESTDATA — IKKE EN AX-PLUKLISTE</span>
            <div className="top">
              <span className="small">Plukrute</span>
              <Barcode value={r.routeNumber} format="CODE128" />
            </div>
            <div className="meta">
              <span>Salgsordre</span>
              <strong>{r.salesOrder}</strong>
              <span>Modtager</span>
              <strong>{r.recipientName}</strong>
              <span>Kæde</span>
              <strong>{chain}</strong>
            </div>
            <div className="batches">
              {r.demoBatchIds.map((b) => (
                <div className="batch" key={b}>
                  <span>Parti</span>
                  <Barcode value={b} format="CODE128" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Pallevejledning uden ordre: Kæde → (format) → modtagelager → gældende krav.
 */
import { useEffect, useState } from 'react';

import { Loading, Monogram, useAsync } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { CONFIG } from '../domain/config';
import type { Chain, ChainFormat, Warehouse } from '../domain/types';
import { getV5 } from '../services';

import { RequirementsView } from './RequirementsView';

type Step =
  | { s: 'chain' }
  | { s: 'target'; chain: Chain }
  | { s: 'view'; chain: Chain; format: ChainFormat | null; warehouse: Warehouse | null };

export function GuideLookup({ setBack }: { setBack: (fn: (() => void) | null) => void }) {
  const [step, setStep] = useState<Step>({ s: 'chain' });

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (step.s === 'target') setBack(() => setStep({ s: 'chain' }));
    else if (step.s === 'view') setBack(() => setStep({ s: 'target', chain: step.chain }));
    else setBack(null);
  }, [step, setBack]);

  if (step.s === 'chain') return <ChainPicker onPick={(chain) => setStep({ s: 'target', chain })} />;
  if (step.s === 'target')
    return <TargetPicker chain={step.chain} onPick={(format, warehouse) => setStep({ s: 'view', chain: step.chain, format, warehouse })} />;
  return <ResolvedView chainId={step.chain.id} formatId={step.format?.id ?? null} warehouseId={step.warehouse?.id ?? null} />;
}

export function ChainPicker({ onPick }: { onPick: (c: Chain) => void }) {
  const { data } = useAsync(async () => {
    const s = getV5().rules;
    const chains = await s.listChains();
    const sets = await s.listRuleSets();
    return chains.map((c) => ({ c, hasRules: sets.some((r) => r.scope.chainId === c.id && r.status === 'approved') }));
  }, []);
  if (!data) return <Loading />;
  return (
    <>
      <h1>Vælg detailkæde</h1>
      <div className="choice-list">
        {data.map(({ c, hasRules }) => (
          <button key={c.id} className="choice" onClick={() => onPick(c)}>
            <Monogram name={c.name} />
            <span className="grow">
              <span className="title">{c.name}</span>
              <span className="sub">{hasRules ? 'Godkendte krav findes' : CONFIG.awaitingText}</span>
            </span>
            {c.isTest && <span className="pill test">Testdata</span>}
            <span className="chev">
              <Icon name="chev" />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function TargetPicker({ chain, onPick }: { chain: Chain; onPick: (f: ChainFormat | null, w: Warehouse | null) => void }) {
  const { data } = useAsync(async () => {
    const s = getV5().rules;
    const [formats, warehouses] = await Promise.all([s.listFormats(chain.id), s.listWarehouses(chain.id)]);
    return { formats, warehouses };
  }, [chain.id]);
  if (!data) return <Loading />;
  const formatName = (id: string | null) => data.formats.find((f) => f.id === id)?.name;
  return (
    <>
      <div>
        <span className="eyebrow">{chain.name}</span>
        <h1>Vælg modtagelager</h1>
      </div>
      <div className="choice-list">
        {data.warehouses.map((w) => (
          <button key={w.id} className="choice" onClick={() => onPick(data.formats.find((f) => f.id === w.formatId) ?? null, w)}>
            <span className="monogram" aria-hidden="true">
              <Icon name="customers" />
            </span>
            <span className="grow">
              <span className="title">{w.name}</span>
              {w.formatId && <span className="sub">{formatName(w.formatId)}</span>}
            </span>
            <span className="chev">
              <Icon name="chev" />
            </span>
          </button>
        ))}
        {data.formats.map((f) => (
          <button key={f.id} className="choice" onClick={() => onPick(f, null)}>
            <span className="monogram" aria-hidden="true" style={{ background: 'var(--navy-2)' }}>
              <Icon name="grid" />
            </span>
            <span className="grow">
              <span className="title">{f.name} — fælles krav</span>
              <span className="sub">Uden bestemt modtagelager</span>
            </span>
          </button>
        ))}
        <button className="choice" onClick={() => onPick(null, null)}>
          <span className="monogram" aria-hidden="true" style={{ background: 'var(--ink-3)' }}>
            <Icon name="home" />
          </span>
          <span className="grow">
            <span className="title">{chain.name} — generelle krav</span>
            <span className="sub">Gælder hele kæden</span>
          </span>
        </button>
      </div>
    </>
  );
}

export function ResolvedView({ chainId, formatId, warehouseId }: { chainId: string; formatId: string | null; warehouseId: string | null }) {
  const { data } = useAsync(async () => {
    const s = getV5().rules;
    const [r, documents] = await Promise.all([s.resolve({ chainId, formatId, warehouseId }), s.listDocuments()]);
    return { r, documents };
  }, [chainId, formatId, warehouseId]);
  if (!data) return <Loading />;
  return <RequirementsView r={data.r} documents={data.documents} />;
}

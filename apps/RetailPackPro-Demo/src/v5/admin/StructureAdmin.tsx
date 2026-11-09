/**
 * Kæder, kædeformater og modtagelagre.
 */
import { useState } from 'react';

import { errorText, Loading, Sheet, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import type { DemoUserV5 } from '../domain/store';
import type { Chain } from '../domain/types';
import { getV5 } from '../services';

type Edit =
  | { kind: 'chain'; id?: string; name: string }
  | { kind: 'format'; id?: string; chainId: string; name: string }
  | { kind: 'warehouse'; id?: string; chainId: string; formatId: string | null; name: string };

export function StructureAdmin({ user }: { user: DemoUserV5 }) {
  const toast = useToast();
  const [v, setV] = useState(0);
  const [edit, setEdit] = useState<Edit | null>(null);
  const canEdit = user.role === 'regelansvarlig';
  const { data } = useAsync(async () => {
    const s = getV5().rules;
    const chains = await s.listChains();
    return Promise.all(chains.map(async (c: Chain) => ({ c, formats: await s.listFormats(c.id), warehouses: await s.listWarehouses(c.id) })));
  }, [v]);

  async function save() {
    if (!edit) return;
    try {
      const s = getV5().rules;
      if (edit.kind === 'chain') await s.saveChain(edit);
      else if (edit.kind === 'format') await s.saveFormat(edit);
      else await s.saveWarehouse(edit);
      toast('Gemt');
      setEdit(null);
      setV((x) => x + 1);
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  if (!data) return <Loading />;
  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Kæder & modtagelagre</h1>
        {canEdit && (
          <button className="btn primary" onClick={() => setEdit({ kind: 'chain', name: '' })}>
            <Icon name="plus" /> Ny kæde
          </button>
        )}
      </div>
      {data.map(({ c, formats, warehouses }) => (
        <section className="panel" key={c.id}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ flex: 1 }}>{c.name}</h2>
            {c.isTest && <span className="pill test">Testdata</span>}
            {canEdit && !c.isTest && (
              <button className="btn ghost small" onClick={() => setEdit({ kind: 'chain', id: c.id, name: c.name })}>
                <Icon name="edit" size={18} /> Omdøb
              </button>
            )}
          </div>
          <div className="small muted">Formater: {formats.length ? formats.map((f) => f.name).join(', ') : 'ingen'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {warehouses.map((w) => (
              <div className="pallet-card" key={w.id}>
                <div className="grow">
                  <strong>{w.name}</strong>
                  <div className="small muted">{formats.find((f) => f.id === w.formatId)?.name ?? 'Uden format'}</div>
                </div>
                {canEdit && (
                  <button className="btn ghost small" onClick={() => setEdit({ kind: 'warehouse', id: w.id, chainId: c.id, formatId: w.formatId, name: w.name })}>
                    <Icon name="edit" size={18} />
                  </button>
                )}
              </div>
            ))}
            {warehouses.length === 0 && <p className="small muted">Ingen modtagelagre registreret.</p>}
          </div>
          {canEdit && (
            <div className="btn-row">
              <button className="btn ghost small" style={{ flex: '0 0 auto' }} onClick={() => setEdit({ kind: 'format', chainId: c.id, name: '' })}>
                <Icon name="plus" size={18} /> Format
              </button>
              <button className="btn ghost small" style={{ flex: '0 0 auto' }} onClick={() => setEdit({ kind: 'warehouse', chainId: c.id, formatId: null, name: '' })}>
                <Icon name="plus" size={18} /> Modtagelager
              </button>
            </div>
          )}
        </section>
      ))}
      {edit && (
        <Sheet title={{ chain: 'Kæde', format: 'Kædeformat', warehouse: 'Modtagelager' }[edit.kind]} onClose={() => setEdit(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="field">
              <label htmlFor="st-name">Navn</label>
              <input id="st-name" type="text" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            {edit.kind === 'warehouse' && (
              <div className="field">
                <label htmlFor="st-format">Kædeformat</label>
                <select id="st-format" value={edit.formatId ?? ''} onChange={(e) => setEdit({ ...edit, formatId: e.target.value || null })}>
                  <option value="">Uden format</option>
                  {data
                    .find((d) => d.c.id === edit.chainId)
                    ?.formats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="btn-row">
              <button type="button" className="btn ghost" onClick={() => setEdit(null)}>
                Annullér
              </button>
              <button className="btn primary">Gem</button>
            </div>
          </form>
        </Sheet>
      )}
    </>
  );
}

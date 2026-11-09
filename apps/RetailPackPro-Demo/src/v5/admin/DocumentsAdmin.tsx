/**
 * Officielle vejledninger: upload (PDF/billede), version og gyldighed.
 * Filerne gemmes lokalt i browseren (IndexedDB).
 */
import { useState } from 'react';

import { formatDate } from '../../i18n';
import { errorText, Loading, Sheet, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { CONFIG } from '../domain/config';
import { documentValidOn, today } from '../domain/RuleResolver';
import type { DemoUserV5 } from '../domain/store';
import type { SourceDocument } from '../domain/types';
import { getV5 } from '../services';

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    let done = false;
    const finish = (f: File | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(f);
    };
    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

const MAX_FILE = 15 * 1024 * 1024;

export function DocumentsAdmin({ user }: { user: DemoUserV5 }) {
  const toast = useToast();
  const [v, setV] = useState(0);
  const [editing, setEditing] = useState<SourceDocument | 'new' | null>(null);
  const { data } = useAsync(async () => {
    const s = getV5();
    const [chains, docs, rules] = await Promise.all([s.rules.listChains(), s.rules.listDocuments(), s.rules.listRuleSets()]);
    const usage = (docId: string) => rules.filter((r) => Object.values(r.fields).some((f) => f?.sourceDocId === docId)).length;
    return { chains, docs, usage };
  }, [v]);

  async function openFile(doc: SourceDocument) {
    if (!doc.fileId) return;
    const blob = await getV5().store.blobs.get(doc.fileId);
    if (!blob) {
      toast('Filen findes ikke længere i browserens lager.', 'err');
      return;
    }
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener');
    if (!w) toast('Browseren tillod ikke at åbne filen i en ny fane her. Den er gemt og kan åbnes i den selvstændige HTML-version.', 'err');
  }

  if (!data) return <Loading />;
  const day = today();
  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Officielle vejledninger</h1>
        {user.role === 'regelansvarlig' && (
          <button className="btn primary" onClick={() => setEditing('new')}>
            <Icon name="plus" /> Ny vejledning
          </button>
        )}
      </div>
      {data.chains.map((c) => {
        const docs = data.docs.filter((d) => d.chainId === c.id);
        return (
          <section className="panel" key={c.id}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <h2 style={{ flex: 1 }}>{c.name}</h2>
              {c.isTest && <span className="pill test">Testdata</span>}
            </div>
            {docs.length === 0 ? (
              <p className="muted">{CONFIG.awaitingText}.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {docs.map((d) => {
                  const valid = documentValidOn(d, day);
                  return (
                    <div className="pallet-card" key={d.id}>
                      <span className="pallet-no" style={{ background: 'var(--info-soft)', color: 'var(--navy)' }}>
                        <Icon name="order" />
                      </span>
                      <div className="grow">
                        <strong>
                          {d.title} · v{d.docVersion}
                        </strong>
                        <div className="small muted">
                          Gyldig fra {formatDate(d.validFrom)}
                          {d.validTo ? ` til ${formatDate(d.validTo)}` : ''} · brugt i {data.usage(d.id)} regelsæt
                          {d.fileName ? ` · ${d.fileName}` : ' · ingen fil vedhæftet'}
                        </div>
                      </div>
                      <span className={`pill ${valid ? 'go' : 'stop'}`}>{valid ? 'Gyldig' : 'Ikke gyldig i dag'}</span>
                      {d.fileId && (
                        <button className="btn ghost small" onClick={() => void openFile(d)}>
                          Åbn
                        </button>
                      )}
                      {user.role === 'regelansvarlig' && (
                        <button className="btn ghost small" onClick={() => setEditing(d)}>
                          <Icon name="edit" size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      {editing && (
        <DocForm
          user={user}
          doc={editing === 'new' ? null : editing}
          chains={data.chains}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setV((x) => x + 1);
          }}
        />
      )}
    </>
  );
}

function DocForm({
  user,
  doc,
  chains,
  onClose,
  onSaved,
}: {
  user: DemoUserV5;
  doc: SourceDocument | null;
  chains: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [chainId, setChainId] = useState(doc?.chainId ?? '');
  const [title, setTitle] = useState(doc?.title ?? '');
  const [docVersion, setDocVersion] = useState(doc?.docVersion ?? '');
  const [validFrom, setValidFrom] = useState(doc?.validFrom ?? today());
  const [validTo, setValidTo] = useState(doc?.validTo ?? '');
  const [file, setFile] = useState<File | null>(null);

  return (
    <Sheet title={doc ? 'Redigér vejledning' : 'Ny officiel vejledning'} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await getV5().rules.saveDocument(
              { id: doc?.id, chainId, title, docVersion, validFrom, validTo: validTo || null, file: file ? { data: file, name: file.name, type: file.type } : null },
              user,
            );
            toast('Vejledningen er gemt');
            onSaved();
          } catch (err) {
            toast(errorText(err), 'err');
          }
        }}
      >
        <div className="field">
          <label htmlFor="d-chain">Detailkæde</label>
          <select id="d-chain" value={chainId} disabled={!!doc} onChange={(e) => setChainId(e.target.value)} required>
            <option value="">Vælg …</option>
            {chains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d-title">Titel (som på dokumentet)</label>
          <input id="d-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="d-ver">Dokumentversion</label>
            <input id="d-ver" type="text" value={docVersion} onChange={(e) => setDocVersion(e.target.value)} placeholder="Fx 3.1" />
          </div>
          <div className="field">
            <span className="label">Fil (PDF eller billede)</span>
            <button
              type="button"
              className="btn secondary small"
              onClick={() =>
                void pickFile('application/pdf,image/*').then((f) => {
                  if (!f) return;
                  if (f.size > MAX_FILE) toast('Filen er større end 15 MB.', 'err');
                  else setFile(f);
                })
              }
            >
              <Icon name="plus" size={18} /> {file ? file.name : doc?.fileName ? `Udskift (${doc.fileName})` : 'Vælg fil'}
            </button>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="d-from">Gyldig fra</label>
            <input id="d-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} style={{ minHeight: 52, border: '2px solid var(--line-strong)', borderRadius: 10, padding: '0 12px' }} />
          </div>
          <div className="field">
            <label htmlFor="d-to">Gyldig til (valgfri)</label>
            <input id="d-to" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} style={{ minHeight: 52, border: '2px solid var(--line-strong)', borderRadius: 10, padding: '0 12px' }} />
          </div>
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

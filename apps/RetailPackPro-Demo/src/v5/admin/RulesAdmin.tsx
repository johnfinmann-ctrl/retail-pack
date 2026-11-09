/**
 * Pakkekrav i admin: regelsæt pr. kæde/format/lager med kilde pr. felt,
 * arbejdsgang Udkast → Afventer kontrol → Godkendt til visning → Udgået,
 * forhåndsvisning og versionshistorik.
 */
import { useState } from 'react';

import { formatDate } from '../../i18n';
import { errorText, Loading, Sheet, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { Img, LOCAL_IMAGE_PREFIX, pickImageFile, storeUploadedImage } from '../../ui/media';
import { FIELD_DEFS, GROUP_LABELS } from '../domain/fields';
import type { DemoUserV5 } from '../domain/store';
import type { Chain, ChainFormat, RuleField, RuleFieldKey, RuleLevel, RuleSet, RuleStatus, SourceDocument, Warehouse } from '../domain/types';
import { RequirementsView } from '../employee/RequirementsView';
import { getV5 } from '../services';

export const RULE_STATUS: Record<RuleStatus, string> = {
  draft: 'Udkast',
  pending_review: 'Afventer kontrol',
  approved: 'Godkendt til visning',
  retired: 'Udgået',
};
const STATUS_PILL: Record<RuleStatus, string> = { draft: 'neutral', pending_review: 'draft', approved: 'go', retired: 'stop' };
const LEVEL: Record<RuleLevel, string> = { chain: 'Kæde', format: 'Format', warehouse: 'Modtagelager' };

interface Lookups {
  chains: Chain[];
  formats: ChainFormat[];
  warehouses: Warehouse[];
  documents: SourceDocument[];
}

async function loadLookups(): Promise<Lookups> {
  const s = getV5().store;
  const [chains, formats, warehouses, documents] = await Promise.all([s.list('chains'), s.list('formats'), s.list('warehouses'), s.list('documents')]);
  return { chains, formats, warehouses, documents };
}

export function scopeLabel(rs: RuleSet, l: Lookups): string {
  const chain = l.chains.find((c) => c.id === rs.scope.chainId)?.name ?? '';
  if (rs.scope.level === 'chain') return `${chain} · hele kæden`;
  if (rs.scope.level === 'format') return `${chain} · ${l.formats.find((f) => f.id === rs.scope.formatId)?.name ?? ''}`;
  return `${chain} · ${l.warehouses.find((w) => w.id === rs.scope.warehouseId)?.name ?? ''}`;
}

export function RulesAdmin({ user, openId, setOpenId }: { user: DemoUserV5; openId: string | null; setOpenId: (id: string | null) => void }) {
  const [creating, setCreating] = useState(false);
  const [v, setV] = useState(0);
  const { data } = useAsync(async () => ({ lookups: await loadLookups(), current: await getV5().rules.listCurrent() }), [v, openId]);

  if (openId) return <RuleEditor user={user} id={openId} onClose={() => { setOpenId(null); setV((x) => x + 1); }} onOpen={setOpenId} />;
  if (!data) return <Loading />;
  const byChain = data.lookups.chains.map((c) => ({ c, sets: data.current.filter((r) => r.scope.chainId === c.id) }));

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Pakkekrav</h1>
        {user.role === 'regelansvarlig' && (
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Icon name="plus" /> Nyt regelsæt
          </button>
        )}
      </div>
      {byChain.map(({ c, sets }) => (
        <section key={c.id} className="panel">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ flex: 1 }}>{c.name}</h2>
            {c.isTest && <span className="pill test">Testdata</span>}
          </div>
          {sets.length === 0 ? (
            <p className="muted">Afventer officiel vejledning — ingen regelsæt endnu.</p>
          ) : (
            <div className="choice-list">
              {sets.map((r) => (
                <button key={r.id} className="choice" onClick={() => setOpenId(r.id)}>
                  <span className="grow">
                    <span className="title">
                      {r.title} · v{r.version}
                    </span>
                    <span className="sub">
                      {LEVEL[r.scope.level]} · {scopeLabel(r, data.lookups)}
                    </span>
                  </span>
                  <span className={`pill ${STATUS_PILL[r.status]}`}>{RULE_STATUS[r.status]}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
      {creating && (
        <CreateRuleSheet
          user={user}
          lookups={data.lookups}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenId(id);
          }}
        />
      )}
    </>
  );
}

function CreateRuleSheet({ user, lookups, onClose, onCreated }: { user: DemoUserV5; lookups: Lookups; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast();
  const [chainId, setChainId] = useState('');
  const [level, setLevel] = useState<RuleLevel>('chain');
  const [formatId, setFormatId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [title, setTitle] = useState('');
  const formats = lookups.formats.filter((f) => f.chainId === chainId);
  const warehouses = lookups.warehouses.filter((w) => w.chainId === chainId);
  return (
    <Sheet title="Nyt regelsæt" onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const rs = await getV5().rules.createDraft(
              { scope: { level, chainId, formatId: level === 'format' ? formatId || null : level === 'warehouse' ? (warehouses.find((w) => w.id === warehouseId)?.formatId ?? null) : null, warehouseId: level === 'warehouse' ? warehouseId || null : null }, title },
              user,
            );
            onCreated(rs.id);
          } catch (err) {
            toast(errorText(err), 'err');
          }
        }}
      >
        <div className="field">
          <label htmlFor="nr-chain">Detailkæde</label>
          <select id="nr-chain" value={chainId} onChange={(e) => setChainId(e.target.value)} required>
            <option value="">Vælg …</option>
            {lookups.chains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="label">Gælder for</span>
          <div className="seg" role="group">
            {(['chain', 'format', 'warehouse'] as RuleLevel[]).map((l) => (
              <button type="button" key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>
                {LEVEL[l]}
              </button>
            ))}
          </div>
        </div>
        {level === 'format' && (
          <div className="field">
            <label htmlFor="nr-format">Kædeformat</label>
            <select id="nr-format" value={formatId} onChange={(e) => setFormatId(e.target.value)}>
              <option value="">Vælg …</option>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {level === 'warehouse' && (
          <div className="field">
            <label htmlFor="nr-wh">Modtagelager</label>
            <select id="nr-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Vælg …</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="nr-title">Navn</label>
          <input id="nr-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fx Netto Køge – lokale krav" />
        </div>
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={onClose}>
            Annullér
          </button>
          <button className="btn primary">Opret udkast</button>
        </div>
      </form>
    </Sheet>
  );
}

const emptyField = (key: RuleFieldKey): RuleField => ({
  value: '',
  sourceDocId: null,
  sourceRef: '',
  unclear: false,
  checkpoint: FIELD_DEFS.find((d) => d.key === key)?.defaultCheckpoint ?? true,
});

function RuleEditor({ user, id, onClose, onOpen }: { user: DemoUserV5; id: string; onClose: () => void; onOpen: (id: string) => void }) {
  const toast = useToast();
  const [v, setV] = useState(0);
  const { data } = useAsync(async () => {
    const s = getV5();
    const rs = await s.store.get('ruleSets', id);
    if (!rs) throw new Error('Regelsættet findes ikke');
    const [lookups, history, problems] = await Promise.all([loadLookups(), s.rules.history(rs.lineageId), s.rules.validateForReview(rs)]);
    return { rs, lookups, history, problems };
  }, [id, v]);
  const [form, setForm] = useState<RuleSet | null>(null);
  const [dialog, setDialog] = useState<null | 'submit' | 'approve' | 'reject' | 'retire' | 'preview'>(null);
  const [note, setNote] = useState('');

  if (!data) return <Loading />;
  const rs = form && form.id === data.rs.id ? form : data.rs;
  const editable = user.role === 'regelansvarlig' && rs.status === 'draft';
  const docs = data.lookups.documents.filter((d) => d.chainId === rs.scope.chainId);
  const setField = (key: RuleFieldKey, patch: Partial<RuleField>) =>
    setForm({ ...rs, fields: { ...rs.fields, [key]: { ...(rs.fields[key] ?? emptyField(key)), ...patch } } });
  const dirty = form !== null && form.id === data.rs.id && JSON.stringify(form) !== JSON.stringify(data.rs);
  const refresh = () => {
    setForm(null);
    setV((x) => x + 1);
  };

  async function save(silent = false): Promise<boolean> {
    try {
      await getV5().rules.updateDraft(rs.id, { title: rs.title, fields: rs.fields, requiredFields: rs.requiredFields, referenceImage: rs.referenceImage }, user);
      if (!silent) toast('Udkastet er gemt — det vises ikke for medarbejderne');
      refresh();
      return true;
    } catch (e) {
      toast(errorText(e), 'err');
      return false;
    }
  }

  async function act(run: () => Promise<unknown>, message: string) {
    try {
      await run();
      toast(message);
      setDialog(null);
      setNote('');
      refresh();
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  async function uploadImage() {
    const files = await pickImageFile({ capture: true });
    if (!files[0]) return;
    try {
      const url = await storeUploadedImage(files[0], 1800);
      setForm({ ...rs, referenceImage: { fileId: url.slice(LOCAL_IMAGE_PREFIX.length), kind: 'reference', caption: '', sourceDocId: null, sourceRef: '' } });
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  const groups = [...new Set(FIELD_DEFS.map((d) => d.group))];

  return (
    <>
      <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={onClose}>
        <Icon name="back" size={18} /> Alle pakkekrav
      </button>
      <div>
        <span className="eyebrow">
          {LEVEL[rs.scope.level]} · {scopeLabel(rs, data.lookups)}
        </span>
        {editable ? (
          <div className="field" style={{ marginTop: 6 }}>
            <label htmlFor="rs-title" className="sr">
              Navn
            </label>
            <input id="rs-title" type="text" value={rs.title} onChange={(e) => setForm({ ...rs, title: e.target.value })} />
          </div>
        ) : (
          <h1>{rs.title}</h1>
        )}
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span className={`pill ${STATUS_PILL[rs.status]}`}>
            {RULE_STATUS[rs.status]} · v{rs.version}
          </span>
          {rs.isTest && <span className="pill test">Testdata</span>}
          {rs.changeSummary && <span className="pill neutral">{rs.changeSummary}</span>}
        </p>
        {rs.reviewNote && (
          <div className={`notice ${rs.status === 'draft' ? 'err' : 'info'}`} style={{ marginTop: 10 }}>
            <Icon name="info" />
            <div className="grow">
              <strong>Kontrollantens bemærkning</strong>
              <span>{rs.reviewNote}</span>
            </div>
          </div>
        )}
      </div>

      {!editable && rs.status === 'draft' && <p className="muted">Udkast — kun regelansvarlig kan redigere.</p>}
      {rs.status === 'pending_review' && user.role === 'regelansvarlig' && (
        <div className="notice info">
          <Icon name="info" />
          <div className="grow">Afventer kontrol. Regelsættet vises ikke for medarbejderne, før en kontrollant har godkendt det.</div>
        </div>
      )}

      <section className="panel">
        <h2>Obligatoriske felter</h2>
        <p className="small muted">Sæt kun felter som obligatoriske, når den officielle vejledning kræver dem. Mangler et obligatorisk krav, får medarbejderen en afklaringsbesked.</p>
        <div className="checks">
          {FIELD_DEFS.map((d) => {
            const on = rs.requiredFields.includes(d.key);
            return (
              <label key={d.key} className={`check${on ? ' on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!editable}
                  onChange={(e) => setForm({ ...rs, requiredFields: e.target.checked ? [...rs.requiredFields, d.key] : rs.requiredFields.filter((k) => k !== d.key) })}
                />
                {d.label}
              </label>
            );
          })}
        </div>
      </section>

      {groups.map((g) => (
        <section className="panel" key={g}>
          <h2>{GROUP_LABELS[g]}</h2>
          <div>
            {FIELD_DEFS.filter((d) => d.group === g).map((d) => {
              const f = rs.fields[d.key] ?? emptyField(d.key);
              return (
                <div className="field-row" key={d.key}>
                  <div>
                    <label htmlFor={`f-${d.key}`} style={{ fontWeight: 700 }}>
                      {d.label}
                      {d.unit ? ` (${d.unit})` : ''}
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                    <div className="field">
                      {d.kind === 'number' ? (
                        <input id={`f-${d.key}`} type="text" inputMode="decimal" value={f.value} disabled={!editable} onChange={(e) => setField(d.key, { value: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="Ikke angivet" />
                      ) : (
                        <input id={`f-${d.key}`} type="text" value={f.value} disabled={!editable} onChange={(e) => setField(d.key, { value: e.target.value })} placeholder="Ikke angivet" />
                      )}
                    </div>
                    {(f.value.trim() || f.unclear || editable) && (
                      <div className="meta-row">
                        <select aria-label={`${d.label}: kildedokument`} value={f.sourceDocId ?? ''} disabled={!editable} onChange={(e) => setField(d.key, { sourceDocId: e.target.value || null })}>
                          <option value="">Kildedokument …</option>
                          {docs.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.title} v{doc.docVersion}
                            </option>
                          ))}
                        </select>
                        <input type="text" aria-label={`${d.label}: afsnit eller side`} placeholder="Afsnit / side" value={f.sourceRef} disabled={!editable} onChange={(e) => setField(d.key, { sourceRef: e.target.value })} style={{ width: 160 }} />
                        <label>
                          <input type="checkbox" checked={f.unclear} disabled={!editable} onChange={(e) => setField(d.key, { unclear: e.target.checked })} /> Uklart i kilden
                        </label>
                        <label>
                          <input type="checkbox" checked={f.checkpoint} disabled={!editable} onChange={(e) => setField(d.key, { checkpoint: e.target.checked })} /> Kontrolpunkt
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="panel">
        <h2>Referencebillede</h2>
        {rs.referenceImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="upload-row">
              <Img src={LOCAL_IMAGE_PREFIX + rs.referenceImage.fileId} alt="" style={{ width: 180, height: 135 }} />
            </div>
            <div className="meta-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select aria-label="Billedtype" value={rs.referenceImage.kind} disabled={!editable} onChange={(e) => setForm({ ...rs, referenceImage: { ...rs.referenceImage!, kind: e.target.value as 'reference' | 'illustration' } })} style={{ minHeight: 44 }}>
                <option value="reference">Reference fra officiel vejledning</option>
                <option value="illustration">Illustration (ikke dokumentation)</option>
              </select>
              <input type="text" aria-label="Billedtekst" placeholder="Billedtekst" value={rs.referenceImage.caption} disabled={!editable} onChange={(e) => setForm({ ...rs, referenceImage: { ...rs.referenceImage!, caption: e.target.value } })} style={{ minHeight: 44 }} />
              <select aria-label="Billedets kildedokument" value={rs.referenceImage.sourceDocId ?? ''} disabled={!editable} onChange={(e) => setForm({ ...rs, referenceImage: { ...rs.referenceImage!, sourceDocId: e.target.value || null } })} style={{ minHeight: 44 }}>
                <option value="">Kildedokument …</option>
                {docs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} v{doc.docVersion}
                  </option>
                ))}
              </select>
              <input type="text" aria-label="Billedets side" placeholder="Side" value={rs.referenceImage.sourceRef} disabled={!editable} onChange={(e) => setForm({ ...rs, referenceImage: { ...rs.referenceImage!, sourceRef: e.target.value } })} style={{ minHeight: 44, width: 120 }} />
              {editable && (
                <button className="btn ghost small" onClick={() => setForm({ ...rs, referenceImage: null })}>
                  Fjern
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="muted">Intet referencebillede.</p>
        )}
        {editable && (
          <button className="btn secondary small" style={{ alignSelf: 'flex-start' }} onClick={() => void uploadImage()}>
            <Icon name="image" size={18} /> {rs.referenceImage ? 'Udskift billede' : 'Tilføj billede'}
          </button>
        )}
      </section>

      {editable && data.problems.length > 0 && !dirty && (
        <div className="notice warn">
          <Icon name="warn" />
          <div className="grow">
            <strong>Før regelsættet kan sendes til kontrol</strong>
            {data.problems.map((p) => (
              <span key={p} className="small">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="sticky-actions">
        <div className="btn-row">
          <button className="btn ghost" onClick={() => setDialog('preview')}>
            <Icon name="eye" /> Forhåndsvis
          </button>
          {editable && (
            <>
              <button className="btn secondary" onClick={() => void save()}>
                Gem udkast
              </button>
              <button
                className="btn go"
                onClick={async () => {
                  if (dirty && !(await save(true))) return;
                  setDialog('submit');
                }}
              >
                Send til kontrol
              </button>
            </>
          )}
          {user.role === 'regelansvarlig' && (rs.status === 'approved' || rs.status === 'retired') && !data.history.some((h) => h.status === 'draft' || h.status === 'pending_review') && (
            <button className="btn primary" onClick={() => void act(async () => onOpen((await getV5().rules.newVersion(rs.id, user)).id), 'Ny version oprettet som udkast')}>
              <Icon name="edit" /> Ny version
            </button>
          )}
          {user.role === 'kontrollant' && rs.status === 'pending_review' && (
            <>
              <button className="btn go" onClick={() => setDialog('approve')}>
                <Icon name="check" /> Godkend og publicér
              </button>
              <button className="btn danger" onClick={() => setDialog('reject')}>
                Send retur
              </button>
            </>
          )}
          {user.role === 'kontrollant' && rs.status === 'approved' && (
            <button className="btn danger" onClick={() => setDialog('retire')}>
              Sæt til udgået
            </button>
          )}
        </div>
      </div>

      <section className="panel">
        <h2>Versionshistorik</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.history.map((h) => (
            <button key={h.id} className="version" style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }} onClick={() => h.id !== rs.id && onOpen(h.id)} aria-current={h.id === rs.id ? 'true' : undefined}>
              <span className="vno">v{h.version}</span>
              <span className="grow">
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`pill ${STATUS_PILL[h.status]}`}>{RULE_STATUS[h.status]}</span>
                  {h.id === rs.id && <span className="pill info">Vises nu</span>}
                </span>
                <span className="small">{h.changeSummary ?? '—'}</span>
                <span className="small muted">
                  Udarbejdet af {getV5().store.userName(h.createdBy)}
                  {h.reviewedBy && h.reviewedAt && ` · kontrolleret af ${getV5().store.userName(h.reviewedBy)} ${formatDate(h.reviewedAt)}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {dialog === 'preview' && <PreviewSheet rs={rs} lookups={data.lookups} onClose={() => setDialog(null)} />}
      {(dialog === 'submit' || dialog === 'approve' || dialog === 'reject' || dialog === 'retire') && (
        <Sheet
          title={{ submit: 'Send til kontrol', approve: 'Godkend og publicér', reject: 'Send retur til regelansvarlig', retire: 'Sæt regelsættet til udgået' }[dialog]}
          onClose={() => setDialog(null)}
        >
          <p className="muted">
            {
              {
                submit: 'En kontrollant skal godkende regelsættet, før det vises for medarbejderne.',
                approve: 'Regelsættet bliver gældende for medarbejderne med det samme. En tidligere version sættes til udgået og bevares i historikken.',
                reject: 'Udkastet sendes tilbage med din begrundelse.',
                retire: 'Kravene vises ikke længere for medarbejderne.',
              }[dialog]
            }
          </p>
          <div className="field">
            <label htmlFor="wf-note">{dialog === 'submit' ? 'Hvad er ændret?' : dialog === 'approve' ? 'Bemærkning (valgfri)' : 'Begrundelse'}</label>
            <input id="wf-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setDialog(null)}>
              Annullér
            </button>
            <button
              className={`btn ${dialog === 'approve' || dialog === 'submit' ? 'go' : 'danger'}`}
              onClick={() =>
                void act(
                  () =>
                    dialog === 'submit'
                      ? getV5().rules.submitForReview(rs.id, note, user)
                      : dialog === 'approve'
                        ? getV5().rules.approveAndPublish(rs.id, note, user)
                        : dialog === 'reject'
                          ? getV5().rules.reject(rs.id, note, user)
                          : getV5().rules.retire(rs.id, note, user),
                  { submit: 'Sendt til kontrol', approve: `Version ${rs.version} er publiceret`, reject: 'Sendt retur', retire: 'Regelsættet er udgået' }[dialog],
                )
              }
            >
              {{ submit: 'Send til kontrol', approve: 'Godkend og publicér', reject: 'Send retur', retire: 'Sæt til udgået' }[dialog]}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Vis medarbejderens skærm for et modtagelager — med dette regelsæt, som om det var publiceret. */
function PreviewSheet({ rs, lookups, onClose }: { rs: RuleSet; lookups: Lookups; onClose: () => void }) {
  const targets = lookups.warehouses.filter(
    (w) => w.chainId === rs.scope.chainId && (rs.scope.level === 'chain' || (rs.scope.level === 'format' && w.formatId === rs.scope.formatId) || w.id === rs.scope.warehouseId),
  );
  const [target, setTarget] = useState<string>(rs.scope.warehouseId ?? targets[0]?.id ?? '');
  const { data } = useAsync(async () => {
    const r = await getV5().rules.resolve({
      chainId: rs.scope.chainId,
      formatId: rs.scope.formatId,
      warehouseId: target || null,
      hypothetical: rs.status === 'approved' ? null : rs,
    });
    return r;
  }, [target, JSON.stringify(rs)]);
  return (
    <Sheet title="Forhåndsvisning" onClose={onClose} wide>
      <div className="notice info">
        <Icon name="info" />
        <div className="grow">
          {rs.status === 'approved' ? 'Sådan ser medarbejderen kravene nu.' : 'Sådan vil medarbejderen se kravene, hvis dette regelsæt godkendes og publiceres. Det vises ikke endnu.'}
        </div>
      </div>
      {targets.length > 0 && (
        <div className="field">
          <label htmlFor="pv-target">Modtagelager</label>
          <select id="pv-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            {rs.scope.level !== 'warehouse' && <option value="">Uden bestemt lager</option>}
            {targets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {!data ? (
        <Loading />
      ) : (
        <div className="phone-frame">
          <RequirementsView r={data} documents={lookups.documents} previewImageNote={rs.status === 'approved' ? undefined : 'Afventer kontrol — ikke godkendt reference endnu'} />
        </div>
      )}
    </Sheet>
  );
}

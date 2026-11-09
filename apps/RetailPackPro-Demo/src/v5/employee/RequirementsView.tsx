/**
 * Viser de gældende pakkekrav for én modtager — eller tydeligt, hvorfor der
 * ikke er gældende krav (afventer / stop / afklaring). Bruges af medarbejder,
 * plukruteflow og admins forhåndsvisning, så alle ser det samme.
 */
import { useState } from 'react';

import { Lightbox } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { Img, LOCAL_IMAGE_PREFIX } from '../../ui/media';
import { CONFIG } from '../domain/config';
import { FIELD_DEFS, GROUP_LABELS, fieldLabel, formatValue, type FieldGroup } from '../domain/fields';
import type { Resolution, SourceDocument } from '../domain/types';

const LEVEL_LABEL = { chain: 'kæde', format: 'format', warehouse: 'lager' } as const;

export function receiverLine(r: Pick<Resolution, 'chain' | 'format' | 'warehouse'>): string {
  return [r.chain.name, r.format?.name, r.warehouse?.name].filter(Boolean).join(' · ');
}

export function StatusBanner({ r, compact }: { r: Resolution; compact?: boolean }) {
  if (r.status === 'ok') {
    return (
      <div className="notice ok" role="status">
        <Icon name="check" />
        <div className="grow">
          <strong>Gældende pakkekrav</strong>
          {!compact && <span className="small">Kontrolleret og publiceret. Hvert krav viser sin kilde.</span>}
        </div>
      </div>
    );
  }
  if (r.status === 'awaiting') {
    return (
      <div className="notice warn" role="alert">
        <Icon name="info" />
        <div className="grow">
          <strong>{CONFIG.awaitingText}</strong>
          <span>Der er endnu ingen godkendt vejledning fra {r.chain.name}. Pak ikke efter hukommelse — spørg din teamleder.</span>
          {!compact && <span className="small">En palle kan kun registreres som afvigelse med begrundelse og foto.</span>}
        </div>
      </div>
    );
  }
  if (r.status === 'stop') {
    return (
      <div className="notice err" role="alert">
        <Icon name="warn" />
        <div className="grow">
          <strong>STOP — modstridende krav</strong>
          {r.conflicts.map((c) => (
            <span key={c.key}>
              {fieldLabel(c.key)}: {c.values.map((v) => `${formatValue(c.key, v.value)} (${v.title})`).join(' eller ')}
            </span>
          ))}
          <span className="small">Pak ikke, før regelansvarlig har afklaret kravet.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="notice warn" role="alert">
      <Icon name="warn" />
      <div className="grow">
        <strong>Afklaring nødvendig</strong>
        {r.missing.map((k) => (
          <span key={`m-${k}`}>{fieldLabel(k)}: mangler i vejledningen</span>
        ))}
        {r.unclear.map((k) => (
          <span key={`u-${k}`}>{fieldLabel(k)}: kravet er uklart</span>
        ))}
        {r.expired.map((e) => (
          <span key={`e-${e.key}`}>
            {fieldLabel(e.key)}: kilden er ikke gyldig ({e.docTitle})
          </span>
        ))}
        <span className="small">Spørg din teamleder. Krav uden gyldig kilde vises ikke.</span>
      </div>
    </div>
  );
}

export function TestBanner() {
  return (
    <div className="notice warn" style={{ background: 'var(--signal)', color: 'var(--signal-ink)' }}>
      <Icon name="flag" />
      <div className="grow">
        <strong>TESTDATA — fiktiv kæde</strong>
        <span className="small">Kravene er opdigtede til afprøvning af appen. Ikke en rigtig vejledning.</span>
      </div>
    </div>
  );
}

export function RequirementsView({
  r,
  documents,
  showHeader = true,
  previewImageNote,
}: {
  r: Resolution;
  documents: SourceDocument[];
  showHeader?: boolean;
  /** Admin-forhåndsvisning: billedet er ikke kontrolleret endnu. */
  previewImageNote?: string;
}) {
  const [zoom, setZoom] = useState(false);
  const docs = new Map(documents.map((d) => [d.id, d] as const));
  const groups = new Map<FieldGroup, typeof r.fields>();
  for (const def of FIELD_DEFS) {
    const f = r.fields.find((x) => x.key === def.key);
    if (f) groups.set(def.group, [...(groups.get(def.group) ?? []), f]);
  }
  const img = r.referenceImage;
  const imgSrc = img ? LOCAL_IMAGE_PREFIX + img.fileId : null;
  const imgDoc = img?.sourceDocId ? docs.get(img.sourceDocId) : undefined;

  return (
    <div className="guide">
      {showHeader && (
        <div>
          <span className="eyebrow">Modtager</span>
          <h1>{r.warehouse?.name ?? r.format?.name ?? r.chain.name}</h1>
          <p className="muted">{receiverLine(r)}</p>
        </div>
      )}
      {r.isTest && <TestBanner />}
      <StatusBanner r={r} />

      {(r.status === 'stop' || r.status === 'clarify') && r.fields.length > 0 && (
        <p className="eyebrow" style={{ color: 'var(--stop)' }}>
          Øvrige dokumenterede krav — ikke nok til at godkende pallen
        </p>
      )}

      {r.status === 'ok' && (
        <figure className="refimg" style={{ margin: 0 }}>
          <div className={`frame${imgSrc ? '' : ' empty'}`}>
            {imgSrc ? (
              <button type="button" onClick={() => setZoom(true)} className="zoombtn" aria-label="Vis billedet i fuld størrelse">
                <Img src={imgSrc} alt={img!.caption || 'Referencebillede'} />
              </button>
            ) : (
              <div className="noimg">
                <Icon name="image" size={40} />
                <span>Intet godkendt referencebillede</span>
              </div>
            )}
          </div>
          {img && (
            <figcaption>
              <span className={`pill ${img.kind === 'reference' && !previewImageNote ? 'go' : 'draft'}`}>
                {previewImageNote ?? (img.kind === 'reference' ? 'Godkendt reference' : 'Illustration — ikke dokumentation')}
              </span>
              <span className="small muted">
                {img.caption}
                {imgDoc && ` · Kilde: ${imgDoc.title} v${imgDoc.docVersion}, ${img.sourceRef}`}
              </span>
            </figcaption>
          )}
        </figure>
      )}

      {[...groups.entries()].map(([group, fields]) => (
        <section key={group} className="req-group" aria-label={GROUP_LABELS[group]}>
          <div className="eyebrow">{GROUP_LABELS[group]}</div>
          <div className="req-list">
            {fields.map((f) => {
              const def = FIELD_DEFS.find((d) => d.key === f.key)!;
              const doc = docs.get(f.sourceDocId);
              const big = def.kind === 'number';
              return (
                <div className={`req${f.key === 'specialRequirements' ? ' special-req' : ''}`} key={f.key}>
                  <span className="ic">
                    <Icon name={def.icon} />
                  </span>
                  <div className="grow">
                    <div className="k">{def.label}</div>
                    <div className={big ? 'v big num' : 'v'}>{formatValue(f.key, f.value)}</div>
                    <div className="src">
                      Kilde: {doc ? `${doc.title} v${doc.docVersion}` : 'ukendt'}, {f.sourceRef} · {LEVEL_LABEL[f.level]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {r.status !== 'awaiting' && r.fields.length === 0 && <p className="muted">Ingen gældende krav at vise.</p>}

      {zoom && imgSrc && <Lightbox src={imgSrc} caption={img?.caption} onClose={() => setZoom(false)} />}
    </div>
  );
}

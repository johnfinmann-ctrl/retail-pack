/**
 * Pakkevejledninger i admin. Versionering, låsning, publicering, historik og
 * gendan kører gennem v0.3.0's PackProfileEditingService (uændret).
 * Princip: medarbejderen ser kun den publicerede version, indtil en ny
 * version er publiceret.
 */
import type { PackProfileVersionSummary } from '@rpp/data/types';
import { useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { CustomerV4, PackProfileV4 } from '../domain/types';
import { formatDate, formatDateTime, t } from '../i18n';
import { getServices } from '../services';
import { errorText, Loading, Sheet, useAsync, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';

import { GuideEditor, GuidePreviewSheet } from './GuideEditor';

type Mode =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'view'; profile: PackProfileV4 }
  | { kind: 'edit'; draft: PackProfileV4; publishedVersion: number | null };

export function GuidesAdmin({ session }: { session: DemoSession }) {
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [version, setVersion] = useState(0);
  const back = () => {
    setMode({ kind: 'list' });
    setVersion((v) => v + 1);
  };

  if (mode.kind === 'new') return <GuideEditor session={session} draft={null} publishedVersion={null} onDone={back} />;
  if (mode.kind === 'edit') return <GuideEditor session={session} draft={mode.draft} publishedVersion={mode.publishedVersion} onDone={back} />;
  if (mode.kind === 'view')
    return (
      <GuideView
        session={session}
        profile={mode.profile}
        onBack={back}
        onEdit={(draft, publishedVersion) => setMode({ kind: 'edit', draft, publishedVersion })}
      />
    );
  return (
    <GuideList
      session={session}
      version={version}
      onNew={() => setMode({ kind: 'new' })}
      onOpen={async (p) => {
        if (p.status === 'draft') {
          const all = await getServices().repos.packProfiles.listAllForCompany(session.companyId);
          const published = all.find((x) => x.lineageId === p.lineageId && x.status === 'published');
          setMode({ kind: 'edit', draft: p as PackProfileV4, publishedVersion: published?.version ?? null });
        } else setMode({ kind: 'view', profile: p as PackProfileV4 });
      }}
    />
  );
}

function GuideList({
  session,
  version,
  onNew,
  onOpen,
}: {
  session: DemoSession;
  version: number;
  onNew: () => void;
  onOpen: (p: PackProfileV4) => void;
}) {
  const { data } = useAsync(async () => {
    const s = getServices();
    const [guides, customers, all] = await Promise.all([
      s.packProfileEditing.listCurrentVersionsForCompany(session.companyId),
      s.repos.catalog.listAllCustomers(session.companyId),
      s.repos.packProfiles.listAllForCompany(session.companyId),
    ]);
    const links = await Promise.all(guides.map((g) => s.guideAdmin.getProductLinks(g.id)));
    return { guides: guides as PackProfileV4[], customers, links, all };
  }, [session.companyId, version]);

  if (!data) return <Loading />;
  const byCustomer = new Map<string, CustomerV4>(data.customers.map((c) => [c.id, c]));
  const sorted = data.guides
    .map((g, i) => ({ g, links: data.links[i] ?? [] }))
    .sort((a, b) => (byCustomer.get(a.g.customerId)?.name ?? '').localeCompare(byCustomer.get(b.g.customerId)?.name ?? '', 'da'));

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>{t('demo.admin.nav.guides')}</h1>
        <button className="btn primary" onClick={onNew}>
          <Icon name="plus" /> {t('demo.admin.guides.new')}
        </button>
      </div>
      <div className="table-wrap">
        <table className="list">
          <thead>
            <tr>
              <th>{t('demo.admin.guides.name')}</th>
              <th>{t('demo.admin.guides.customer')}</th>
              <th>{t('demo.admin.guides.products')}</th>
              <th>{t('demo.admin.guides.version')}</th>
              <th>{t('demo.admin.guides.status')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ g, links }) => {
              const published = data.all.find((x) => x.lineageId === g.lineageId && x.status === 'published');
              return (
                <tr key={g.id} className="click" tabIndex={0} onClick={() => onOpen(g)} onKeyDown={(e) => e.key === 'Enter' && onOpen(g)}>
                  <td>
                    <strong>{g.name}</strong>
                  </td>
                  <td>{byCustomer.get(g.customerId)?.name}</td>
                  <td>{links.length === 0 ? t('demo.admin.guides.all_products') : t('demo.admin.guides.n_products', { n: links.length })}</td>
                  <td className="num">v{published?.version ?? g.version}</td>
                  <td>
                    {g.status === 'draft' ? (
                      <span className="pill draft">{published ? t('demo.admin.guides.being_edited') : t('retailpackpro.admin.status.draft')}</span>
                    ) : (
                      <span className="pill go">{t('retailpackpro.admin.status.published')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function GuideView({
  session,
  profile,
  onBack,
  onEdit,
}: {
  session: DemoSession;
  profile: PackProfileV4;
  onBack: () => void;
  onEdit: (draft: PackProfileV4, publishedVersion: number | null) => void;
}) {
  const toast = useToast();
  const [preview, setPreview] = useState<PackProfileV4 | null>(null);
  const [history, setHistory] = useState(false);
  const [locked, setLocked] = useState<{ name: string; at: string; draft: PackProfileV4 } | null>(null);
  const { data: customer } = useAsync(() => getServices().customers.listActiveCustomers(session.companyId), [session.companyId]);

  async function edit() {
    try {
      const res = await getServices().packProfileEditing.startEditing(profile, session.userId);
      if (res.outcome === 'ready') onEdit(res.draft as PackProfileV4, profile.version);
      else setLocked({ name: res.lockedByName, at: res.lockedAt, draft: res.draftPreview as PackProfileV4 });
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  return (
    <>
      <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
        <Icon name="back" size={18} /> {t('demo.admin.guides.all')}
      </button>
      <div>
        <span className="eyebrow">{customer?.find((c) => c.id === profile.customerId)?.name}</span>
        <h1>{profile.name}</h1>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span className="pill go">
            {t('retailpackpro.admin.status.published')} · v{profile.version}
          </span>
          {profile.publishedAt && <span className="pill neutral">{formatDate(profile.publishedAt)}</span>}
        </p>
        {profile.changeSummary && <p className="muted" style={{ marginTop: 8 }}>{profile.changeSummary}</p>}
      </div>

      {locked && (
        <div className="notice warn">
          <Icon name="warn" />
          <div className="grow">
            <strong>{t('retailpackpro.admin.wizard.locked_by_other').replace('{name}', locked.name)}</strong>
            <span>{formatDateTime(locked.at)}</span>
            <button className="btn secondary small" style={{ alignSelf: 'flex-start' }} onClick={() => setPreview(locked.draft)}>
              {t('retailpackpro.admin.wizard.open_readonly')}
            </button>
          </div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn primary" onClick={() => void edit()}>
          <Icon name="edit" /> {t('retailpackpro.admin.wizard.edit_button')}
        </button>
        <button className="btn secondary" onClick={() => setPreview(profile)}>
          <Icon name="eye" /> {t('demo.admin.guides.preview')}
        </button>
        <button className="btn ghost" onClick={() => setHistory(true)}>
          <Icon name="history" /> {t('retailpackpro.admin.wizard.show_history')}
        </button>
      </div>

      <div className="notice info">
        <Icon name="info" />
        <div className="grow">{t('demo.admin.guides.edit_principle')}</div>
      </div>

      {preview && <GuidePreviewSheet profile={preview} onClose={() => setPreview(null)} note={null} />}
      {history && (
        <HistorySheet
          session={session}
          profile={profile}
          onClose={() => setHistory(false)}
          onRestored={(draft) => {
            setHistory(false);
            onEdit(draft, profile.version);
          }}
        />
      )}
    </>
  );
}

function HistorySheet({
  session,
  profile,
  onClose,
  onRestored,
}: {
  session: DemoSession;
  profile: PackProfileV4;
  onClose: () => void;
  onRestored: (draft: PackProfileV4) => void;
}) {
  const toast = useToast();
  const { data } = useAsync(async () => {
    const s = getServices();
    const [versions, all] = await Promise.all([
      s.packProfileEditing.listVersionHistory(profile.lineageId),
      s.repos.packProfiles.listAllForCompany(session.companyId),
    ]);
    return { versions, all: all as PackProfileV4[] };
  }, [profile.lineageId]);
  const [preview, setPreview] = useState<PackProfileV4 | null>(null);

  async function restore(v: PackProfileVersionSummary) {
    try {
      const res = await getServices().packProfileEditing.restoreVersion(profile.lineageId, v.id, session.userId);
      if (res.outcome === 'ready') {
        toast(t('demo.admin.guides.restored', { v: v.version }), 'info');
        onRestored(res.draft as PackProfileV4);
      } else toast(t('retailpackpro.admin.wizard.locked_by_other').replace('{name}', res.lockedByName), 'err');
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  return (
    <Sheet title={t('retailpackpro.admin.wizard.show_history')} onClose={onClose}>
      {!data ? (
        <Loading />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.versions.map((v) => (
            <div className="version" key={v.id}>
              <span className="vno">v{v.version}</span>
              <div className="grow">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{formatDate(v.date)}</strong>
                  {v.isCurrent && <span className="pill go">{t('demo.admin.guides.current')}</span>}
                </div>
                {v.userName && <span className="small muted">{v.userName}</span>}
                {v.changeSummary && <span>{v.changeSummary}</span>}
                <div className="btn-row" style={{ marginTop: 4 }}>
                  <button
                    className="btn ghost small"
                    style={{ flex: '0 0 auto' }}
                    onClick={() => setPreview(data.all.find((p) => p.id === v.id) ?? null)}
                  >
                    <Icon name="eye" size={18} /> {t('demo.admin.guides.see')}
                  </button>
                  {!v.isCurrent && (
                    <button className="btn secondary small" style={{ flex: '0 0 auto' }} onClick={() => void restore(v)}>
                      <Icon name="undo" size={18} /> {t('retailpackpro.admin.wizard.restore_button')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {preview && <GuidePreviewSheet profile={preview} onClose={() => setPreview(null)} note={t('demo.admin.guides.old_version_note', { v: preview.version })} />}
    </Sheet>
  );
}

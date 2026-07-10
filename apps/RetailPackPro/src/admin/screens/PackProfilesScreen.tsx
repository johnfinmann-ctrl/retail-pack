/**
 * Pakkemetode-oversigt. Viser ÉN række pr. logisk pakkemetode (kladde
 * hvis der redigeres, ellers den publicerede version) — aldrig forvirrende
 * dubletter. "Publiceret"/"Kladde" er de eneste statusord, en admin ser.
 *
 * Historik viser KUN: versionsnummer, dato, bruger, ændringsbeskrivelse —
 * ingen tekniske databasefelter (PackProfileVersionSummary, ikke PackProfile).
 */
import type { PlatformSession } from '@platform/shared-types';
import { Badge, Button, Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { PackProfile, PackProfileStatus, PackProfileVersionSummary } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

import { CreatePackProfileWizard } from './CreatePackProfileWizard';
import { EditPackProfileWizard } from './EditPackProfileWizard';

const STATUS_TONE: Record<PackProfileStatus, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  draft: 'warning',
  archived: 'neutral',
};

type Mode =
  | { view: 'list' }
  | { view: 'create' }
  | { view: 'edit'; profile: PackProfile }
  | { view: 'restore'; profile: PackProfile; sourceVersionId: string };

export function PackProfilesScreen({ session }: { session: PlatformSession }) {
  const { t } = useT();
  const [profiles, setProfiles] = useState<PackProfile[] | null>(null);
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<PackProfileVersionSummary[]>([]);

  function load() {
    getServices()
      .packProfileEditing.listCurrentVersionsForCompany(session.companyId)
      .then(setProfiles);
  }

  useEffect(load, [session.companyId]);

  async function toggleHistory(profile: PackProfile) {
    if (historyFor === profile.lineageId) {
      setHistoryFor(null);
      return;
    }
    const versions = await getServices().packProfileEditing.listVersionHistory(profile.lineageId);
    setHistory(versions);
    setHistoryFor(profile.lineageId);
  }

  if (mode.view === 'create') {
    return (
      <CreatePackProfileWizard
        session={session}
        onDone={() => {
          setMode({ view: 'list' });
          load();
        }}
      />
    );
  }

  if (mode.view === 'edit') {
    return (
      <EditPackProfileWizard
        session={session}
        profile={mode.profile}
        onDone={() => {
          setMode({ view: 'list' });
          load();
        }}
      />
    );
  }

  if (mode.view === 'restore') {
    return (
      <EditPackProfileWizard
        session={session}
        profile={mode.profile}
        restoreFromVersionId={mode.sourceVersionId}
        onDone={() => {
          setMode({ view: 'list' });
          load();
        }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>{t('retailpackpro.admin.nav.pack_profiles')}</h1>
        <Button variant="primary" size="admin" onClick={() => setMode({ view: 'create' })}>
          {t('retailpackpro.admin.pack_profiles.new')}
        </Button>
      </div>

      {profiles && profiles.length === 0 && <p>{t('retailpackpro.admin.empty.pack_profiles')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profiles?.map((profile) => (
          <Card key={profile.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{profile.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone={STATUS_TONE[profile.status]}>{t(`retailpackpro.admin.status.${profile.status}`)}</Badge>
                {profile.status === 'published' && (
                  <Button variant="secondary" size="admin" onClick={() => setMode({ view: 'edit', profile })}>
                    {t('retailpackpro.admin.wizard.edit_button')}
                  </Button>
                )}
              </div>
            </div>
            <button
              onClick={() => void toggleHistory(profile)}
              style={{ background: 'none', border: 'none', color: '#1a73e8', fontSize: 13, marginTop: 8, cursor: 'pointer', padding: 0 }}
            >
              {t('retailpackpro.admin.wizard.show_history')}
            </button>
            {historyFor === profile.lineageId && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 0',
                      borderBottom: '1px solid #f1f1f3',
                    }}
                  >
                    <div>
                      <strong>
                        {t('retailpackpro.admin.wizard.version_label')} {v.version}
                      </strong>
                      {v.isCurrent && (
                        <span style={{ color: '#1e8e3e', marginLeft: 6 }}>
                          {t('retailpackpro.admin.wizard.current_version_tag')}
                        </span>
                      )}
                      <div style={{ color: '#5c5c66' }}>
                        {v.date ? new Date(v.date).toLocaleDateString('da-DK') : '—'}
                        {v.userName ? ` · ${v.userName}` : ''}
                      </div>
                      <div>{v.changeSummary ?? t('retailpackpro.admin.wizard.version_created')}</div>
                    </div>
                    {!v.isCurrent && (
                      <Button
                        variant="secondary"
                        size="admin"
                        onClick={() => setMode({ view: 'restore', profile, sourceVersionId: v.id })}
                      >
                        {t('retailpackpro.admin.wizard.restore_button')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

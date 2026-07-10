/**
 * Pakkemetode-oversigt. "Publiceret"/"Kladde" er de eneste to ord, en
 * admin ser om status — "arkiveret" vises kun hvis det reelt forekommer.
 * Ingen versionsnumre, ingen tekniske statuskoder.
 */
import type { PlatformSession } from '@platform/shared-types';
import { Badge, Button, Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { PackProfile, PackProfileStatus } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

import { CreatePackProfileWizard } from './CreatePackProfileWizard';

const STATUS_TONE: Record<PackProfileStatus, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  draft: 'warning',
  archived: 'neutral',
};

export function PackProfilesScreen({ session }: { session: PlatformSession }) {
  const { t } = useT();
  const [profiles, setProfiles] = useState<PackProfile[] | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  function load() {
    getServices()
      .packGuide.listProfilesForCompany(session.companyId)
      .then(setProfiles);
  }

  useEffect(load, [session.companyId]);

  if (showWizard) {
    return (
      <CreatePackProfileWizard
        session={session}
        onDone={() => {
          setShowWizard(false);
          load();
        }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>{t('retailpackpro.admin.nav.pack_profiles')}</h1>
        <Button variant="primary" size="admin" onClick={() => setShowWizard(true)}>
          {t('retailpackpro.admin.pack_profiles.new')}
        </Button>
      </div>

      {profiles && profiles.length === 0 && <p>{t('retailpackpro.admin.empty.pack_profiles')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profiles?.map((profile) => (
          <Card key={profile.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{profile.name}</span>
            <Badge tone={STATUS_TONE[profile.status]}>{t(`retailpackpro.admin.status.${profile.status}`)}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

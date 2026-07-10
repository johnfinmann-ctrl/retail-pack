/**
 * Admin grundstruktur — read-only oversigt over ALLE statusser
 * (draft/published/archived). Redigering/publicering (inkl. den låse-
 * mekanisme, databasefelterne allerede understøtter) hører til en senere,
 * dedikeret leverance — dette er kun "grundstruktur".
 */
import { Badge, Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { PackProfile, PackProfileStatus } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

const STATUS_TONE: Record<PackProfileStatus, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  draft: 'warning',
  archived: 'neutral',
};

export function PackProfilesScreen({ companyId }: { companyId: string }) {
  const { t } = useT();
  const [profiles, setProfiles] = useState<PackProfile[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    getServices()
      .packGuide.listProfilesForCompany(companyId)
      .then((result) => {
        if (isMounted) setProfiles(result);
      });
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.admin.nav.pack_profiles')}</h1>
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

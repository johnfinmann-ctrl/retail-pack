/**
 * PRS §4.2 afvigelsesscenarie: "Der mangler en pakkeprofil for produkt+kunde".
 * Aldrig en blindgyde — tilbyder at bede Admin om hjælp.
 *
 * BEVIDST AFGRÆNSNING: "Bed Admin om hjælp"-knappen giver visuel kvittering,
 * men sender endnu IKKE en reel notifikation (Notification Service-kanalerne
 * fra Core er kun konsol-stubs i dette sprint, jf. Sprint 1). Reel
 * levering kobles på, når en rigtig kanal (Web Push/e-mail) bygges.
 */
import { Button, Card } from '@platform/ui';
import { useState } from 'react';

import { useT } from '../../i18n/I18nProvider';

export function NoProfileFoundScreen({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  const [requested, setRequested] = useState(false);

  return (
    <Card style={{ textAlign: 'center', padding: 32 }}>
      <p style={{ fontSize: 18, marginBottom: 16 }}>{t('retailpackpro.no_profile_found')}</p>
      {!requested ? (
        <Button variant="secondary" size="employee" onClick={() => setRequested(true)}>
          {t('retailpackpro.scan.report_missing')}
        </Button>
      ) : (
        <p style={{ color: '#1e8e3e', marginBottom: 16 }}>✓</p>
      )}
      <div style={{ marginTop: 16 }}>
        <Button variant="primary" size="employee" onClick={onBack}>
          {t('core.actions.back')}
        </Button>
      </div>
    </Card>
  );
}

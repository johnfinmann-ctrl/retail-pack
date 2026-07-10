import { Button } from '@platform/ui';
import { useState } from 'react';

import { useT } from '../../i18n/I18nProvider';

export function ApproveScreen({ onApprove, submitting }: { onApprove: () => void; submitting: boolean }) {
  const { t } = useT();
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 48 }}>
      <h1 style={{ fontSize: 24 }}>{t('retailpackpro.approve.title')}</h1>
      <Button
        variant="primary"
        size="employee"
        disabled={submitting}
        onMouseDown={() => setConfirming(true)}
        onMouseUp={() => setConfirming(false)}
        onClick={onApprove}
        style={{ opacity: confirming ? 0.85 : 1 }}
      >
        {t('retailpackpro.approve.button')}
      </Button>
    </div>
  );
}

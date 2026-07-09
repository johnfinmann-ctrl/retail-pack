/**
 * Pladsholder — det fulde medarbejderflow (kundevalg → scan → emballage →
 * palle → godkend) bygges i Trin 5. Her bevises kun: routing endte korrekt
 * her for rollen 'medarbejder', og @platform/ui's EmployeeShell kan monteres.
 */
import { EmployeeShell } from '@platform/ui';

import { useT } from '../i18n/I18nProvider';

export function EmployeeApp() {
  const { t } = useT();
  return (
    <EmployeeShell backLabel={t('core.actions.back')}>
      <p>Medarbejderflow bygges i Trin 5.</p>
    </EmployeeShell>
  );
}

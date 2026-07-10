/**
 * Medarbejderflowet efter Sprint 3's forenkling: "Scan. Se. Pak."
 * Kunde → scan/søg → pakkemetode (med indbygget godkend) → automatisk
 * tilbage til scan. Typisk 3 tryk i alt (kunde, scan, godkend).
 *
 * Al forretningslogik hentes via @/servicesClient (Services-laget) —
 * denne fil kalder ALDRIG repositories eller Supabase direkte.
 */
import type { PlatformSession } from '@platform/shared-types';
import { EmployeeShell } from '@platform/ui';
import { useEffect, useRef, useState } from 'react';

import type { Customer, Product } from '../data/types';
import { useT } from '../i18n/I18nProvider';
import { getServices } from '../servicesClient';

import { shouldShowPackaging } from './FlowEngine';
import { CustomerSelectScreen } from './screens/CustomerSelectScreen';
import { NoProfileFoundScreen } from './screens/NoProfileFoundScreen';
import { PackGuideScreen } from './screens/PackGuideScreen';
import { ScanScreen } from './screens/ScanScreen';
import type { EmployeeFlowState } from './types';

/** Hvor længe godkendt-kvitteringen vises, før flowet automatisk fortsætter (design-princip 5). */
const AUTO_ADVANCE_MS = 1200;

export function EmployeeApp({ session }: { session: PlatformSession }) {
  const { t } = useT();
  const [state, setState] = useState<EmployeeFlowState>({ screen: 'select-customer' });
  const [submitting, setSubmitting] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  function handleSelectCustomer(customer: Customer) {
    setState({ screen: 'scan', customer });
  }

  async function handleProductFound(customer: Customer, product: Product) {
    setState({ screen: 'loading-guide', customer });

    const guide = await getServices().packGuide.getGuideFor(session.companyId, customer.id, product.id);

    if (!guide) {
      setState({ screen: 'no-profile', customer });
      return;
    }

    setState({ screen: 'guide', customer, product, guide });
  }

  async function handleApprove() {
    if (state.screen !== 'guide') return;
    const { customer, product, guide } = state;
    setSubmitting(true);
    try {
      await getServices().packSessions.approve({
        companyId: session.companyId,
        userId: session.userId,
        customerId: customer.id,
        productId: product.id,
        packProfileId: guide.profile.id,
      });
      setState({ screen: 'approved', customer });
      // Automatisk tilbage til scan — ingen ekstra tryk skal til (design-princip 5).
      autoAdvanceTimer.current = setTimeout(() => {
        setState({ screen: 'scan', customer });
      }, AUTO_ADVANCE_MS);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToScan(customer: Customer) {
    setState({ screen: 'scan', customer });
  }

  const backLabel = t('core.actions.back');

  switch (state.screen) {
    case 'select-customer':
      return (
        <EmployeeShell backLabel={backLabel}>
          <CustomerSelectScreen companyId={session.companyId} onSelect={handleSelectCustomer} />
        </EmployeeShell>
      );

    case 'scan':
      return (
        <EmployeeShell backLabel={backLabel} onBack={() => setState({ screen: 'select-customer' })}>
          <ScanScreen
            companyId={session.companyId}
            onProductFound={(product) => void handleProductFound(state.customer, product)}
          />
        </EmployeeShell>
      );

    case 'loading-guide':
      return (
        <EmployeeShell backLabel={backLabel}>
          <p>…</p>
        </EmployeeShell>
      );

    case 'no-profile':
      return (
        <EmployeeShell backLabel={backLabel} onBack={() => handleBackToScan(state.customer)}>
          <NoProfileFoundScreen onBack={() => handleBackToScan(state.customer)} />
        </EmployeeShell>
      );

    case 'guide':
      return (
        <EmployeeShell backLabel={backLabel} onBack={() => handleBackToScan(state.customer)}>
          <PackGuideScreen
            guide={state.guide}
            showPackaging={shouldShowPackaging(state.guide.activeFlowSteps)}
            onApprove={() => void handleApprove()}
            submitting={submitting}
          />
        </EmployeeShell>
      );

    case 'approved':
      return (
        <EmployeeShell backLabel={backLabel}>
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <p style={{ fontSize: 32, color: '#1e8e3e' }}>✓ {t('retailpackpro.approve.confirmation')}</p>
          </div>
        </EmployeeShell>
      );

    default:
      return null;
  }
}

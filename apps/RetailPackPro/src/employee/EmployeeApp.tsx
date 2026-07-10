/**
 * Medarbejderflowet: kundevalg → scan/søg → (emballage) → palle → godkend.
 * Al forretningslogik hentes via @/servicesClient (Services-laget) —
 * denne fil kalder ALDRIG repositories eller Supabase direkte.
 *
 * Antallet af skærme mellem scan og godkend er dynamisk, styret af
 * FlowEngine.buildScreenSequence(guide.activeFlowSteps) — jf. PRS §17.3.
 */
import type { PlatformSession } from '@platform/shared-types';
import { EmployeeShell } from '@platform/ui';
import { useState } from 'react';

import type { Customer, Product } from '../data/types';
import { useT } from '../i18n/I18nProvider';
import { getServices } from '../servicesClient';

import { buildScreenSequence } from './FlowEngine';
import { ApproveScreen } from './screens/ApproveScreen';
import { CustomerSelectScreen } from './screens/CustomerSelectScreen';
import { NoProfileFoundScreen } from './screens/NoProfileFoundScreen';
import { PackagingScreen } from './screens/PackagingScreen';
import { PalletScreen } from './screens/PalletScreen';
import { ScanScreen } from './screens/ScanScreen';
import type { EmployeeFlowState } from './types';

export function EmployeeApp({ session }: { session: PlatformSession }) {
  const { t } = useT();
  const [state, setState] = useState<EmployeeFlowState>({ screen: 'select-customer' });
  const [submitting, setSubmitting] = useState(false);

  function handleSelectCustomer(customer: Customer) {
    setState({ screen: 'scan', customer });
  }

  async function handleProductFound(customer: Customer, product: Product) {
    setState({ screen: 'loading-guide', customer, product });

    const guide = await getServices().packGuide.getGuideFor(session.companyId, customer.id, product.id);

    if (!guide) {
      setState({ screen: 'no-profile', customer });
      return;
    }

    const sequence = buildScreenSequence(guide.activeFlowSteps);
    setState({ screen: 'guide', customer, product, guide, sequence, stepIndex: 0 });
  }

  function handleNextStep() {
    if (state.screen !== 'guide') return;
    const nextIndex = state.stepIndex + 1;
    if (nextIndex < state.sequence.length) {
      setState({ ...state, stepIndex: nextIndex });
    }
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

    case 'guide': {
      const currentStepKey = state.sequence[state.stepIndex];
      const stepIndicator = `${state.stepIndex + 1} ${t('retailpackpro.flow.step_of')} ${state.sequence.length}`;

      return (
        <EmployeeShell
          backLabel={backLabel}
          onBack={() => handleBackToScan(state.customer)}
          stepIndicator={stepIndicator}
        >
          {currentStepKey === 'packaging' && <PackagingScreen guide={state.guide} onNext={handleNextStep} />}
          {currentStepKey === 'pallet' && <PalletScreen guide={state.guide} onNext={handleNextStep} />}
          {currentStepKey === 'approve' && <ApproveScreen onApprove={() => void handleApprove()} submitting={submitting} />}
        </EmployeeShell>
      );
    }

    case 'approving':
      return (
        <EmployeeShell backLabel={backLabel}>
          <p>…</p>
        </EmployeeShell>
      );

    case 'approved':
      return (
        <EmployeeShell backLabel={backLabel}>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{ fontSize: 24, color: '#1e8e3e', marginBottom: 24 }}>
              ✓✓✓ {t('retailpackpro.approve.confirmation')}
            </p>
            <button
              onClick={() => handleBackToScan(state.customer)}
              style={{ padding: 12, fontSize: 16, borderRadius: 8, border: 'none', backgroundColor: '#1a2b4c', color: '#fff' }}
            >
              {t('retailpackpro.scan.title')}
            </button>
          </div>
        </EmployeeShell>
      );

    default:
      return null;
  }
}

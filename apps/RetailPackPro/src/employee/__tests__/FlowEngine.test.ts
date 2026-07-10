import { describe, expect, it } from 'vitest';

import type { PackFlowStep } from '../../data/types';
import { shouldShowPackaging } from '../FlowEngine';

function step(stepKey: PackFlowStep['stepKey'], sortOrder: number): PackFlowStep {
  return { id: `${stepKey}-${sortOrder}`, companyId: 'company-1', stepKey, sortOrder, enabled: true };
}

describe('shouldShowPackaging', () => {
  it('viser emballage når "packaging" er aktiveret', () => {
    expect(shouldShowPackaging([step('packaging', 1), step('pallet', 2), step('approve', 3)])).toBe(true);
  });

  it('viser IKKE emballage for en "kun palleguide"-virksomhed', () => {
    expect(shouldShowPackaging([step('pallet', 1), step('approve', 2)])).toBe(false);
  });

  it('returnerer false hvis ingen trin er aktive', () => {
    expect(shouldShowPackaging([])).toBe(false);
  });
});

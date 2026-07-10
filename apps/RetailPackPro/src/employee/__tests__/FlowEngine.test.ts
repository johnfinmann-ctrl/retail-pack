import { describe, expect, it } from 'vitest';

import type { PackFlowStep } from '../../data/types';
import { buildScreenSequence } from '../FlowEngine';

function step(stepKey: PackFlowStep['stepKey'], sortOrder: number): PackFlowStep {
  return { id: `${stepKey}-${sortOrder}`, companyId: 'company-1', stepKey, sortOrder, enabled: true };
}

describe('buildScreenSequence', () => {
  it('bygger fuld rækkefølge for en virksomhed med emballage+palle+godkend', () => {
    const result = buildScreenSequence([step('packaging', 1), step('pallet', 2), step('approve', 3)]);
    expect(result).toEqual(['packaging', 'pallet', 'approve']);
  });

  it('springer "photo" over, selvom det er aktiveret — ingen skærm bygget endnu i Sprint 2', () => {
    const result = buildScreenSequence([
      step('packaging', 1),
      step('pallet', 2),
      step('photo', 3),
      step('approve', 4),
    ]);
    expect(result).toEqual(['packaging', 'pallet', 'approve']);
  });

  it('understøtter "kun palleguide" — palle+godkend uden emballagetrin', () => {
    const result = buildScreenSequence([step('pallet', 1), step('approve', 2)]);
    expect(result).toEqual(['pallet', 'approve']);
  });

  it('returnerer tomt array hvis ingen trin er aktive', () => {
    expect(buildScreenSequence([])).toEqual([]);
  });
});

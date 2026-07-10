/**
 * Ren logik. Efter Sprint 3's forenkling er der kun ét spørgsmål tilbage:
 * skal emballage-elementerne vises på pakkemetode-skærmen? (Palle vises
 * altid — det ER pakkemetoden. Godkend vises altid — det er slutmålet.)
 *
 * Svaret afhænger af virksomhedens pack_flow_steps ('packaging' aktiveret?)
 * OG om profilen reelt har emballage-elementer at vise — begge dele skal
 * være sande. Fraværet af data betyder automatisk "vis ikke", uden at
 * nogen skal konfigurere det eksplicit.
 */
import type { PackFlowStep } from '../data/types';

export function shouldShowPackaging(activeFlowSteps: readonly PackFlowStep[]): boolean {
  return activeFlowSteps.some((step) => step.stepKey === 'packaging');
}

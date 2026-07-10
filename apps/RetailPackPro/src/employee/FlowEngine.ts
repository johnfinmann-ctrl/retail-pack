/**
 * Ren logik: oversætter en virksomheds aktiverede pack_flow_steps til den
 * konkrete skærmrækkefølge, medarbejder-UI'et skal vise. Ingen React, ingen
 * Supabase — kun data ind, data ud. Testes derfor uden nogen af delene.
 */
import type { PackFlowStep, PackFlowStepKey } from '../data/types';

/**
 * Skærme der FAKTISK er bygget i dette sprint. 'photo' er bevidst udelukket
 * her, selvom databasen/PackGuideService understøtter det (og en fremtidig
 * virksomhed kunne aktivere det) — der findes endnu ingen kameraskærm
 * (ingen kamera i Sprint 2, jf. tidligere godkendt scope). Et ukendt/ikke-
 * bygget trin springes stille over i stedet for at knække flowet.
 */
const SUPPORTED_STEP_KEYS: readonly PackFlowStepKey[] = ['packaging', 'pallet', 'approve'];

export function buildScreenSequence(activeFlowSteps: readonly PackFlowStep[]): PackFlowStepKey[] {
  return activeFlowSteps
    .map((step) => step.stepKey)
    .filter((key): key is PackFlowStepKey => SUPPORTED_STEP_KEYS.includes(key));
}

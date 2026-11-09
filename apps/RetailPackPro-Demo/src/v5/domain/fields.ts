/**
 * Felterne i et pakkekrav — grupperet som medarbejderen ser dem.
 * Rækkefølgen her er visningsrækkefølgen.
 */
import type { RuleFieldKey } from './types';

export type FieldGroup = 'pallet' | 'limits' | 'build' | 'securing' | 'labels' | 'special';

export interface FieldDef {
  key: RuleFieldKey;
  label: string;
  group: FieldGroup;
  kind: 'text' | 'number';
  unit?: string;
  icon: string;
  /** Standard for "vis som kontrolpunkt", når feltet udfyldes. */
  defaultCheckpoint: boolean;
}

export const FIELD_DEFS: FieldDef[] = [
  { key: 'palletType', label: 'Palletype', group: 'pallet', kind: 'text', icon: 'pallet', defaultCheckpoint: true },
  { key: 'palletShare', label: 'Palleandel', group: 'pallet', kind: 'text', icon: 'grid', defaultCheckpoint: false },
  { key: 'maxHeightCm', label: 'Maks. højde', group: 'limits', kind: 'number', unit: 'cm', icon: 'height', defaultCheckpoint: true },
  { key: 'maxWeightKg', label: 'Maks. vægt', group: 'limits', kind: 'number', unit: 'kg', icon: 'weight', defaultCheckpoint: true },
  { key: 'buildUp', label: 'Opbygning', group: 'build', kind: 'text', icon: 'layers', defaultCheckpoint: true },
  { key: 'stability', label: 'Stabilitet', group: 'build', kind: 'text', icon: 'box', defaultCheckpoint: true },
  { key: 'overhang', label: 'Overhæng', group: 'build', kind: 'text', icon: 'mix', defaultCheckpoint: true },
  { key: 'foil', label: 'Foliering', group: 'securing', kind: 'text', icon: 'foil', defaultCheckpoint: true },
  { key: 'loadSecuring', label: 'Lastsikring', group: 'securing', kind: 'text', icon: 'box', defaultCheckpoint: true },
  { key: 'interlayer', label: 'Mellemlæg', group: 'securing', kind: 'text', icon: 'layers', defaultCheckpoint: false },
  { key: 'cornerProtection', label: 'Hjørnebeskyttelse', group: 'securing', kind: 'text', icon: 'box', defaultCheckpoint: false },
  { key: 'labels', label: 'Pallelabel og mærkning', group: 'labels', kind: 'text', icon: 'barcode', defaultCheckpoint: true },
  { key: 'labelPlacement', label: 'Labelplacering', group: 'labels', kind: 'text', icon: 'label', defaultCheckpoint: true },
  { key: 'specialRequirements', label: 'Særlige modtagerkrav', group: 'special', kind: 'text', icon: 'warn', defaultCheckpoint: true },
];

export const FIELD_BY_KEY = new Map(FIELD_DEFS.map((f) => [f.key, f] as const));

export const GROUP_LABELS: Record<FieldGroup, string> = {
  pallet: 'Palle',
  limits: 'Højde og vægt',
  build: 'Palleopbygning',
  securing: 'Foliering og sikring',
  labels: 'Labels og mærkning',
  special: 'Særlige modtagerkrav',
};

export function fieldLabel(key: RuleFieldKey): string {
  return FIELD_BY_KEY.get(key)?.label ?? key;
}

export function formatValue(key: RuleFieldKey, value: string): string {
  const def = FIELD_BY_KEY.get(key);
  return def?.unit ? `${value} ${def.unit}` : value;
}

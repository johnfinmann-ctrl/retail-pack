/**
 * Tekster via Core's i18n-motor (@platform/translations) — samme princip som
 * v0.3.0: Core's "core.*" + v0.3.0's "retailpackpro.*" + demoens "demo.*".
 * Dansk er standard. `{navn}`-pladsholdere udfyldes af `t(key, params)`.
 */
import { createTranslator, daCore } from '@platform/translations';
import daRetailPackPro from '@rpp/i18n/da.json';

import daDemo from './da.json';

const translate = createTranslator({
  locale: 'da',
  dictionaries: { da: { ...daCore, ...daRetailPackPro, ...daDemo } },
  onMissingKey: (key) => {
    console.warn(`Manglende tekst: ${key}`);
  },
});

export function t(key: string, params?: Record<string, string | number>): string {
  const raw = translate(key);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`));
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function relativeDay(isoDay: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (isoDay === today) return t('demo.common.today');
  if (isoDay === tomorrow) return t('demo.common.tomorrow');
  return formatDate(isoDay);
}

import { describe, expect, it, vi } from 'vitest';

import daCore from '../dictionaries/da/core.json';
import enCore from '../dictionaries/en/core.json';
import { createTranslator } from '../i18n';

describe('createTranslator', () => {
  it('oversætter en kendt nøgle på dansk', () => {
    const t = createTranslator({ locale: 'da', dictionaries: { da: daCore, en: enCore } });
    expect(t('core.actions.next')).toBe('Næste');
  });

  it('oversætter samme nøgle på engelsk', () => {
    const t = createTranslator({ locale: 'en', dictionaries: { da: daCore, en: enCore } });
    expect(t('core.actions.next')).toBe('Next');
  });

  it('falder tilbage til dansk og kalder onMissingKey ved manglende engelsk nøgle', () => {
    const onMissingKey = vi.fn();
    const t = createTranslator({
      locale: 'en',
      dictionaries: { da: daCore, en: { core: {} } },
      onMissingKey,
    });
    expect(t('core.actions.next')).toBe('Næste');
    expect(onMissingKey).toHaveBeenCalledWith('core.actions.next', 'en');
  });

  it('returnerer selve nøglen som sidste fallback', () => {
    const t = createTranslator({ locale: 'da', dictionaries: {} });
    expect(t('ukendt.noegle')).toBe('ukendt.noegle');
  });
});

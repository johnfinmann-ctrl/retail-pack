/**
 * i18n-motor (PRS §22). Nøglenavngivning: "{namespace}.{feature}.{key}",
 * fx "core.actions.next" eller senere "retailpackpro.pack_flow.approve_button".
 * "core.*" er fælles for alle apps og oversættes derfor kun ét sted.
 */

export type SupportedLocale = 'da' | 'en';

export const DEFAULT_LOCALE: SupportedLocale = 'da';

/** Nested ordbogsstruktur, som JSON-filerne i dictionaries/ følger. */
export type Dictionary = { [key: string]: string | Dictionary };

export interface TranslatorOptions {
  locale: SupportedLocale;
  dictionaries: Partial<Record<SupportedLocale, Dictionary>>;
  /** Kaldes hvis en nøgle mangler — bruges til at opdage huller i oversættelser tidligt. */
  onMissingKey?: (key: string, locale: SupportedLocale) => void;
}

function lookup(dictionary: Dictionary, path: string[]): string | undefined {
  let current: Dictionary | string = dictionary;
  for (const segment of path) {
    if (typeof current === 'string' || current === undefined) return undefined;
    current = current[segment] as Dictionary | string;
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Opretter en simpel `t(key)`-funktion. Falder tilbage til dansk (platformens
 * standardsprog), hvis en nøgle mangler i det aktive sprog, og til selve
 * nøglen som allersidste fallback, så UI aldrig viser "undefined".
 */
export function createTranslator(options: TranslatorOptions) {
  const { locale, dictionaries, onMissingKey } = options;

  return function t(key: string): string {
    const path = key.split('.');

    const activeDict = dictionaries[locale];
    const fromActive = activeDict ? lookup(activeDict, path) : undefined;
    if (fromActive !== undefined) return fromActive;

    onMissingKey?.(key, locale);

    const fallbackDict = dictionaries[DEFAULT_LOCALE];
    const fromFallback = fallbackDict ? lookup(fallbackDict, path) : undefined;
    if (fromFallback !== undefined) return fromFallback;

    return key;
  };
}

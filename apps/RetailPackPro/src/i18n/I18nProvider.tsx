/**
 * Samler Core's "core.*"-ordbøger med RetailPackPro's egne "retailpackpro.*"-
 * ordbøger, og eksponerer Core's createTranslator via React context. Selve
 * i18n-MOTOREN (fallback-kæde, nøgleopslag) er 100% Core — denne fil
 * tilføjer kun React-bekvemmelighed og RetailPackPro's eget indhold.
 */
import { createTranslator, daCore, enCore, type SupportedLocale } from '@platform/translations';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import daRetailPackPro from './da.json';
import enRetailPackPro from './en.json';

const dictionaries = {
  da: { ...daCore, ...daRetailPackPro },
  en: { ...enCore, ...enRetailPackPro },
};

interface I18nContextValue {
  t: (key: string) => string;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  defaultLocale = 'da',
}: {
  children: ReactNode;
  defaultLocale?: SupportedLocale;
}) {
  const [locale, setLocale] = useState<SupportedLocale>(defaultLocale);

  const t = useMemo(
    () =>
      createTranslator({
        locale,
        dictionaries,
        onMissingKey: (key, l) => {
          // eslint-disable-next-line no-console -- bevidst udviklingsfeedback, ikke en fejl
          console.warn(`Manglende oversættelsesnøgle "${key}" for sprog "${l}"`);
        },
      }),
    [locale],
  );

  return <I18nContext.Provider value={{ t, locale, setLocale }}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT() skal bruges inden i en <I18nProvider>');
  return ctx;
}

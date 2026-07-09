import { registerServiceWorker } from '@platform/offline';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { I18nProvider } from './i18n/I18nProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Rod-element "#root" mangler i index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider defaultLocale="da">
      <App />
    </I18nProvider>
  </StrictMode>,
);

// Service worker-registrering er Core's ansvar (registerServiceWorker) — kun
// STIEN til denne apps egen service worker-fil er RetailPackPro-specifik.
void registerServiceWorker('/sw.js', (error) => {
  // eslint-disable-next-line no-console -- bevidst udviklingsfeedback
  console.warn('Service worker kunne ikke registreres', error);
});

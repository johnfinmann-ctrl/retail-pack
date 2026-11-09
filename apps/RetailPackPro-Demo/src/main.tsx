import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './ui/theme.css';
import './v5/v5.css';
import { ToastProvider } from './ui/common';
import { AppV5 } from './v5/AppV5';
import { initServicesV5 } from './v5/services';

/*
 * RetailPackPro Demo v0.5 — kædernes pakkekrav.
 * v0.4.0-skærmene (App.tsx m.fl.) er bevaret uændret i kildekoden og som
 * selvstændig referencefil i reference/retailpackpro-demo-v0.4.0.html.
 * Ingen service worker: én selvstændig fil, der altid viser nyeste version.
 */
const root = document.getElementById('root');
if (!root) throw new Error('Rod-element "#root" mangler');

void initServicesV5().then(() => {
  createRoot(root).render(
    <StrictMode>
      <ToastProvider>
        <AppV5 />
      </ToastProvider>
    </StrictMode>,
  );
});

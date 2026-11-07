import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './ui/theme.css';
import { App } from './App';
import { initServices } from './services';
import { ToastProvider } from './ui/common';

const root = document.getElementById('root');
if (!root) throw new Error('Rod-element "#root" mangler');

// Ingen service worker i demoen: den er én selvstændig fil og skal altid
// vise nyeste version uden cache-problemer.
void initServices().then(() => {
  createRoot(root).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>,
  );
});

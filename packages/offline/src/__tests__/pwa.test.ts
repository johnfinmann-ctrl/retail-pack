import { describe, expect, it } from 'vitest';

import { buildManifest } from '../pwa';

describe('buildManifest', () => {
  it('bygger et gyldigt web-manifest-objekt', () => {
    const manifest = buildManifest({
      appName: 'RetailPackPro',
      shortName: 'RPP',
      themeColor: '#1a2b4c',
      backgroundColor: '#ffffff',
      startUrl: '/',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    });
    expect(manifest.name).toBe('RetailPackPro');
    expect(manifest.display).toBe('standalone');
  });
});

import { platformDefaultBrand } from '@platform/ui';
import { describe, expect, it } from 'vitest';

import { brandingToCssVariables, resolveBranding } from '../branding';

describe('resolveBranding', () => {
  it('bruger appens override, hvis den findes', () => {
    const result = resolveBranding(
      { logoUrl: 'company-logo.png', primaryColor: '#111111', secondaryColor: '#222222', companyName: 'Carletti' },
      { primaryColor: '#ff0000' },
    );
    expect(result.primaryColor).toBe('#ff0000');
    expect(result.secondaryColor).toBe('#222222'); // ikke overstyret af app
  });

  it('falder tilbage til virksomhedens branding uden app-override', () => {
    const result = resolveBranding(
      { logoUrl: 'logo.png', primaryColor: '#111111', secondaryColor: '#222222', companyName: 'Carletti' },
      null,
    );
    expect(result.primaryColor).toBe('#111111');
  });

  it('falder tilbage til platformens neutrale standard uden nogen branding', () => {
    const result = resolveBranding(
      { logoUrl: null, primaryColor: null, secondaryColor: null, companyName: 'Ny Virksomhed' },
      null,
    );
    expect(result.primaryColor).toBe(platformDefaultBrand.primary);
    expect(result.secondaryColor).toBe(platformDefaultBrand.secondary);
    expect(result.logoUrl).toBeNull();
  });
});

describe('brandingToCssVariables', () => {
  it('mapper til CSS custom properties', () => {
    const vars = brandingToCssVariables({
      logoUrl: null,
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
      companyName: 'Test',
    });
    expect(vars).toEqual({ '--brand-primary': '#123456', '--brand-secondary': '#abcdef' });
  });
});

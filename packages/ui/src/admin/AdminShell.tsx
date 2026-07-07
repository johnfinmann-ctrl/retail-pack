import type { ReactNode } from 'react';

import type { NavSection } from '../navigation/types';

export interface AdminShellProps {
  /** Allerede rolle-filtreret (jf. filterNavByRole) og oversat navigation. */
  sections: readonly (NavSection & { renderedItems: { label: string; path: string; active: boolean; onClick: () => void }[] })[];
  logo?: ReactNode;
  companyName: string;
  children: ReactNode;
}

/**
 * Fælles admin-skal (PRS §7 Fælles Admin Portal). Layoutet er ens for
 * Admin/Teamleder/SuperAdmin på tværs af alle apps — kun indholdet i
 * `children` og hvilke NavItems der er synlige, varierer.
 */
export function AdminShell({ sections, logo, companyName, children }: AdminShellProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside
        style={{
          width: 240,
          borderRight: '1px solid var(--border-color, #e2e2e5)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {logo}
          <strong>{companyName}</strong>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((section) => (
            <div key={section.key}>
              {section.renderedItems.map((item) => (
                <button
                  key={item.path}
                  onClick={item.onClick}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: item.active ? 'var(--surface-color, #f1f1f3)' : 'transparent',
                    fontWeight: item.active ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}

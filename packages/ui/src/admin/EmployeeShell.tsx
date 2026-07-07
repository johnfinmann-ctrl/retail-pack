import type { ReactNode } from 'react';

export interface EmployeeShellProps {
  /** Vises kun hvis der er en aktiv "tilbage"-handling — ellers ingen ekstra navigation. */
  onBack?: () => void;
  backLabel: string;
  /** Fx "3 af 6" — vises kun når flowet reelt har flere trin (PRS §5.1/§17). */
  stepIndicator?: string;
  children: ReactNode;
}

/**
 * Fælles medarbejder-skal (PRS §37 Navigation). Bevidst minimal: ingen
 * bundnavigation, ingen sidemenu — kun en valgfri tilbage-knap og
 * trin-indikator. Dette er selve håndhævelsen af designprincippet
 * "ét meningsfuldt valg ad gangen".
 */
export function EmployeeShell({ onBack, backLabel, stepIndicator, children }: EmployeeShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
        }}
      >
        {onBack ? (
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
          >
            ← {backLabel}
          </button>
        ) : (
          <span />
        )}
        {stepIndicator && <span style={{ color: '#5c5c66', fontSize: 14 }}>{stepIndicator}</span>}
      </header>
      <main style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}

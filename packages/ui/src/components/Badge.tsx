import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Semantisk farvekodning (PRS §6): grøn = ok/godkendt, gul = kræver handling,
 * rød = afvigelse/fejl, blå = neutral info. Konsekvent på tværs af alle apps.
 */
export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

const toneStyles: Record<BadgeTone, { background: string; color: string }> = {
  success: { background: '#e6f4ea', color: '#1e8e3e' },
  warning: { background: '#fef7e0', color: '#8a6116' },
  error: { background: '#fce8e6', color: '#d93025' },
  info: { background: '#e8f0fe', color: '#1a73e8' },
  neutral: { background: '#f1f1f3', color: '#5c5c66' },
};

export function Badge({ tone = 'neutral', children, style, ...rest }: BadgeProps) {
  const toneStyle = toneStyles[tone];
  return (
    <span
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 9999,
        padding: '2px 10px',
        fontSize: 13,
        fontWeight: 600,
        backgroundColor: toneStyle.background,
        color: toneStyle.color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

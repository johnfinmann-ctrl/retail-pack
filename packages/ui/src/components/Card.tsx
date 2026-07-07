import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Platform-standard kort-container — bruges af Dashboard-widgets, lister m.m. */
export function Card({ children, style, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      style={{
        backgroundColor: 'var(--surface-color, #f7f7f8)',
        border: '1px solid var(--border-color, #e2e2e5)',
        borderRadius: 12,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

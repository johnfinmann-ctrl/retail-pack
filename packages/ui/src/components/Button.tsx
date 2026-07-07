import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'employee' | 'admin';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  /**
   * "employee" = store touch-targets (≥64px højde, jf. PRS §6/§23 tilgængelighed).
   * "admin" = kompakt, til tætpakkede admin-skærme.
   */
  size?: ButtonSize;
  children: ReactNode;
}

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  employee: { minHeight: 64, fontSize: 18, padding: '16px 24px' },
  admin: { minHeight: 40, fontSize: 14, padding: '8px 16px' },
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: 'var(--brand-primary, #1a2b4c)',
    color: '#ffffff',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: 'var(--brand-primary, #1a2b4c)',
    border: '1px solid var(--brand-primary, #1a2b4c)',
  },
  danger: {
    backgroundColor: '#d93025',
    color: '#ffffff',
    border: 'none',
  },
};

/**
 * Platform-standard knap. Kender ALDRIG til et specifikt brand — kun til
 * CSS-variablen `--brand-primary`, som TenantContext sætter ved runtime.
 */
export function Button({
  variant = 'primary',
  size = 'admin',
  style,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        borderRadius: 8,
        fontWeight: 600,
        cursor: 'pointer',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

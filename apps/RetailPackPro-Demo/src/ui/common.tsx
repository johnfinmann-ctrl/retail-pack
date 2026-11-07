import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { t } from '../i18n';

import { Icon } from './Icon';
import { Img } from './media';

// ------------------------------------------------------------------ Toast

type ToastKind = 'ok' | 'err' | 'info';
const ToastCtx = createContext<(message: string, kind?: ToastKind) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((message: string, kind: ToastKind = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), kind === 'err' ? 5000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind}`} role="status" aria-live="polite" key={toast.id}>
          <Icon name={toast.kind === 'err' ? 'warn' : toast.kind === 'ok' ? 'check' : 'info'} />
          <span>{toast.message}</span>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Viser fejlens egen tekst — forretningsreglerne formulerer dem på dansk til brugeren. */
export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return t('demo.common.error');
}

// ------------------------------------------------------------------ Sheet

export function Sheet({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${wide ? ' wide' : ''}`}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="close" onClick={onClose} aria-label={t('demo.common.close')}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Bekræftelse inde på siden (browserens confirm() bruges ikke). */
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title={title} onClose={onCancel}>
      <div className="muted">{body}</div>
      <div className="btn-row">
        <button className="btn ghost" onClick={onCancel} disabled={busy}>
          {t('demo.common.cancel')}
        </button>
        <button
          className={`btn ${danger ? 'danger' : 'primary'}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Stepper

export function Stepper({
  value,
  min = 0,
  max,
  onChange,
  label,
  id,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  id: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Number.isFinite(v) ? Math.round(v) : min));
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`${label}: ${t('demo.common.less')}`}>
        <Icon name="minus" />
      </button>
      <input
        id={id}
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, '')) || 0))}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`${label}: ${t('demo.common.more')}`}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

// --------------------------------------------------------------- Lightbox

export function Lightbox({
  src,
  photoId,
  caption,
  onClose,
  actions,
}: {
  src?: string | null;
  photoId?: string;
  caption?: string | null;
  onClose: () => void;
  actions?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={caption ?? t('demo.common.image')}>
      <Img src={src} photoId={photoId} alt={caption ?? ''} />
      <div className="bar">
        <div className="grow">{caption}</div>
        {actions}
        <button className="btn secondary small" onClick={onClose}>
          {t('demo.common.close')}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Hjælpere

export function Monogram({ name }: { name: string }) {
  return <span className="monogram" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>;
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): { data: T | undefined; error: unknown; reload: () => void } {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(undefined);
    load()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [...deps, n]);
  return { data, error, reload: () => setN((x) => x + 1) };
}

export function Loading() {
  return <p className="muted" aria-live="polite">{t('demo.common.loading')}</p>;
}

/**
 * ÉT felt til scanning (videreført fra v0.3.0):
 * - Fysisk håndscanner: "taster" koden + Enter i feltet (virker altid).
 * - Manuel indtastning: stregkode, varenummer, ordrenummer eller navn.
 * - Kamera: live-scanning hvor browseren tillader det, ellers foto af stregkoden.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { t } from '../i18n';
import { Sheet } from '../ui/common';
import { Icon } from '../ui/Icon';
import { pickImageFile } from '../ui/media';

import { classifyCameraError, decodeFromImage, liveCameraPossible, startLiveScan, type CameraError } from './barcode';

export function ScanField({
  placeholder,
  onSubmit,
  busy,
  id,
}: {
  placeholder: string;
  onSubmit: (code: string) => void;
  busy?: boolean;
  id: string;
}) {
  const [value, setValue] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fokus i feltet, så en håndscanner virker med det samme — men ikke på
    // touch-enheder, hvor tastaturet ellers dækker halvdelen af skærmen.
    if (!window.matchMedia?.('(pointer: coarse)').matches) inputRef.current?.focus();
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    onSubmit(code);
    setValue('');
  }

  return (
    <>
      <form className="scan-box" onSubmit={submit} role="search">
        <label htmlFor={id} className="sr">
          {placeholder}
        </label>
        <input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="search"
          disabled={busy}
        />
        <button type="button" className="cam" onClick={() => setCameraOpen(true)} aria-label={t('demo.scan.camera')}>
          <Icon name="camera" size={30} />
        </button>
      </form>
      {cameraOpen && (
        <CameraScanSheet
          onClose={() => {
            setCameraOpen(false);
            inputRef.current?.focus();
          }}
          onCode={(code) => {
            setCameraOpen(false);
            onSubmit(code);
          }}
        />
      )}
    </>
  );
}

type Phase = 'starting' | 'live' | 'failed' | 'decoding' | 'photo_none';

function CameraScanSheet({ onClose, onCode }: { onClose: () => void; onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>(liveCameraPossible() ? 'starting' : 'failed');
  const [reason, setReason] = useState<CameraError>(liveCameraPossible() ? 'unknown' : 'unsupported');
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!liveCameraPossible() || !videoRef.current) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    startLiveScan(videoRef.current, (code) => {
      if (navigator.vibrate) navigator.vibrate(60);
      onCodeRef.current(code);
    })
      .then((s) => {
        if (cancelled) s();
        else {
          stop = s;
          setPhase('live');
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setReason(classifyCameraError(e));
        setPhase('failed');
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  async function fromPhoto() {
    const files = await pickImageFile({ capture: true });
    const file = files[0];
    if (!file) return;
    setPhase('decoding');
    const code = await decodeFromImage(file).catch(() => null);
    if (code) onCode(code);
    else setPhase('photo_none');
  }

  return (
    <Sheet title={t('demo.scan.camera_title')} onClose={onClose}>
      {(phase === 'starting' || phase === 'live') && (
        <>
          <div className="camera-view">
            <video ref={videoRef} playsInline muted />
            <div className="aim" />
          </div>
          <p className="hint">
            <Icon name="barcode" /> {phase === 'live' ? t('demo.scan.camera_live') : t('demo.scan.camera_starting')}
          </p>
        </>
      )}

      {phase === 'failed' && (
        <div className="notice warn">
          <Icon name="info" />
          <div className="grow">
            <strong>{t(`demo.scan.camera_error.${reason}`)}</strong>
            <span>{t('demo.scan.camera_photo_hint')}</span>
          </div>
        </div>
      )}
      {phase === 'decoding' && <p className="muted">{t('demo.scan.decoding')}</p>}
      {phase === 'photo_none' && (
        <div className="notice err">
          <Icon name="warn" />
          <div className="grow">
            <strong>{t('demo.scan.photo_none')}</strong>
            <span>{t('demo.scan.photo_none_hint')}</span>
          </div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn secondary" onClick={() => void fromPhoto()}>
          <Icon name="camera" /> {t('demo.scan.photo_button')}
        </button>
        <button className="btn ghost" onClick={onClose}>
          {t('demo.scan.type_instead')}
        </button>
      </div>
    </Sheet>
  );
}

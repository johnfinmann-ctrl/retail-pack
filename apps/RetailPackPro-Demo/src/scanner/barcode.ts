/**
 * Stregkodeaflæsning med kamera.
 * 1. Browserens indbyggede BarcodeDetector (Chrome/Edge på Android — hurtigst).
 * 2. ZXing (ren JavaScript) som reserve — virker også i Safari på iPhone/iPad.
 * Understøttede formater: EAN-13, EAN-8, UPC-A/E, Code 128 (ordrenumre og
 * GS1-128/SSCC-labels), Code 39, ITF og QR.
 */
type Detected = string | null;

interface NativeDetector {
  detect(source: CanvasImageSource | ImageBitmap): Promise<Array<{ rawValue: string }>>;
}

// Plukrutens stregkode i AX er ikke endeligt bekræftet — derfor bredt udvalg af 1D- og 2D-formater
const NATIVE_FORMATS = ['code_128', 'code_39', 'code_93', 'codabar', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'qr_code', 'data_matrix', 'pdf417'];

async function nativeDetector(): Promise<NativeDetector | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): NativeDetector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = (await Ctor.getSupportedFormats?.()) ?? NATIVE_FORMATS;
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (formats.length === 0) return null;
    return new Ctor({ formats });
  } catch {
    return null;
  }
}

async function zxingReader() {
  const [{ BrowserMultiFormatReader }, lib] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
  const hints = new Map();
  hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [
    lib.BarcodeFormat.EAN_13,
    lib.BarcodeFormat.EAN_8,
    lib.BarcodeFormat.UPC_A,
    lib.BarcodeFormat.UPC_E,
    lib.BarcodeFormat.CODE_128,
    lib.BarcodeFormat.CODE_39,
    lib.BarcodeFormat.ITF,
    lib.BarcodeFormat.CODE_93,
    lib.BarcodeFormat.CODABAR,
    lib.BarcodeFormat.QR_CODE,
    lib.BarcodeFormat.DATA_MATRIX,
    lib.BarcodeFormat.PDF_417,
  ]);
  hints.set(lib.DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
}

export type CameraError = 'not_allowed' | 'no_camera' | 'unsupported' | 'in_use' | 'unknown';

export function classifyCameraError(e: unknown): CameraError {
  const name = (e as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'not_allowed';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no_camera';
  if (name === 'NotReadableError' || name === 'AbortError') return 'in_use';
  if (name === 'TypeError' || name === 'NotSupportedError') return 'unsupported';
  return 'unknown';
}

export function liveCameraPossible(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
}

export interface CameraDiagnostics {
  secure: boolean;
  mediaDevices: boolean;
  embedded: boolean;
  nativeDetector: boolean;
  platform: 'iphone' | 'android' | 'other';
}

/** Hvorfor virker kameraet (ikke) her? Vises til medarbejderen ved fejl. */
export function cameraDiagnostics(): CameraDiagnostics {
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true;
  }
  const ua = navigator.userAgent;
  const iphone = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return {
    secure: window.isSecureContext,
    mediaDevices: !!navigator.mediaDevices?.getUserMedia,
    embedded,
    nativeDetector: 'BarcodeDetector' in window,
    platform: iphone ? 'iphone' : /Android/.test(ua) ? 'android' : 'other',
  };
}

/** Konkret årsag, når live-kamera ikke kan startes, før vi overhovedet spørger. */
export function unsupportedReason(d: CameraDiagnostics = cameraDiagnostics()): 'insecure' | 'embedded_no_camera' | 'no_api' | null {
  if (d.secure && d.mediaDevices) return null;
  if (!d.secure) return 'insecure';
  if (d.embedded) return 'embedded_no_camera';
  return 'no_api';
}

/** Starter live-scanning i <video>. Returnerer en stop-funktion. Kalder onCode én gang. */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  // iOS Safari: playsinline/muted/autoplay SKAL være sat, før strømmen tilknyttes —
  // ellers åbner videoen i fuldskærm eller bliver sort.
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  video.muted = true;
  video.srcObject = stream;
  await new Promise<void>((resolve) => {
    if (video.readyState >= 1) return resolve();
    const t = setTimeout(resolve, 3000);
    video.addEventListener('loadedmetadata', () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
  await video.play().catch(() => undefined);

  let stopped = false;
  let found = false;
  const stopStream = () => stream.getTracks().forEach((tr) => tr.stop());
  let stopDecoder: () => void = () => undefined;
  const hit = (code: string) => {
    if (found || stopped) return;
    found = true;
    // Stop kameraet med det samme, når en kode er fundet
    stopDecoder();
    stopStream();
    onCode(code);
  };

  const native = await nativeDetector();
  if (native) {
    const tick = async () => {
      if (stopped || found) return;
      try {
        if (video.readyState >= 2) {
          const res = await native.detect(video);
          const value = res[0]?.rawValue;
          if (value) hit(value);
        }
      } catch {
        // enkelte billeder kan fejle — fortsæt
      }
      if (!stopped && !found) setTimeout(() => void tick(), 150);
    };
    void tick();
    return () => {
      stopped = true;
      stopStream();
    };
  }

  const reader = await zxingReader();
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (result) hit(result.getText());
  });
  stopDecoder = () => controls.stop();
  return () => {
    stopped = true;
    controls.stop();
    stopStream();
  };
}

/** Aflæser en stregkode fra et foto (reserve, når live-kamera ikke er tilladt). */
export async function decodeFromImage(file: Blob): Promise<Detected> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image'));
      el.src = bitmapUrl;
    });
    // Prøv flere størrelser — store mobilfotos aflæses ofte bedst nedskaleret.
    for (const maxSide of [1600, 1000, 2400]) {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);

      const native = await nativeDetector();
      if (native) {
        try {
          const res = await native.detect(canvas);
          if (res[0]?.rawValue) return res[0].rawValue;
        } catch {
          // fortsæt med ZXing
        }
      }
      try {
        const reader = await zxingReader();
        const result = reader.decodeFromCanvas(canvas);
        if (result) return result.getText();
      } catch {
        // ingen kode fundet i denne størrelse
      }
    }
    return null;
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

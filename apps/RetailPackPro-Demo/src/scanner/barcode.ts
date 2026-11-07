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

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

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
    lib.BarcodeFormat.QR_CODE,
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

/** Starter live-scanning i <video>. Returnerer en stop-funktion. Kalder onCode én gang. */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  await video.play().catch(() => undefined);

  let stopped = false;
  let found = false;
  const stopStream = () => stream.getTracks().forEach((tr) => tr.stop());
  const hit = (code: string) => {
    if (found || stopped) return;
    found = true;
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

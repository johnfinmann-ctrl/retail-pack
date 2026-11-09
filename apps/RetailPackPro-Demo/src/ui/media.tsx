/**
 * Billedhåndtering i browseren: komprimering af fotos, lagring af uploadede
 * billeder og visning af alle billedtyper (illustration / lokalt / link).
 */
import { useEffect, useState, type ImgHTMLAttributes } from 'react';

import { newId } from '../demo/storage';
import type { PreparedPhoto } from '../domain/PhotoService';
import { getServices } from '../services';

import { illustrationDataUri } from './illustrations';

export const LOCAL_IMAGE_PREFIX = 'local-image:';

/**
 * v0.5 registrerer sit eget fillager her. Uden registrering bruges v0.4.0's
 * services (uændret adfærd for referenceversionen).
 */
interface MediaBackend {
  getFile(id: string): Promise<Blob | null>;
  putFile(id: string, data: Blob): Promise<void>;
}
let backend: MediaBackend | null = null;
export function setMediaBackend(b: MediaBackend): void {
  backend = b;
}
const files = (): MediaBackend =>
  backend ?? { getFile: (id) => getServices().db.blobs.get(id), putFile: (id, d) => getServices().db.blobs.put(id, d) };

/** Skalerer til maks. `maxSide` px og gemmer som JPEG — typisk 150–400 kB pr. foto. */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.8): Promise<PreparedPhoto> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Billedet kunne ikke behandles på denne enhed.');
  ctx.drawImage(bitmap.source, 0, 0, width, height);
  bitmap.close();
  const data = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!data) throw new Error('Billedet kunne ikke gemmes på denne enhed.');
  return { data, width, height, mimeType: 'image/jpeg' };
}

async function loadBitmap(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // falder tilbage til <img> nedenfor (fx ældre Safari)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Filen er ikke et billede, eller formatet understøttes ikke.'));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Gemmer et uploadet billede (fx produktbillede) lokalt og returnerer dets billed-URL. */
export async function storeUploadedImage(file: Blob, maxSide = 1400): Promise<string> {
  const prepared = await compressImage(file, maxSide, 0.82);
  const id = newId();
  await files().putFile(id, prepared.data);
  return LOCAL_IMAGE_PREFIX + id;
}

const objectUrlCache = new Map<string, string>();

async function resolveSrc(src: string | null | undefined, photoId?: string): Promise<string | null> {
  if (photoId) {
    const cached = objectUrlCache.get(`photo:${photoId}`);
    if (cached) return cached;
    const blob = await getServices().photos.getPhotoData(photoId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(`photo:${photoId}`, url);
    return url;
  }
  if (!src) return null;
  if (src.startsWith('illustration:')) return illustrationDataUri(src);
  if (src.startsWith(LOCAL_IMAGE_PREFIX)) {
    const cached = objectUrlCache.get(src);
    if (cached) return cached;
    const blob = await files().getFile(src.slice(LOCAL_IMAGE_PREFIX.length));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(src, url);
    return url;
  }
  return src;
}

export function useImageSrc(src: string | null | undefined, photoId?: string): string | null | undefined {
  const sync = src?.startsWith('illustration:') ? illustrationDataUri(src) : undefined;
  const [resolved, setResolved] = useState<string | null | undefined>(sync);
  useEffect(() => {
    let alive = true;
    if (sync !== undefined) {
      setResolved(sync);
      return;
    }
    setResolved(undefined);
    resolveSrc(src, photoId)
      .then((r) => alive && setResolved(r))
      .catch(() => alive && setResolved(null));
    return () => {
      alive = false;
    };
  }, [src, photoId, sync]);
  return resolved;
}

export function Img({
  src,
  photoId,
  alt,
  ...rest
}: { src?: string | null; photoId?: string; alt: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const resolved = useImageSrc(src, photoId);
  if (!resolved) {
    return <span aria-label={alt} role="img" style={{ display: 'block', width: '100%', height: '100%', background: 'var(--paper)' }} />;
  }
  return <img src={resolved} alt={alt} {...rest} />;
}

/** Skjult filvælger. På mobil/tablet åbner `capture` kameraet direkte. */
export function pickImageFile(options: { capture?: boolean; multiple?: boolean } = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (options.capture) input.setAttribute('capture', 'environment');
    if (options.multiple) input.multiple = true;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => finish([]));
    document.body.appendChild(input);
    input.click();
  });
}

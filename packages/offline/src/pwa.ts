/**
 * PWA-fundament (Sprint 1's "PWA setup"-punkt). Denne pakke definerer det
 * genbrugelige manifest-skema og service worker-registrerings-hjælper — den
 * konkrete manifest.json og ikonsæt pr. app tilføjes, når hver app bygges.
 */
export interface PwaManifestConfig {
  appName: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  startUrl: string;
  icons: Array<{ src: string; sizes: string; type: string }>;
}

export function buildManifest(config: PwaManifestConfig): Record<string, unknown> {
  return {
    name: config.appName,
    short_name: config.shortName,
    start_url: config.startUrl,
    display: 'standalone',
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    icons: config.icons,
  };
}

/**
 * Registrerer service workeren, hvis browseren understøtter det. Kaldes fra
 * den enkelte apps entrypoint — denne funktion kender ikke til appens
 * specifikke cache-strategi (det definerer appens egen service-worker-fil).
 */
export async function registerServiceWorker(
  scriptUrl: string,
  onError?: (error: unknown) => void,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register(scriptUrl);
  } catch (error) {
    onError?.(error);
    return null;
  }
}

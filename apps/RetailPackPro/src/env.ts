/**
 * Miljøkonfiguration for RetailPackPro. Genbruger @platform/config's
 * loadPlatformEnv — al validering af manglende/forkerte miljøvariabler sker
 * ét sted i Core, ikke duplikeret her (PRS §12/§27).
 */
import { loadPlatformEnv, type PlatformEnv } from '@platform/config';

// Vite eksponerer kun variabler prefikset med VITE_ til klientkoden — derfor
// læses de her og gives videre til Core's app-agnostiske loadPlatformEnv.
export function getEnv(): PlatformEnv {
  return loadPlatformEnv(import.meta.env as unknown as Record<string, string | undefined>);
}

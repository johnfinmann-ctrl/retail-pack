/**
 * Roller og rettigheder (PRS §9). UI-gating her er kun UX — den reelle
 * sikkerhedsgrænse er altid RLS i databasen (PRS §24). Denne pakke skal
 * derfor ALDRIG bruges som eneste beskyttelse af en handling.
 */
import { UnauthorizedError } from '@platform/config';
import type { PlatformRole, PlatformSession } from '@platform/shared-types';

/** Rolle-hierarki til simple "mindst denne rolle"-tjek. Højere tal = flere rettigheder. */
const ROLE_RANK: Record<PlatformRole, number> = {
  medarbejder: 0,
  teamleder: 1,
  admin: 2,
  superadmin: 3,
};

export function hasAtLeastRole(session: PlatformSession, minimumRole: PlatformRole): boolean {
  return ROLE_RANK[session.role] >= ROLE_RANK[minimumRole];
}

/** Kaster UnauthorizedError hvis sessionen ikke opfylder minimumsrollen — til brug i UI-handlers. */
export function requireAtLeastRole(session: PlatformSession, minimumRole: PlatformRole): void {
  if (!hasAtLeastRole(session, minimumRole)) {
    throw new UnauthorizedError(
      `Rolle "${session.role}" opfylder ikke minimumskravet "${minimumRole}"`,
    );
  }
}

/**
 * App-specifikke rettigheder ud over platform-rollen (PRS §9's
 * `app_role_permissions`-tabel). Denne funktion er bevidst generisk — den
 * konkrete opslags-kilde (Supabase-tabel) tilføjes i Supabase-leverancen.
 */
export interface AppPermissionLookup {
  (appKey: string, role: PlatformRole, permissionKey: string): boolean;
}

export function hasAppPermission(
  lookup: AppPermissionLookup,
  appKey: string,
  session: PlatformSession,
  permissionKey: string,
): boolean {
  // SuperAdmin har altid alle app-rettigheder — det er support-adgangen (PRS §1.3).
  if (session.role === 'superadmin') return true;
  return lookup(appKey, session.role, permissionKey);
}

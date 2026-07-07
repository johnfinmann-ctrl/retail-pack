/**
 * Session- og TenantContext-håndtering (PRS §1/§9 Fælles Login og Roller).
 * `company_id` og rolle læses fra JWT'et (sat af databasen ved login, jf.
 * PRS §3) — denne pakke stoler IKKE på klient-angivne værdier.
 */

import { UnauthorizedError } from '@platform/config';
import {
  type AppKey,
  type CompanyId,
  type PlatformRole,
  type PlatformSession,
  type TeamId,
  type UserId,
} from '@platform/shared-types';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Forventet form af de custom JWT-claims, en Postgres-funktion sætter ved login. */
interface PlatformJwtClaims {
  company_id: string;
  role: PlatformRole;
  team_id: string | null;
  enabled_apps: string[];
}

function isPlatformRole(value: unknown): value is PlatformRole {
  return value === 'superadmin' || value === 'admin' || value === 'teamleder' || value === 'medarbejder';
}

/**
 * Henter den aktive session fra Supabase Auth og validerer, at de nødvendige
 * platform-claims (company_id, role) faktisk er til stede — en session uden
 * disse er ubrugelig og skal fejle tidligt, ikke give uforklarlige RLS-afvisninger senere.
 */
export async function getPlatformSession(client: SupabaseClient): Promise<PlatformSession> {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error || !session) {
    throw new UnauthorizedError('Ingen aktiv session');
  }

  const claims = session.user.app_metadata as Partial<PlatformJwtClaims>;

  if (!claims.company_id || !isPlatformRole(claims.role)) {
    throw new UnauthorizedError('Session mangler påkrævede platform-claims (company_id/role)');
  }

  return {
    userId: session.user.id as UserId,
    companyId: claims.company_id as CompanyId,
    role: claims.role,
    teamId: (claims.team_id ?? null) as TeamId | null,
    enabledApps: (claims.enabled_apps ?? []) as AppKey[],
  };
}

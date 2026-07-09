/**
 * Rod-komponent: routing mellem Login / EmployeeApp / AdminApp, udelukkende
 * baseret på session.role fra @platform/auth. Ingen anden logik her — det er
 * bevidst, jf. PRS §37 Navigation ("medarbejderen skal aldrig se en menu,
 * de ikke har adgang til" håndhæves allerede af Core's filterNavByRole).
 */
import { getSupabaseClient } from '@platform/auth';
import { useEffect } from 'react';

import { AdminApp } from './admin/AdminApp';
import { LoginScreen } from './auth/LoginScreen';
import { useSession } from './auth/useSession';
import { applyBranding } from './branding';
import { EmployeeApp } from './employee/EmployeeApp';
import { getEnv } from './env';

export function App() {
  const { session, loading } = useSession();

  useEffect(() => {
    if (session) {
      void applyBranding(getSupabaseClient(getEnv()), session.companyId);
    }
  }, [session]);

  if (loading) {
    return <div style={{ padding: 24 }}>…</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (session.role === 'medarbejder') {
    return <EmployeeApp />;
  }

  // admin, teamleder og superadmin ser alle Admin-skallen i Sprint 2 — en
  // egentlig Teamleder-indskrænkning af hvilke NavItems der vises håndteres
  // allerede af filterNavByRole i AdminApp, ikke ved en separat rute her.
  return <AdminApp session={session} />;
}

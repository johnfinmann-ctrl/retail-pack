/**
 * Session-hook til RetailPackPro. Genbruger @platform/auth's
 * getPlatformSession — al fortolkning af JWT-claims (company_id/role/team_id)
 * sker i Core, ikke her. Denne hook oversætter blot Core's Promise-baserede
 * funktion til React-tilstand og lytter efter login/logout.
 */
import { getPlatformSession, getSupabaseClient } from '@platform/auth';
import type { PlatformSession } from '@platform/shared-types';
import { useEffect, useState } from 'react';

import { getEnv } from '../env';

interface SessionState {
  session: PlatformSession | null;
  loading: boolean;
  error: string | null;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, loading: true, error: null });

  useEffect(() => {
    const client = getSupabaseClient(getEnv());
    let isMounted = true;

    async function loadSession() {
      try {
        const session = await getPlatformSession(client);
        if (isMounted) setState({ session, loading: false, error: null });
      } catch {
        // Ingen aktiv session er en NORMAL tilstand (ikke logget ind endnu),
        // ikke en fejl der skal vises til brugeren.
        if (isMounted) setState({ session: null, loading: false, error: null });
      }
    }

    void loadSession();

    const { data: authListener } = client.auth.onAuthStateChange(() => {
      void loadSession();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

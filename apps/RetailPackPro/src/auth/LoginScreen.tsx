/**
 * Minimal login-skærm. Ikke i din oprindelige Trin 3-liste, men tilføjet som
 * en nødvendig forudsætning: "routing baseret på rolle" kræver en session at
 * route ud fra, og der findes ingen session uden et sted at logge ind.
 * Bruger @platform/ui's Button/Card og Core's egne "core.auth.*"-nøgler —
 * ingen ny UI-komponent, ingen ny oversættelsesnøgle opfundet her.
 */
import { getSupabaseClient } from '@platform/auth';
import { Button, Card } from '@platform/ui';
import { useState, type FormEvent } from 'react';

import { getEnv } from '../env';
import { useT } from '../i18n/I18nProvider';

export function LoginScreen() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const client = getSupabaseClient(getEnv());
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(t('core.errors.generic'));
    }
    setSubmitting(false);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: 320 }}>
        <form onSubmit={handleSubmit}>
          <h1 style={{ fontSize: 20, marginBottom: 16 }}>RetailPackPro</h1>

          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t('core.auth.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e2e5' }}
          />

          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t('core.auth.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e2e5' }}
          />

          {error && <p style={{ color: '#d93025', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <Button variant="primary" size="admin" disabled={submitting}>
            {t('core.auth.login')}
          </Button>
        </form>
      </Card>
    </div>
  );
}

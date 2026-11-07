/**
 * Demo-session i stedet for Supabase-login. Samme felter, som v0.3.0's
 * skærme brugte fra PlatformSession (userId, companyId, role).
 */
import { COMPANY_ID, USERS } from './seed';

export interface DemoSession {
  userId: string;
  companyId: string;
  role: 'medarbejder' | 'admin';
  fullName: string;
}

export function sessionFor(role: 'medarbejder' | 'admin'): DemoSession {
  const user = role === 'admin' ? USERS.admin : USERS.employee;
  return { userId: user.id, companyId: COMPANY_ID, role, fullName: user.fullName };
}

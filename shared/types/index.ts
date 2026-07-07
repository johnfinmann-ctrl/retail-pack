/**
 * Delte platform-typer. Ingen RetailPackPro- eller anden app-specifik logik
 * hører hjemme her — kun kontrakter alle apps og pakker kan bygge på.
 */

/** Branded UUID-type, så vi ikke ved en fejl blander fx CompanyId og UserId. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type CompanyId = Brand<string, 'CompanyId'>;
export type UserId = Brand<string, 'UserId'>;
export type TeamId = Brand<string, 'TeamId'>;

/** Platform-roller — gælder på tværs af alle apps (PRS §9). */
export const PlatformRole = {
  SuperAdmin: 'superadmin',
  Admin: 'admin',
  TeamLeader: 'teamleder',
  Employee: 'medarbejder',
} as const;

export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

/** Apps registreret på platformen (PRS §42 + ADR-0001). */
export const AppKey = {
  RetailPackPro: 'retailpackpro',
  SafetyScan: 'safetyscan',
  FreshScan: 'freshscan',
  NoteScan: 'notescan',
  LayoutScan: 'layoutscan',
} as const;

export type AppKey = (typeof AppKey)[keyof typeof AppKey];

/** Standardfelter enhver tenant-tabel skal have (PRS §17 Database-standarder). */
export interface Timestamped {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface SoftDeletable {
  deletedAt: string | null;
}

export interface TenantScoped {
  companyId: CompanyId;
}

/** Session-brugeren efter login — det minimale, alle apps har brug for. */
export interface PlatformSession {
  userId: UserId;
  companyId: CompanyId;
  role: PlatformRole;
  teamId: TeamId | null;
  enabledApps: readonly AppKey[];
}

/** Generisk resultat-type til fejlhåndtering uden exceptions på tværs af lag. */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },
};

/**
 * Rene hjælpefunktioner uden sideeffekter eller eksterne afhængigheder,
 * så de kan bruges i klient, Edge Functions og tests uden forskel.
 */

/** Simpel, afhængighedsfri e-mail-formvalidering (ikke RFC-komplet — kun UX-niveau). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Slugify til fx virksomheds-slugs i URL'er. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // fjern accenter (fx æøå-varianter der har diakritiske tegn)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9æøå]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Formaterer en ISO-dato til dansk visningsformat (dd.mm.åååå). */
export function formatDateDa(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Ugyldig dato: ${isoDate}`);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

/** Klipper en streng til maks længde med "…" — bruges til korte UI-labels. */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

/** Genererer en idempotens-nøgle til offline-køen (ikke kryptografisk, kun til deduplikering). */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Type-guard til at udelukke null/undefined i array-filtre (fx billeder.filter(isDefined)). */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

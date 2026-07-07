import type { PlatformRole } from '@platform/shared-types';

/**
 * Ét menupunkt i Admin/SuperAdmin-sidemenuen (PRS §37 Navigation). Rene
 * data — selve routingen (React Router, TanStack Router e.l.) vælges af den
 * enkelte app, denne pakke definerer kun KONTRAKTEN for et menupunkt.
 */
export interface NavItem {
  key: string;
  labelKey: string; // i18n-nøgle, fx "core.nav.dashboard"
  path: string;
  /** Hvilke roller kan se dette menupunkt. Tomt = alle roller med adgang til shell'en. */
  visibleTo?: readonly PlatformRole[];
  icon?: string;
}

export interface NavSection {
  key: string;
  items: readonly NavItem[];
}

/** Filtrerer navigation efter den aktive brugers rolle — samme funktion for alle apps. */
export function filterNavByRole(sections: readonly NavSection[], role: PlatformRole): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.visibleTo || item.visibleTo.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

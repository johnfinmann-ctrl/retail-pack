/**
 * Dashboard-widget-kontrakt (PRS §20/§32). Hver app leverer kun data ind i
 * dette skelet — ingen app bygger sit eget graf-bibliotek eller layout.
 */
export interface DashboardTrend {
  direction: 'up' | 'down' | 'flat';
  /** Positivt tal, fortolkes sammen med `direction` (fx +12%). */
  value: number;
}

export interface DashboardWidget {
  key: string;
  titleKey: string; // i18n-nøgle
  value: number | string;
  trend?: DashboardTrend;
  onClick?: () => void;
}

/**
 * Notification Service — kontrakt (PRS §12/§19). Tre kanaler bag én
 * afsender-kontrakt: in-app, push og e-mail, udvidbar med flere senere
 * (SMS/Teams) uden at ændre kaldende kode.
 */
export type NotificationChannel = 'in_app' | 'push' | 'email';

export interface NotifyRequest {
  companyId: string;
  appKey: string;
  targetRole?: string;
  targetUserId?: string;
  channels: readonly NotificationChannel[];
  titleKey: string; // i18n-nøgle
  bodyKey: string; // i18n-nøgle
  relatedEntity?: { type: string; id: string };
}

export interface NotificationChannelAdapter {
  channel: NotificationChannel;
  send(request: NotifyRequest): Promise<void>;
}

export interface NotificationService {
  notify(request: NotifyRequest): Promise<void>;
}

/**
 * Sammensætter en NotificationService fra en liste af kanal-adaptere.
 * En ny kanal (fx SMS) kræver kun én ny adapter — ikke ændringer her
 * eller i kaldende apps (samme mønster som AI Service Layer, PRS §9).
 */
export function createNotificationService(adapters: readonly NotificationChannelAdapter[]): NotificationService {
  return {
    async notify(request: NotifyRequest): Promise<void> {
      const relevant = adapters.filter((adapter) => request.channels.includes(adapter.channel));
      await Promise.all(relevant.map((adapter) => adapter.send(request)));
    },
  };
}

/**
 * Udviklings-/test-adapter — logger notifikationer i stedet for at sende
 * dem. De rigtige kanal-adaptere (Web Push, transaktionel e-mail) tilføjes,
 * når Notification Service bygges færdig i et senere sprint.
 */
import type { Logger } from '@platform/logging';

import type { NotificationChannel, NotificationChannelAdapter, NotifyRequest } from './types';

export function createConsoleChannel(channel: NotificationChannel, logger: Logger): NotificationChannelAdapter {
  return {
    channel,
    async send(request: NotifyRequest): Promise<void> {
      logger.info(`[${channel}] notifikation sendt (dev-stub)`, {
        appKey: request.appKey,
        companyId: request.companyId,
        titleKey: request.titleKey,
      });
    },
  };
}

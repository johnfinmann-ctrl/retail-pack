import { describe, expect, it } from 'vitest';

import { createNotificationService, type NotificationChannelAdapter, type NotifyRequest } from '../types';

function fakeAdapter(channel: NotificationChannelAdapter['channel']) {
  const sent: NotifyRequest[] = [];
  return {
    adapter: { channel, send: async (r: NotifyRequest) => void sent.push(r) } as NotificationChannelAdapter,
    sent,
  };
}

describe('createNotificationService', () => {
  it('sender kun til de kanaler, der er angivet i requestet', async () => {
    const inApp = fakeAdapter('in_app');
    const push = fakeAdapter('push');
    const email = fakeAdapter('email');
    const service = createNotificationService([inApp.adapter, push.adapter, email.adapter]);

    await service.notify({
      companyId: 'company-1',
      appKey: 'retailpackpro',
      channels: ['in_app', 'push'],
      titleKey: 'x',
      bodyKey: 'y',
    });

    expect(inApp.sent).toHaveLength(1);
    expect(push.sent).toHaveLength(1);
    expect(email.sent).toHaveLength(0);
  });
});

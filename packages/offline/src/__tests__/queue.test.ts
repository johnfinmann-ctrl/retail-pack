import { describe, expect, it } from 'vitest';

import { OfflineQueue } from '../queue';
import { InMemoryStorageAdapter } from '../storageAdapter';

describe('OfflineQueue', () => {
  it('lægger en handling i køen', async () => {
    const queue = new OfflineQueue(new InMemoryStorageAdapter());
    await queue.enqueue({
      idempotencyKey: 'key-1',
      appKey: 'retailpackpro',
      entityType: 'pack_session',
      payload: { productId: 'p-1' },
    });
    expect(await queue.pending()).toHaveLength(1);
  });

  it('dublerer IKKE en handling med samme idempotens-nøgle (kernegarantien)', async () => {
    const queue = new OfflineQueue(new InMemoryStorageAdapter());
    const params = {
      idempotencyKey: 'same-key',
      appKey: 'retailpackpro',
      entityType: 'pack_session',
      payload: { productId: 'p-1' },
    };
    await queue.enqueue(params);
    await queue.enqueue(params); // simulerer at appen forsøger igen efter tab af forbindelse
    expect(await queue.pending()).toHaveLength(1);
  });

  it('synkroniserer og fjerner elementer, der lykkes', async () => {
    const queue = new OfflineQueue(new InMemoryStorageAdapter());
    await queue.enqueue({
      idempotencyKey: 'key-1',
      appKey: 'retailpackpro',
      entityType: 'pack_session',
      payload: {},
    });

    const result = await queue.sync(async () => {
      /* simuler succesfuldt Supabase-kald */
    });

    expect(result).toEqual({ succeeded: 1, failed: 0 });
    expect(await queue.pending()).toHaveLength(0);
  });

  it('beholder et element i køen, hvis synkronisering fejler, uden at stoppe resten', async () => {
    const queue = new OfflineQueue(new InMemoryStorageAdapter());
    await queue.enqueue({ idempotencyKey: 'fails', appKey: 'x', entityType: 'y', payload: {} });
    await queue.enqueue({ idempotencyKey: 'succeeds', appKey: 'x', entityType: 'y', payload: {} });

    const result = await queue.sync(async (item) => {
      if (item.idempotencyKey === 'fails') throw new Error('netværksfejl');
    });

    expect(result).toEqual({ succeeded: 1, failed: 1 });
    const remaining = await queue.pending();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.idempotencyKey).toBe('fails');
  });
});

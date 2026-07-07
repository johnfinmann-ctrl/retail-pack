/**
 * Offline write-queue (PRS §21/§14). Enhver "skriv når offline"-handling
 * lægges her med en idempotens-nøgle, så en handling aldrig dubleres, hvis
 * synkronisering afbrydes og genstartes.
 */
import type { Logger } from '@platform/logging';

import type { OfflineStorageAdapter } from './storageAdapter';

export interface OfflineQueueItem<TPayload = unknown> {
  idempotencyKey: string;
  appKey: string;
  entityType: string;
  payload: TPayload;
  enqueuedAt: string; // ISO 8601
}

export interface EnqueueParams<TPayload> {
  idempotencyKey: string;
  appKey: string;
  entityType: string;
  payload: TPayload;
}

export type SyncHandler = (item: OfflineQueueItem) => Promise<void>;

export class OfflineQueue {
  constructor(
    private readonly adapter: OfflineStorageAdapter,
    private readonly logger?: Logger,
  ) {}

  async enqueue<TPayload>(params: EnqueueParams<TPayload>): Promise<void> {
    const existing = await this.adapter.getAll();
    const alreadyQueued = existing.some((raw) => {
      const parsed = JSON.parse(raw) as OfflineQueueItem;
      return parsed.idempotencyKey === params.idempotencyKey;
    });

    if (alreadyQueued) {
      this.logger?.warn('Handling er allerede i offline-køen — springer over', {
        idempotencyKey: params.idempotencyKey,
      });
      return;
    }

    const item: OfflineQueueItem<TPayload> = { ...params, enqueuedAt: new Date().toISOString() };
    await this.adapter.add(JSON.stringify(item));
  }

  async pending(): Promise<OfflineQueueItem[]> {
    const raw = await this.adapter.getAll();
    return raw.map((item) => JSON.parse(item) as OfflineQueueItem);
  }

  /**
   * Synkroniserer alle ventende handlinger. Fjerner et element fra køen,
   * så snart det er lykkedes — fejler ét element aldrig resten af køen.
   * Arbejder på de RÅ strenge (ikke genserialiserede), så et element altid
   * kan fjernes præcist, uanset nøgle-rækkefølge i JSON'en.
   */
  async sync(handler: SyncHandler): Promise<{ succeeded: number; failed: number }> {
    const rawItems = await this.adapter.getAll();
    let succeeded = 0;
    let failed = 0;

    for (const raw of rawItems) {
      const item = JSON.parse(raw) as OfflineQueueItem;
      try {
        await handler(item);
        await this.adapter.remove(raw);
        succeeded += 1;
      } catch (error) {
        failed += 1;
        this.logger?.error('Synkronisering af offline-handling fejlede — forbliver i køen', {
          idempotencyKey: item.idempotencyKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { succeeded, failed };
  }
}

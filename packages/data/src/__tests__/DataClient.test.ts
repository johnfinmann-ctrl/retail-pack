import { InMemoryLogger } from '@platform/logging';
import { describe, expect, it } from 'vitest';

import { createDataClient, type RawResult } from '../DataClient';

// Fake Supabase-klient — kun det createDataClient reelt bruger (.schema()).
function fakeSupabaseClient() {
  return {
    schema: (name: string) => ({ schemaName: name }),
  } as unknown as Parameters<typeof createDataClient>[0];
}

function resolved<T>(result: RawResult<T>): PromiseLike<RawResult<T>> {
  return Promise.resolve(result);
}

describe('createDataClient', () => {
  it('schema() delegerer til den underliggende klient', () => {
    const dataClient = createDataClient(fakeSupabaseClient());
    const scoped = dataClient.schema('retailpackpro') as unknown as { schemaName: string };
    expect(scoped.schemaName).toBe('retailpackpro');
  });

  it('run() returnerer data ved succes', async () => {
    const dataClient = createDataClient(fakeSupabaseClient());
    const result = await dataClient.run(resolved({ data: { id: '1' }, error: null }));
    expect(result).toEqual({ id: '1' });
  });

  it('run() kaster en normaliseret AppError ved fejl, IKKE den rå Postgrest-fejl', async () => {
    const dataClient = createDataClient(fakeSupabaseClient());
    await expect(
      dataClient.run(resolved({ data: null, error: { message: 'kunne ikke forbinde' } })),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
  });

  it('runMany() normaliserer null til tomt array', async () => {
    const dataClient = createDataClient(fakeSupabaseClient());
    const result = await dataClient.runMany(resolved<{ id: string }[]>({ data: null, error: null }));
    expect(result).toEqual([]);
  });

  it('runMany() returnerer listen uændret ved succes', async () => {
    const dataClient = createDataClient(fakeSupabaseClient());
    const result = await dataClient.runMany(resolved({ data: [{ id: '1' }, { id: '2' }], error: null }));
    expect(result).toHaveLength(2);
  });

  it('logger.error() kaldes ved fejl, hvis en logger er givet — centraliseret logging', async () => {
    const logger = new InMemoryLogger();
    const dataClient = createDataClient(fakeSupabaseClient(), logger);

    await expect(
      dataClient.run(resolved({ data: null, error: { message: 'boom' } })),
    ).rejects.toThrow();

    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]?.level).toBe('error');
  });

  it('logger kaldes IKKE ved succes', async () => {
    const logger = new InMemoryLogger();
    const dataClient = createDataClient(fakeSupabaseClient(), logger);

    await dataClient.run(resolved({ data: { ok: true }, error: null }));

    expect(logger.entries).toHaveLength(0);
  });
});

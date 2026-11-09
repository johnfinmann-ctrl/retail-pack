/**
 * Lokal implementering af DataStore: ét JSON-dokument i localStorage +
 * billeder/PDF'er i IndexedDB. Ingen netværkskald — kan aldrig skrive til
 * en produktionsdatabase eller til AX.
 */
import type { BlobStore, JsonStorage } from '../../demo/storage';
import type { CollectionName, Collections, DataStore } from '../domain/store';

import { createSeedV5, SCHEMA_VERSION, type StateV5 } from './seed';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class LocalStore implements DataStore {
  state: StateV5;
  lastSaveOk = true;
  freshlySeeded = false;
  private batching = 0;
  private listeners = new Set<() => void>();

  constructor(
    private readonly storage: JsonStorage<StateV5>,
    readonly blobs: BlobStore,
  ) {
    const stored = storage.read();
    if (stored && stored.schemaVersion === SCHEMA_VERSION) this.state = stored;
    else {
      this.state = createSeedV5();
      this.freshlySeeded = true;
      this.save();
    }
  }

  get persistent(): boolean {
    return this.storage.persistent && this.blobs.persistent;
  }

  private save() {
    if (this.batching > 0) return;
    this.lastSaveOk = this.storage.write(this.state);
    this.listeners.forEach((l) => l());
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  async reset(): Promise<void> {
    this.storage.clear();
    await this.blobs.clear();
    this.state = createSeedV5();
    this.freshlySeeded = true;
    this.save();
  }

  userName(id: string | null): string | null {
    return id ? (this.state.users.find((u) => u.id === id)?.fullName ?? null) : null;
  }

  async list<C extends CollectionName>(c: C): Promise<Collections[C][]> {
    return clone(this.state[c] as Collections[C][]);
  }

  async get<C extends CollectionName>(c: C, id: string): Promise<Collections[C] | null> {
    const row = (this.state[c] as unknown as Array<Collections[C] & { id: string }>).find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async insert<C extends CollectionName>(c: C, row: Collections[C]): Promise<Collections[C]> {
    (this.state[c] as Collections[C][]).push(clone(row));
    this.save();
    return clone(row);
  }

  async update<C extends CollectionName>(c: C, id: string, patch: Partial<Collections[C]>): Promise<Collections[C]> {
    const rows = this.state[c] as unknown as Array<Collections[C] & { id: string }>;
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error(`Rækken findes ikke (${c})`);
    rows[i] = { ...rows[i]!, ...clone(patch) };
    this.save();
    return clone(rows[i]!);
  }

  async remove<C extends CollectionName>(c: C, id: string): Promise<void> {
    (this.state as Record<string, unknown>)[c] = (this.state[c] as Array<{ id: string }>).filter((r) => r.id !== id);
    this.save();
  }

  async transaction(run: () => Promise<void>): Promise<void> {
    const before = JSON.stringify(this.state);
    this.batching++;
    try {
      await run();
    } catch (e) {
      this.state = JSON.parse(before) as StateV5; // alt eller intet
      throw e;
    } finally {
      this.batching--;
    }
    this.save();
  }
}

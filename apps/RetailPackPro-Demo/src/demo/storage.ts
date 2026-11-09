/**
 * Lokal testlagring til demoen — ALDRIG en produktionsdatabase.
 *
 * - Strukturerede data (kunder, produkter, vejledninger, ordrer …) gemmes som
 *   ét JSON-dokument i localStorage.
 * - Billeder (fotos og uploadede billeder) gemmes i IndexedDB, fordi
 *   localStorage er for lille til billeder.
 * - Er browserlagring blokeret (fx privat vindue), kører demoen videre i
 *   hukommelsen, og brugerfladen viser, at intet gemmes ved genindlæsning.
 */
const DB_NAME = 'retailpackpro-demo';
const STORE = 'files';

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // ikke-sikker kontekst — falder tilbage nedenfor
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ----------------------------------------------------------- JSON-dokument

export class JsonStorage<T> {
  private memory: string | null = null;
  public readonly persistent: boolean;

  constructor(private readonly key: string) {
    this.persistent = JsonStorage.probe();
  }

  private static probe(): boolean {
    try {
      const k = '__rpp_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  read(): T | null {
    try {
      const raw = this.persistent ? window.localStorage.getItem(this.key) : this.memory;
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** Returnerer false, hvis browseren afviste at gemme (fx fuld lagerkvote). */
  write(value: T): boolean {
    const raw = JSON.stringify(value);
    this.memory = raw;
    if (!this.persistent) return false;
    try {
      window.localStorage.setItem(this.key, raw);
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    this.memory = null;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // ignoreres — intet at rydde
    }
  }
}

// ----------------------------------------------------------- Billedlager

export interface BlobStore {
  readonly persistent: boolean;
  put(id: string, data: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

class MemoryBlobStore implements BlobStore {
  readonly persistent = false;
  private readonly map = new Map<string, Blob>();
  async put(id: string, data: Blob) {
    this.map.set(id, data);
  }
  async get(id: string) {
    return this.map.get(id) ?? null;
  }
  async delete(id: string) {
    this.map.delete(id);
  }
  async clear() {
    this.map.clear();
  }
}

class IndexedDbBlobStore implements BlobStore {
  readonly persistent = true;
  constructor(private readonly db: IDBDatabase) {}

  private tx<R>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    return new Promise((resolve, reject) => {
      const request = run(this.db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB-fejl'));
    });
  }
  async put(id: string, data: Blob) {
    await this.tx('readwrite', (s) => s.put(data, id));
  }
  async get(id: string) {
    const value = await this.tx<unknown>('readonly', (s) => s.get(id));
    return value instanceof Blob ? value : null;
  }
  async delete(id: string) {
    await this.tx('readwrite', (s) => s.delete(id));
  }
  async clear() {
    await this.tx('readwrite', (s) => s.clear());
  }
}

export async function openBlobStore(dbName: string = DB_NAME): Promise<BlobStore> {
  if (typeof indexedDB === 'undefined') return new MemoryBlobStore();
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB kunne ikke åbnes'));
      request.onblocked = () => reject(new Error('IndexedDB blokeret'));
    });
    return new IndexedDbBlobStore(db);
  } catch {
    return new MemoryBlobStore();
  }
}

export function createMemoryBlobStore(): BlobStore {
  return new MemoryBlobStore();
}

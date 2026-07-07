/**
 * Pluggable lagringsbagvedliggende for offline-køen. IndexedDB i browseren,
 * in-memory i tests/Node — koden i queue.ts kender ikke til forskellen.
 */
export interface OfflineStorageAdapter {
  getAll(): Promise<string[]>;
  add(serializedItem: string): Promise<void>;
  remove(serializedItem: string): Promise<void>;
}

export class InMemoryStorageAdapter implements OfflineStorageAdapter {
  private items: string[] = [];

  async getAll(): Promise<string[]> {
    return [...this.items];
  }
  async add(serializedItem: string): Promise<void> {
    this.items.push(serializedItem);
  }
  async remove(serializedItem: string): Promise<void> {
    this.items = this.items.filter((item) => item !== serializedItem);
  }
}

/**
 * Browser-implementering. Bruges kun i faktiske PWA-apps — guardes med et
 * runtime-tjek, så pakken stadig kan importeres og testes i Node.
 */
export class IndexedDbStorageAdapter implements OfflineStorageAdapter {
  constructor(
    private readonly dbName = 'platform-offline-queue',
    private readonly storeName = 'items',
  ) {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDbStorageAdapter kræver et browser-miljø med IndexedDB');
    }
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(this.storeName, { autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<string[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).getAll();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  }

  async add(serializedItem: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).add(serializedItem);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async remove(serializedItem: string): Promise<void> {
    const all = await this.getAll();
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.clear();
      for (const item of all) {
        if (item !== serializedItem) store.add(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

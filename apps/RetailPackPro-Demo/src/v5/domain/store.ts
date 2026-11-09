/**
 * Datakontrakt for v0.5. Services kender KUN denne kontrakt — demoens lokale
 * lager og en senere Supabase-implementering (én tabel pr. samling) er
 * udskiftelige.
 */
import type { BlobStore } from '../../demo/storage';

import type { AxEvent, AxInbound, Chain, ChainFormat, PalletRecord, PhotoRecordV5, Pickroute, RuleSet, SourceDocument, Warehouse } from './types';

export interface Collections {
  chains: Chain;
  formats: ChainFormat;
  warehouses: Warehouse;
  documents: SourceDocument;
  ruleSets: RuleSet;
  pickroutes: Pickroute;
  pallets: PalletRecord;
  photos: PhotoRecordV5;
  axEvents: AxEvent;
  axInbound: AxInbound;
}

export type CollectionName = keyof Collections;

export interface DemoUserV5 {
  id: string;
  fullName: string;
  role: 'medarbejder' | 'regelansvarlig' | 'kontrollant';
}

export interface DataStore {
  list<C extends CollectionName>(c: C): Promise<Collections[C][]>;
  get<C extends CollectionName>(c: C, id: string): Promise<Collections[C] | null>;
  insert<C extends CollectionName>(c: C, row: Collections[C]): Promise<Collections[C]>;
  update<C extends CollectionName>(c: C, id: string, patch: Partial<Collections[C]>): Promise<Collections[C]>;
  remove<C extends CollectionName>(c: C, id: string): Promise<void>;
  /** Flere ændringer, der skal gemmes samlet (fx publicering). */
  transaction(run: () => Promise<void>): Promise<void>;
  userName(id: string | null): string | null;
  readonly blobs: BlobStore;
}

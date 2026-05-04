import Dexie, { type Table } from 'dexie';
import type { Collection, Endpoint, RequestLog } from '../types';

class EndpointSimDB extends Dexie {
  collections!: Table<Collection>;
  endpoints!: Table<Endpoint>;
  requestLogs!: Table<RequestLog>;

  constructor() {
    super('EndpointSimDB');
    this.version(1).stores({
      collections: 'id, userId, name, updatedAt',
      endpoints: 'id, collectionId, slug, name, updatedAt',
      requestLogs: 'id, endpointId, endpointSlug, timestamp',
    });
  }
}

export const db = new EndpointSimDB();

export const clearLocalData = async () => {
  await db.collections.clear();
  await db.endpoints.clear();
  await db.requestLogs.clear();
};

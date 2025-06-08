import { openDB } from 'idb';

const DB_NAME = 'freedive-timer';
const STORE_NAME = 'custom-sounds';
const DB_VERSION = 1;

export type StoredSound = {
  name: string;
  blob: Blob;
};

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

export async function saveSound(id: string, data: StoredSound) {
  const db = await dbPromise;
  await db.put(STORE_NAME, data, id);
}

export async function getSound(id: string): Promise<StoredSound | undefined> {
  const db = await dbPromise;
  return (await db.get(STORE_NAME, id)) as StoredSound | undefined;
}

export async function deleteSound(id: string) {
  const db = await dbPromise;
  await db.delete(STORE_NAME, id);
}

export async function listSoundIds(): Promise<IDBValidKey[]> {
  const db = await dbPromise;
  return db.getAllKeys(STORE_NAME);
}

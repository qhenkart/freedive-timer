"use client";
import { openDB } from "idb";

const DB_NAME = "freedive-timer";
const STORE_NAME = "custom-sounds";
const DB_VERSION = 1;

export type StoredSound = {
  name: string;
  blob: Blob;
};

const dbPromise =
  typeof window !== "undefined"
    ? openDB(DB_NAME, DB_VERSION, {
        upgrade: (db) =>
          db.objectStoreNames.contains(STORE_NAME) ||
          db.createObjectStore(STORE_NAME),
      })
    : undefined;

const getDb = async () => {
  if (!dbPromise) throw new Error("IndexedDB unavailable in SSR");
  return dbPromise;
};

export const saveSound = async (id: string, data: StoredSound) =>
  (await getDb()).put(STORE_NAME, data, id);

export const getSound = async (id: string): Promise<StoredSound | undefined> =>
  (await getDb()).get(STORE_NAME, id) as Promise<StoredSound | undefined>;

export const deleteSound = async (id: string) =>
  (await getDb()).delete(STORE_NAME, id);

export const listSoundIds = async (): Promise<IDBValidKey[]> =>
  (await getDb()).getAllKeys(STORE_NAME);

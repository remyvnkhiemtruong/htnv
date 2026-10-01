import type { PoeticAxisId, PoeticAxisResponse } from '../../types';

export interface DraftRecoveryRecord {
  key: string;
  userId: string;
  assignmentId: string;
  draft: Record<PoeticAxisId, PoeticAxisResponse>;
  draftRevision: number;
  updatedAt: number;
}

const DB_NAME = 'htnv-offline';
const DB_VERSION = 1;
const STORE = 'drafts';
const fallbackPrefix = 'htnv_idb_fallback_draft_';

const keyFor = (userId: string, assignmentId: string) => `${userId}:${assignmentId}`;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('INDEXEDDB_UNAVAILABLE'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('INDEXEDDB_OPEN_FAILED'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, task: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = task(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('INDEXEDDB_REQUEST_FAILED'));
      transaction.onabort = () => reject(transaction.error || new Error('INDEXEDDB_TRANSACTION_ABORTED'));
    });
  } finally {
    db.close();
  }
}

function fallbackGet(userId: string, assignmentId: string): DraftRecoveryRecord | null {
  try {
    const raw = localStorage.getItem(fallbackPrefix + keyFor(userId, assignmentId));
    return raw ? JSON.parse(raw) as DraftRecoveryRecord : null;
  } catch {
    return null;
  }
}

export async function saveDraftRecovery(record: Omit<DraftRecoveryRecord, 'key' | 'updatedAt'> & { updatedAt?: number }) {
  const next: DraftRecoveryRecord = {
    ...record,
    key: keyFor(record.userId, record.assignmentId),
    updatedAt: record.updatedAt || Date.now()
  };
  try {
    await withStore('readwrite', store => store.put(next));
    try { localStorage.removeItem(fallbackPrefix + next.key); } catch { /* ignore */ }
  } catch {
    try { localStorage.setItem(fallbackPrefix + next.key, JSON.stringify(next)); } catch { /* ignore */ }
  }
  return next;
}

export async function getDraftRecovery(userId: string, assignmentId: string): Promise<DraftRecoveryRecord | null> {
  const key = keyFor(userId, assignmentId);
  try {
    const record = await withStore<DraftRecoveryRecord | undefined>('readonly', store => store.get(key));
    return record || fallbackGet(userId, assignmentId);
  } catch {
    return fallbackGet(userId, assignmentId);
  }
}

export async function clearDraftRecovery(userId: string, assignmentId: string) {
  const key = keyFor(userId, assignmentId);
  try { await withStore('readwrite', store => store.delete(key)); } catch { /* fallback cleanup below */ }
  try { localStorage.removeItem(fallbackPrefix + key); } catch { /* ignore */ }
}

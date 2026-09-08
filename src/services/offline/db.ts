import type { OfflineQueueItem } from '@/types'

/**
 * Tiny IndexedDB wrapper for the offline-first ASHA workflow.
 *
 * Two stores:
 *  - `queue`  : actions taken while offline, waiting for prototype sync
 *  - `cache`  : essential records cached for offline reading (patients,
 *               facilities, emergency contacts)
 *
 * If IndexedDB is unavailable (private mode, old browser) every call falls
 * back to localStorage so the UI never breaks.
 */

const DB_NAME = 'ruralcare-offline'
const DB_VERSION = 1
const QUEUE_STORE = 'queue'
const CACHE_STORE = 'cache'
const LS_PREFIX = 'ruralcare.offline.'

let dbPromise: Promise<IDBDatabase> | null = null

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) return Promise.reject(new Error('IndexedDB unavailable'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE)
      }
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB open failed'))
    }
  })
  return dbPromise
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage full or blocked - the in-memory store still works */
  }
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export async function saveQueuedAction(item: OfflineQueueItem): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      tx.objectStore(QUEUE_STORE).put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    const items = lsGet<OfflineQueueItem[]>('queue', []).filter((i) => i.id !== item.id)
    items.push(item)
    lsSet('queue', items)
  }
}

export async function readQueuedActions(): Promise<OfflineQueueItem[]> {
  try {
    const db = await openDb()
    return await new Promise<OfflineQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly')
      const request = tx.objectStore(QUEUE_STORE).getAll()
      request.onsuccess = () => resolve((request.result ?? []) as OfflineQueueItem[])
      request.onerror = () => reject(request.error)
    })
  } catch {
    return lsGet<OfflineQueueItem[]>('queue', [])
  }
}

export async function updateQueuedAction(item: OfflineQueueItem): Promise<void> {
  await saveQueuedAction(item)
}

export async function clearSyncedActions(): Promise<void> {
  const items = await readQueuedActions()
  const pending = items.filter((i) => i.status !== 'synced')
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      store.clear()
      for (const item of pending) store.put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    lsSet('queue', pending)
  }
}

// ---------------------------------------------------------------------------
// Cache of essential records
// ---------------------------------------------------------------------------

export async function cacheEssential(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite')
      tx.objectStore(CACHE_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    lsSet(`cache.${key}`, value)
  }
}

export async function readEssential<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDb()
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readonly')
      const request = tx.objectStore(CACHE_STORE).get(key)
      request.onsuccess = () => resolve((request.result as T) ?? fallback)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return lsGet<T>(`cache.${key}`, fallback)
  }
}

export function storageBackendName(): string {
  return hasIndexedDb() ? 'IndexedDB' : 'localStorage'
}

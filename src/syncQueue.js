// ─── IndexedDB Sync Queue (Phase 5 stub) ────────────────────────────
// Provides offline mutation queuing for eventual backend sync.
// Currently dormant: all methods are functional but the drain/flush
// path is a no-op until /api/sync exists (Phase 5).
//
// Usage (after Phase 5 backend is live):
//   import { enqueueMutation, getSyncStatus } from "./syncQueue";
//   // After any local write:
//   enqueueMutation("workOrders", "update", { id: "wo1", status: "resolved" });
//   // The service worker's "sync" event will drain the queue when online.

const DB_NAME = "les-sync";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

// ─── Open IndexedDB ────────────────────────────────────────────────

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("collection", "collection", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Enqueue a mutation ────────────────────────────────────────────
// Call this after every local write (saveDB) once backend exists.
// mutation shape: { collection, operation, payload, timestamp, synced }

export async function enqueueMutation(collection, operation, payload) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const mutation = {
      collection,       // e.g., "workOrders", "tools", "bookings"
      operation,         // "create" | "update" | "delete"
      payload,           // the data object or { id } for deletes
      timestamp: Date.now(),
      synced: false,
    };
    const request = store.add(mutation);
    request.onsuccess = () => {
      resolve(request.result);
      // Request background sync if supported
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.sync.register("les-sync-queue").catch(() => {
            // SyncManager not available; will retry on next online event
          });
        });
      }
    };
    request.onerror = () => reject(request.error);
    db.close();
  });
}

// ─── Get pending (unsynced) mutations ──────────────────────────────

export async function getPendingMutations() {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("synced");
    const request = index.getAll(false);
    request.onsuccess = () => {
      resolve(request.result);
      db.close();
    };
    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

// ─── Mark mutations as synced ──────────────────────────────────────

export async function markSynced(ids) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    let completed = 0;
    for (const id of ids) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.synced = true;
          store.put(record);
        }
        completed++;
        if (completed === ids.length) resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    }
    if (ids.length === 0) resolve();
    db.close();
  });
}

// ─── Clear all synced mutations (housekeeping) ─────────────────────

export async function clearSyncedMutations() {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("synced");
    const request = index.openCursor(true);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
    db.close();
  });
}

// ─── Sync status for UI ────────────────────────────────────────────

export async function getSyncStatus() {
  try {
    const pending = await getPendingMutations();
    return {
      pendingCount: pending.length,
      oldestPending: pending.length > 0 ? pending[0].timestamp : null,
      isOnline: navigator.onLine,
      // Phase 5: add lastSyncedAt from a separate metadata store
      lastSyncedAt: null,
    };
  } catch {
    return {
      pendingCount: 0,
      oldestPending: null,
      isOnline: navigator.onLine,
      lastSyncedAt: null,
    };
  }
}

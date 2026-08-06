// Offline outbox (Stage 11.2) — an IndexedDB queue of stock operations made while
// offline. The server stays the source of truth: entries are replayed in order when
// connectivity returns, and only removed once the server accepts them.
const DB = 'ttr_outbox';
const STORE = 'ops';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then((db) => new Promise<T>((res, rej) => {
    const t = db.transaction(STORE, mode);
    const rq = fn(t.objectStore(STORE));
    rq.onsuccess = () => res(rq.result as T);
    rq.onerror = () => rej(rq.error);
  }));
}

export interface OutboxOp { id: string; kind: string; payload: any; label: string; createdAt: number }

export async function enqueue(op: Omit<OutboxOp, 'id' | 'createdAt'>): Promise<OutboxOp> {
  const full: OutboxOp = { ...op, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
  await tx('readwrite', (s) => s.add(full));
  return full;
}
export async function allOps(): Promise<OutboxOp[]> {
  const items = await tx<OutboxOp[]>('readonly', (s) => s.getAll());
  return (items || []).sort((a, b) => a.createdAt - b.createdAt);
}
export async function removeOp(id: string): Promise<void> { await tx('readwrite', (s) => s.delete(id)); }
export async function countOps(): Promise<number> { return tx<number>('readonly', (s) => s.count()); }

// Replay queued ops through `send`. Stops at the first failure (keeps order); returns
// how many synced. Ops the server rejects with a 4xx are dropped (won't ever succeed).
export async function flush(send: (op: OutboxOp) => Promise<void>): Promise<{ synced: number; failed: number }> {
  let synced = 0, failed = 0;
  for (const op of await allOps()) {
    try { await send(op); await removeOp(op.id); synced++; }
    catch (e: any) {
      const status = e?.status ?? e?.statusCode;
      if (status >= 400 && status < 500) { await removeOp(op.id); failed++; } // permanent error → drop
      else break; // transient/offline → stop, retry later
    }
  }
  return { synced, failed };
}

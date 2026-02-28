// ============================================================
//  IndexedDB WRAPPER
// ============================================================
const DB_NAME = 'AutoPartsPro';
const DB_VERSION = 2;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('apiCache')) d.createObjectStore('apiCache', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('vehicles')) d.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('clients')) d.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('suppliers')) d.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('inventory')) d.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('movements')) d.createObjectStore('movements', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('invoices')) d.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('orders')) d.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, data) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    const r = s.put(data);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function dbGet(store, key) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const r = tx.objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function dbGetAll(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const r = tx.objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

async function dbDelete(store, key) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const r = tx.objectStore(store).delete(key);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

async function dbClear(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const r = tx.objectStore(store).clear();
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

async function dbCount(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const r = tx.objectStore(store).count();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

// ============================================================
//  API CACHE (24h TTL)
// ============================================================
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

async function cachedApiCall(cacheKey, fetchFn) {
  try {
    const cached = await dbGet('apiCache', cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      cached._fromCache = true;
      return cached.data;
    }
  } catch(e) {}
  
  const data = await fetchFn();
  try {
    await dbPut('apiCache', { key: cacheKey, data, timestamp: Date.now() });
  } catch(e) {}
  return data;
}

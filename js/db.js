// db.js - 原生 IndexedDB 的 Promise 封装，并带 localStorage 兜底
// 兜底原因：在受限 / 沙箱 origin（opaque origin）下 IndexedDB 不可用，
// 此时自动降级到 localStorage，保证应用仍可正常记录与交互。
const DB_NAME = 'inspire-db';
const DB_VERSION = 1;
let dbPromise = null;
let mode = (typeof indexedDB !== 'undefined') ? 'idb' : 'local';

// ---- localStorage 兜底实现 ----
const LS_PREFIX = 'inspire_';
function lsRead(name) { try { return JSON.parse(localStorage.getItem(LS_PREFIX + name) || '[]'); } catch { return []; } }
function lsWrite(name, arr) { try { localStorage.setItem(LS_PREFIX + name, JSON.stringify(arr)); } catch { /* 隐私模式等，静默 */ } }
function lsGetAll(name) { return lsRead(name); }
function lsGet(name, key) { return lsRead(name).find(r => r && r.id === key) || undefined; }
function lsPut(name, value) { const arr = lsRead(name); const i = arr.findIndex(r => r && r.id === value.id); if (i < 0) arr.push(value); else arr[i] = value; lsWrite(name, arr); return value; }
function lsDel(name, key) { lsWrite(name, lsRead(name).filter(r => !(r && r.id === key))); }
function lsClear(name) { lsWrite(name, []); }
function lsBulk(name, values) { const arr = lsRead(name); values.forEach(v => { const i = arr.findIndex(r => r && r.id === v.id); if (i < 0) arr.push(v); else arr[i] = v; }); lsWrite(name, arr); }

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { mode = 'local'; resolve({ __local: true }); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const stores = {
        tasks: ['byDate', 'byType'],
        completions: [['byTaskDate'], 'byDate'],
        moods: ['byDate'],
        reflections: ['byDate']
      };
      for (const name in stores) {
        if (!db.objectStoreNames.contains(name)) {
          const s = db.createObjectStore(name, { keyPath: 'id' });
          stores[name].forEach(idx => { if (Array.isArray(idx)) s.createIndex(idx[0], idx); else s.createIndex(idx, idx); });
        }
      }
    };
    req.onsuccess = () => { mode = 'idb'; resolve(req.result); };
    req.onerror = () => { mode = 'local'; resolve({ __local: true }); };
  });
  return dbPromise;
}

function getStore(db, name, m) { return db.transaction(name, m).objectStore(name); }
function reqAsync(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(name) { await openDB(); if (mode === 'local') return lsGetAll(name); return reqAsync(getStore(await openDB(), name, 'readonly').getAll()); }
export async function get(name, key) { await openDB(); if (mode === 'local') return lsGet(name, key); return reqAsync(getStore(await openDB(), name, 'readonly').get(key)); }
export async function put(name, value) { await openDB(); if (mode === 'local') return lsPut(name, value); return reqAsync(getStore(await openDB(), name, 'readwrite').put(value)); }
export async function del(name, key) { await openDB(); if (mode === 'local') return lsDel(name, key); return reqAsync(getStore(await openDB(), name, 'readwrite').delete(key)); }
export async function clearStore(name) { await openDB(); if (mode === 'local') return lsClear(name); return reqAsync(getStore(await openDB(), name, 'readwrite').clear()); }
export async function bulkPut(name, values) { await openDB(); if (mode === 'local') return lsBulk(name, values); const db = await openDB(); const t = db.transaction(name, 'readwrite'); const os = t.objectStore(name); values.forEach(v => os.put(v)); return new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); }); }
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

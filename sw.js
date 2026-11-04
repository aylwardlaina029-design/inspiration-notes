// sw.js - 应用壳缓存，离线可用
const CACHE = 'inspire-v4';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css',
  './js/app.js', './js/db.js', './js/store.js', './js/recurring.js', './js/dateutil.js', './js/dom.js',
  './js/views/today.js', './js/views/calendar.js', './js/views/reflections.js', './js/views/settings.js',
  './js/components/quickadd.js', './js/components/mood.js', './js/components/empty.js', './js/components/settingsDrawer.js',
  './js/reminder.js',
  './assets/icons/icon.svg', './assets/icons/icon-maskable.svg',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((self.clients.matchAll({ type: 'window', includeUncontrolled: true })).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(cached => {
    const net = fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => cached);
    return cached || net;
  }));
});

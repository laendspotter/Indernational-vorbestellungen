const CACHE = 'indernational-v160';
const STATIC = [
  '/',
  '/index.html',
  '/truck.html',
  '/kantine.html',
  '/login.html',
  '/register.html',
  '/account.html',
  '/success.html',
  '/loyalty.html',
  '/offline.html',
  '/logo.svg',
  '/supabase-config.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/') || e.request.url.includes('supabase.co') || e.request.url.includes('stripe.com')) return;
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('/offline.html')))
  );
});

const CACHE = 'indernational-v1';
const STATIC = [
  '/',
  '/index.html',
  '/truck.html',
  '/kantine.html',
  '/login.html',
  '/register.html',
  '/account.html',
  '/logo.svg',
  '/supabase-config.js',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap',
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
  // network first for api calls and supabase
  if (e.request.url.includes('/api/') || e.request.url.includes('supabase.co') || e.request.url.includes('stripe.com')) {
    return;
  }
  // cache first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

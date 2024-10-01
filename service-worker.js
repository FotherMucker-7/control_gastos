const CACHE_NAME = 'gastos-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Error caching files:', err);
          // Continue with installation even if some files fail to cache
          return Promise.resolve();
        });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // If both cache and network fail, you might want to show an offline page here
          console.log('Fetch failed; returning offline page instead.');
        });
      })
  );
});
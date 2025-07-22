const CACHE_NAME = 'song-game-v9';
const urlsToCache = [
  '/',
  '/song-game/index.html',
  '/song-game/manifest.json',
  '/song-game/icons/icon-192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url => {
          return fetch(url, { mode: 'no-cors' })
            .then(response => {
              if (!response.ok && response.type !== 'opaque') {
                console.warn(`Failed to cache ${url}: ${response.status}`);
                return null; // Skip failed requests
              }
              return cache.put(url, response);
            })
            .catch(err => {
              console.warn(`Error caching ${url}: ${err.message}`);
              return null; // Skip errors
            });
        })
      ).then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        console.warn(`Fetch failed for ${event.request.url}`);
        return caches.match('/song-game/index.html'); // Fallback to index.html
      });
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
const CACHE_NAME = 'song-game-cache-v1.4.1';
const urlsToCache = [
    '/song-game/',
    '/song-game/index.html',
    '/song-game/manifest.json',
    '/song-game/icons/icon-192.png',
    '/song-game/icons/icon-512.png',
    '/song-game/icons/favicon.ico',
    '/song-game/custom-word-list.md',
    '/song-game/version.txt'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
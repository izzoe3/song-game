const CACHE_NAME = 'song-game-v1';
const urlsToCache = [
    '/song-game/',
    '/song-game/index.html',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Poppins:wght@400;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return cached response
                }
                return fetch(event.request).catch(() => {
                    // Fallback for failed network requests
                    return new Response('Offline: Please connect to the internet.', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
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
        })
    );
});
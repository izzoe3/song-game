const CACHE_NAME = 'song-game-cache-v1.3.0';
const urlsToCache = [
    '/song-game/',
    '/song-game/index.html',
    '/song-game/manifest.json',
    '/song-game/version.txt',
    '/song-game/icons/icon-192.png',
    '/song-game/icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Poppins:wght@400;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching assets');
                return Promise.all(
                    urlsToCache.map(url => {
                        return fetch(url, { mode: 'no-cors' })
                            .then(response => {
                                if (!response.ok && response.type !== 'opaque') {
                                    console.warn(`Failed to cache ${url}: ${response.status}`);
                                    return;
                                }
                                return cache.put(url, response);
                            })
                            .catch(error => {
                                console.warn(`Failed to fetch ${url}: ${error.message}`);
                            });
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
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
    const requestUrl = new URL(event.request.url);
    // Skip caching for unsupported schemes
    if (!requestUrl.protocol.startsWith('http')) {
        console.log(`Skipping cache for ${requestUrl}: Unsupported scheme`);
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log(`Serving from cache: ${event.request.url}`);
                    return response;
                }
                return fetch(event.request)
                    .then(networkResponse => {
                        if (!networkResponse || !networkResponse.ok || networkResponse.type === 'opaque') {
                            console.warn(`Network fetch failed for ${event.request.url}`);
                            return networkResponse;
                        }
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                    })
                    .catch(error => {
                        console.error(`Fetch failed for ${event.request.url}: ${error.message}`);
                        return new Response('Offline: Resource unavailable', { status: 503, statusText: 'Service Unavailable' });
                    });
            })
    );
});
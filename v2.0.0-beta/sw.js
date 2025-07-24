const CACHE_NAME = 'song-game-cache-v2.0.0-beta';
const urlsToCache = [
    './',
    './index.html',
    './index-gauntlet.html',
    './css/styles.css',
    './css/styles-gauntlet.css',
    './js/script.js',
    './js/script-gauntlet.js',
    './manifest.json',
    './version.txt',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/favicon.ico',
    './custom-word-list.md',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Poppins:wght@400;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache.filter(url => url.startsWith('http') || url.startsWith('/')));
            })
            .catch(err => console.error('Cache addAll failed:', err))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const requestUrl = event.request.url;
    if (requestUrl.startsWith('chrome-extension://')) {
        console.log(`Skipping cache for unsupported scheme: ${requestUrl}`);
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    response => {
                        if (!response || response.status !== 200 || response.type !== 'basic' || requestUrl.startsWith('chrome-extension://')) {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(err => console.error('Cache put failed:', err));
                        return response;
                    }
                ).catch(() => {
                    return caches.match('./index.html');
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
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});
// sw.js - Offline Caching Service Worker for QC Toolset Pro

const CACHE_NAME = 'qc-toolset-cache-v1';

// The core files we want to download to the phone immediately
const PRECACHE_ASSETS = [
    './',
    './index.html'
];

// 1. Install Phase: Download the core files
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

// 2. Activate Phase: Clean up any old caches if we update the app
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(clients.claim());
});

// 3. Fetch Phase: The Offline Gatekeeper
self.addEventListener('fetch', (event) => {
    // Ignore external requests that aren't GET (like Google Analytics, etc.)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // A. If the file is in our offline cache, serve it instantly!
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // B. If it's not in the cache, try fetching it from the internet
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    // For opaque responses (like external Google alarm audio and Flaticon images), 
                    // we still want to cache them dynamically.
                    if (networkResponse && networkResponse.type === 'opaque') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }

                // C. Dynamically cache new files (like your sound and icon) so they are ready for next time
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // If the internet is completely dead and it's not in cache, do nothing
                // (The app will just continue running off what it already has)
            });
        })
    );
});

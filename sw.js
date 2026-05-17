// sw.js - Service Worker for QC Toolset Pro (Offline + State Preservation)

// Bumped to v7 to force cache breaking!
const CACHE_NAME = 'qc-toolset-cache-v7';

// Core files to download for offline use
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './alarm.ogg'
];

// 1. Install Phase: Download the core files
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

// 2. Activate Phase: Clean up old caches
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
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    if (networkResponse && networkResponse.type === 'opaque') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Ignore network errors when fully offline
            });
        })
    );
});

// 4. Notification Interaction: Wakes up the EXISTING app to save state
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if ('focus' in client) {
                    return client.focus(); 
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

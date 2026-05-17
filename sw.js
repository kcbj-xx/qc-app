// sw.js - Service Worker for QC Toolset Pro (Network-First Strategy)

// One final name change to flush out the old cache-first rules
const CACHE_NAME = 'qc-toolset-cache-final';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './alarm.ogg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

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

// The Magic Fix: Network-First Strategy
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // 1. ALWAYS try the internet first
        fetch(event.request).then((networkResponse) => {
            // If we successfully get the newest file from GitHub,
            // save a backup copy in the vault for later.
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
            // Show the fresh file to the user
            return networkResponse;
            
        }).catch(() => {
            // 2. The internet failed (Offline mode!)
            // Don't panic, just pull the most recent backup from the vault.
            return caches.match(event.request);
        })
    );
});

// Notification Interaction: Wakes up the EXISTING app to save state
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

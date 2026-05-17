// sw.js - Service Worker for QC Toolset Pro (Network-First Strategy with True Background Alarm)

const CACHE_NAME = 'qc-toolset-cache-final-v14';
let bgAlarmInterval = null;

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

// Network-First Engine logic
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});

// Background Message Router - Wakes up the SW script to loop notifications while screen is off
self.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.action === 'START_BACKGROUND_ALARM') {
        // Clear any old loop just in case
        if (bgAlarmInterval) clearInterval(bgAlarmInterval);

        const sendAlarmNotif = () => {
            self.registration.showNotification("QC ALERT: COLLECT SAMPLES!", {
                body: "Tap to view tools.",
                requireInteraction: true,
                vibrate: [500, 200, 500], // Re-triggers the hardware motor
                icon: "https://cdn-icons-png.flaticon.com/512/1162/1162456.png",
                tag: 'qc-continuous-alarm' // Overwrites card in place instead of spamming
            });
        };

        // Fire instantly, then set background loop inside the Service Worker thread
        sendAlarmNotif();
        bgAlarmInterval = setInterval(sendAlarmNotif, 3000);
    }

    if (event.data.action === 'STOP_BACKGROUND_ALARM') {
        if (bgAlarmInterval) {
            clearInterval(bgAlarmInterval);
            bgAlarmInterval = null;
        }
        
        // Clean up any remaining notification cards from the system shade
        event.waitUntil(
            self.registration.getNotifications({ tag: 'qc-continuous-alarm' }).then((notifications) => {
                notifications.forEach(n => n.close());
            })
        );
    }
});

// Handles background interaction and unlocks notification threads
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // If they tap the notification card, kill the background buzzer loop automatically
    if (bgAlarmInterval) {
        clearInterval(bgAlarmInterval);
        bgAlarmInterval = null;
    }

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

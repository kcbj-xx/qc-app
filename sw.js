// sw.js - Service Worker for QC Toolset Pro

// 1. Install Phase
self.addEventListener('install', (event) => {
    // Forces the waiting service worker to become the active service worker.
    // This ensures you are always running the latest version of your code.
    self.skipWaiting();
});

// 2. Activate Phase
self.addEventListener('activate', (event) => {
    // Tells the active service worker to take control of the page immediately.
    event.waitUntil(clients.claim());
});

// 3. The PWA "Gatekeeper"
// CRITICAL: Chrome strictly requires a fetch listener to exist for the app to be installable.
self.addEventListener('fetch', (event) => {
    // A simple pass-through network fetch ensures the requirement is met.
    event.respondWith(fetch(event.request));
});

// 4. Notification Interaction
// Handles what happens when you tap the "Time to collect samples!" banner
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if the app is already open in a background tab
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // If the app is completely closed, open it fresh
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

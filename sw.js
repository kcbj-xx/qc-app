self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    // Bring the app to the foreground when clicking the notification
    event.waitUntil(
        clients.matchAll({type: 'window'}).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// This handles the background notification
self.addEventListener('push', function(event) {
    const options = {
        body: 'Time to collect samples!',
        vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40],
        requireInteraction: true,
        tag: 'qc-sampling-alarm' // Prevents duplicate notifications
    };
    event.waitUntil(self.registration.showNotification('QC Alert', options));
});

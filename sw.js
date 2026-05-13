self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({type: 'window'}).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // Focus the app if it's already open
                if ('focus' in client) return client.focus();
            }
            // Open the app if it's closed
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});

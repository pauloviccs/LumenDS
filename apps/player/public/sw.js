self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('KILLER SW: Installed');
});

self.addEventListener('activate', (event) => {
    console.log('KILLER SW: Activated - Nuking Caches');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('KILLER SW: Deleting cache', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('KILLER SW: Caches cleared. Unregistering self.');
            return self.registration.unregister();
        }).then(() => {
            return self.clients.claim();
        })
    );
});
